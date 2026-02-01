import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
import { useStateVisits } from "@/hooks/useStateVisits";
import { useHomeCountry } from "@/hooks/useHomeCountry";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/layout/AppLayout";
import CountryTracker from "@/components/CountryTracker";
import CountryWishlist from "@/components/CountryWishlist";
import InteractiveWorldMap from "@/components/travel/InteractiveWorldMap";
import HeroSummaryCard from "@/components/travel/HeroSummaryCard";
import AnalyticsInsightCard from "@/components/travel/AnalyticsInsightCard";
import TravelTimeline from "@/components/travel/TravelTimeline";
import EnhancedAchievements from "@/components/travel/EnhancedAchievements";
import PhotoGallery from "@/components/travel/PhotoGallery";
import TravelHeatmapCalendar from "@/components/travel/TravelHeatmapCalendar";
import TripSuggestions from "@/components/travel/TripSuggestions";
import TravelDNA from "@/components/travel/TravelDNA";
import TravelStreaks from "@/components/travel/TravelStreaks";
import CountryComparison from "@/components/travel/CountryComparison";
import EnhancedBucketList from "@/components/travel/EnhancedBucketList";
import TravelMilestones from "@/components/travel/TravelMilestones";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, Globe2, Trophy, Map as MapIcon, Camera, Users, MapPin, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareDialog, ShareOption } from "@/components/sharing/ShareDialog";
import { generateShareToken } from "@/lib/share-tokens";

type TabKey = 'overview' | 'countries' | 'memories';

// For the main Travel Tracker experience, we only surface Countries + Memories as tabs.
// The internal "overview" tab remains available for other flows that deep-link to it.
const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'countries', label: 'Countries', icon: MapIcon },
  { key: 'memories', label: 'Memories', icon: Camera },
];

const TravelHistory = () => {
  const { user, loading: authLoading, needsOnboarding, profile } = useAuth();
  const { familyMembers, countries, wishlist, homeCountry, loading, refetch, totalContinents } = useFamilyData();
  const { visitDetails } = useVisitDetails();
  const { getStateVisitCount } = useStateVisits();
  const resolvedHome = useHomeCountry(homeCountry);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visitMemberMap, setVisitMemberMap] = useState<globalThis.Map<string, string[]>>(() => new globalThis.Map());
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Read tab from URL or default to 'countries' for the Travel Tracker tab
  const tabFromUrl = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey = tabFromUrl && tabs.some(t => t.key === tabFromUrl) ? tabFromUrl : 'countries';

  // Use the dashboard filter hook
  const {
    selectedMemberId,
    setSelectedMemberId,
    getFilteredCountries,
    getFilteredContinents,
    getFilteredEarliestYear,
  } = useDashboardFilter(familyMembers);

  // Fetch visit-member mappings for "Since" calculation
  useEffect(() => {
    const fetchVisitMembers = async () => {
      const { data } = await supabase
        .from('visit_family_members')
        .select('visit_id, family_member_id');
      
      if (data) {
        const map = new globalThis.Map<string, string[]>();
        data.forEach(item => {
          const existing = map.get(item.visit_id) || [];
          existing.push(item.family_member_id);
          map.set(item.visit_id, existing);
        });
        setVisitMemberMap(map);
      }
    };
    fetchVisitMembers();
  }, []);

  // Handle tab changes by updating URL
  const handleTabChange = useCallback((tab: TabKey) => {
    setSearchParams(tab === 'overview' ? {} : { tab });
    // For countries tab, scroll to the countries section after a short delay
    if (tab === 'countries') {
      setTimeout(() => {
        const countriesSection = document.getElementById('countries-explored');
        if (countriesSection) {
          countriesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [setSearchParams]);

  // On initial load with countries tab, scroll to section
  useEffect(() => {
    if (activeTab === 'countries' && !loading) {
      setTimeout(() => {
        const countriesSection = document.getElementById('countries-explored');
        if (countriesSection) {
          countriesSection.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 100);
    }
  }, [activeTab, loading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  // Filter countries based on selected family member
  const filteredCountries = useMemo(() => 
    getFilteredCountries(countries),
    [countries, getFilteredCountries]
  );

  // Get filtered family members (for display purposes)
  const filteredFamilyMembers = useMemo(() => {
    if (selectedMemberId === null) return familyMembers;
    return familyMembers.filter(m => m.id === selectedMemberId);
  }, [familyMembers, selectedMemberId]);

  // Calculate filtered continents
  const filteredContinents = useMemo(() => 
    getFilteredContinents(countries),
    [countries, getFilteredContinents]
  );

  // Calculate filtered earliest year
  const filteredEarliestYear = useMemo(() => 
    getFilteredEarliestYear(visitDetails, visitMemberMap),
    [visitDetails, visitMemberMap, getFilteredEarliestYear]
  );

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Count visited countries excluding home country (based on filtered data)
  const visitedCountriesCount = filteredCountries.filter(c => 
    c.visitedBy.length > 0 && !resolvedHome.isHomeCountry(c.name)
  ).length;

  // Get states visited count for home country
  const statesVisitedCount = resolvedHome.iso2 && resolvedHome.hasStateTracking 
    ? getStateVisitCount(resolvedHome.iso2) 
    : 0;

  const dashboardShareOptions: ShareOption[] = [
    {
      id: 'countries',
      label: 'Include countries visited',
      description: 'Show list of countries you\'ve traveled to',
      defaultChecked: true,
    },
    {
      id: 'stats',
      label: 'Include travel statistics',
      description: 'Show countries count, continents, and progress',
      defaultChecked: true,
    },
    {
      id: 'states',
      label: 'Include states/provinces',
      description: 'Show visited states or provinces in your home country',
      defaultChecked: resolvedHome.hasStateTracking,
    },
    {
      id: 'timeline',
      label: 'Include travel timeline',
      description: 'Show when you started traveling',
      defaultChecked: false,
    },
  ];

  const handleGenerateDashboardLink = async (selectedOptions: string[]): Promise<string> => {
    if (!user) {
      throw new Error('You must be logged in to generate a share link');
    }
    return await generateShareToken({
      userId: user.id,
      shareType: 'dashboard',
      includedFields: selectedOptions,
    });
  };

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Sticky Header with Stats + Navigation */}
        <div className="sticky top-16 z-40 bg-background border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-3">
            {/* Header with title and stats */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Family Travel Tracker</span>
                <span className="sm:hidden">Travel</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Globe2 className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-foreground">{visitedCountriesCount}</span>
                    <span className="text-muted-foreground hidden sm:inline">countries</span>
                  </div>
                  {resolvedHome.hasStateTracking && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-foreground">{statesVisitedCount}/50</span>
                      <span className="text-muted-foreground hidden sm:inline">states</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapIcon className="h-4 w-4 text-secondary" />
                    <span className="font-semibold text-foreground">{filteredContinents}</span>
                    <span className="text-muted-foreground hidden sm:inline">continents</span>
                  </div>
                </div>

                {/* Share button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 hidden sm:inline-flex"
                  onClick={() => {
                    if (!user) {
                      navigate("/auth");
                      return;
                    }
                    setShowShareDialog(true);
                  }}
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
                {/* Compact icon-only share button for mobile */}
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden ml-2"
                  onClick={() => {
                    if (!user) {
                      navigate("/auth");
                      return;
                    }
                    setShowShareDialog(true);
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide -mb-4 pb-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                      activeTab === tab.key
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Show loading skeleton when data is loading */}
          {loading ? (
            <div className="space-y-6">
              <div className="h-48 bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Loading travel data...</p>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
                <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <HeroSummaryCard 
                    countries={filteredCountries} 
                    familyMembers={filteredFamilyMembers} 
                    totalContinents={filteredContinents} 
                    homeCountry={homeCountry}
                    earliestYear={filteredEarliestYear}
                  />
                  <InteractiveWorldMap countries={filteredCountries} wishlist={wishlist} homeCountry={homeCountry} onRefetch={refetch} />
                  
                  {/* Analytics & Achievements combined section */}
                  <div className="space-y-6">
                    <AnalyticsInsightCard countries={filteredCountries} />
                    <EnhancedAchievements 
                      countries={filteredCountries} 
                      familyMembers={filteredFamilyMembers}
                      totalContinents={filteredContinents}
                    />
                  </div>
                  
                  <TravelMilestones countries={filteredCountries} familyMembers={filteredFamilyMembers} totalContinents={filteredContinents} />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <TravelDNA countries={filteredCountries} homeCountryCode={resolvedHome.iso2 || 'US'} />
                    <TravelStreaks />
                  </div>
                  <div className="grid lg:grid-cols-2 gap-6">
                    <CountryComparison countries={filteredCountries} />
                    <TravelHeatmapCalendar />
                  </div>
                  <EnhancedBucketList />
                </div>
              )}

              {activeTab === 'countries' && (
                <div className="space-y-8">
                  <CountryTracker 
                    countries={filteredCountries.filter(c => c.visitedBy.length > 0)} 
                    familyMembers={familyMembers}
                    onUpdate={refetch}
                    selectedMemberId={selectedMemberId}
                    onMemberChange={setSelectedMemberId}
                    homeCountry={homeCountry}
                  />
                  <CountryWishlist 
                    countries={countries}
                    wishlist={wishlist}
                    onUpdate={refetch}
                  />
                </div>
              )}

              {activeTab === 'memories' && (
                <div className="space-y-6">
                  <TravelTimeline countries={filteredCountries} />
                  <PhotoGallery countries={filteredCountries} />
                  <TripSuggestions countries={filteredCountries} wishlist={wishlist} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        title="Share My Travel History"
        description="Create a shareable link to your travel dashboard"
        shareType="dashboard"
        options={dashboardShareOptions}
        onGenerateLink={handleGenerateDashboardLink}
      />
    </AppLayout>
  );
};

export default TravelHistory;
