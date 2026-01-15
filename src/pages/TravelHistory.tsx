import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData, Country } from "@/hooks/useFamilyData";
import { useStateVisits } from "@/hooks/useStateVisits";
import { useHomeCountry } from "@/hooks/useHomeCountry";
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
import FamilyMemberFilter from "@/components/travel/FamilyMemberFilter";

import { Loader2, BarChart3, Globe2, Trophy, Map, Camera, Users, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = 'overview' | 'analytics' | 'achievements' | 'countries' | 'memories';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Globe2 },
  { key: 'countries', label: 'Countries', icon: Map },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'achievements', label: 'Achievements', icon: Trophy },
  { key: 'memories', label: 'Memories', icon: Camera },
];

const TravelHistory = () => {
  const { user, loading: authLoading, needsOnboarding, profile } = useAuth();
  const { familyMembers, countries, wishlist, homeCountry, loading, refetch, totalContinents } = useFamilyData();
  const { getStateVisitCount } = useStateVisits();
  const resolvedHome = useHomeCountry(homeCountry);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read initial tab from URL or default to 'overview'
  const tabFromUrl = searchParams.get('tab') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(
    tabFromUrl && tabs.some(t => t.key === tabFromUrl) ? tabFromUrl : 'overview'
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Reset scroll to top when tab changes and update URL
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  // Initialize selected members to all when family data loads
  useEffect(() => {
    if (familyMembers.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(familyMembers.map(m => m.id));
    }
  }, [familyMembers, selectedMembers.length]);

  // Filter countries based on selected family members
  const filteredCountries = useMemo(() => {
    if (selectedMembers.length === 0) return countries;
    
    const selectedMemberNames = familyMembers
      .filter(m => selectedMembers.includes(m.id))
      .map(m => m.name);
    
    return countries.map(country => ({
      ...country,
      visitedBy: country.visitedBy.filter(name => selectedMemberNames.includes(name))
    }));
  }, [countries, selectedMembers, familyMembers]);

  // Get filtered family members
  const filteredFamilyMembers = useMemo(() => {
    if (selectedMembers.length === 0) return familyMembers;
    return familyMembers.filter(m => selectedMembers.includes(m.id));
  }, [familyMembers, selectedMembers]);

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

  // Calculate filtered continents
  const filteredContinents = new Set(
    filteredCountries.filter(c => c.visitedBy.length > 0).map(c => c.continent)
  ).size;

  // Get states visited count for home country
  const statesVisitedCount = useMemo(() => {
    if (!resolvedHome.iso2 || !resolvedHome.hasStateTracking) return 0;
    return getStateVisitCount(resolvedHome.iso2);
  }, [resolvedHome, getStateVisitCount]);

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
                  <Map className="h-4 w-4 text-secondary" />
                  <span className="font-semibold text-foreground">{filteredContinents}</span>
                  <span className="text-muted-foreground hidden sm:inline">continents</span>
                </div>
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
          {/* Family Member Filter */}
          {!loading && familyMembers.length > 1 && (
            <div className="mb-6">
              <FamilyMemberFilter
                familyMembers={familyMembers}
                selectedMembers={selectedMembers}
                onSelectionChange={setSelectedMembers}
              />
            </div>
          )}

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
                  <HeroSummaryCard countries={filteredCountries} familyMembers={filteredFamilyMembers} totalContinents={filteredContinents} homeCountry={homeCountry} />
                  <InteractiveWorldMap countries={filteredCountries} wishlist={wishlist} homeCountry={homeCountry} onRefetch={refetch} />
                  <TravelMilestones countries={filteredCountries} familyMembers={filteredFamilyMembers} totalContinents={filteredContinents} />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <TravelDNA countries={filteredCountries} homeCountryCode={resolvedHome.iso2 || 'US'} />
                    <TravelStreaks />
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <AnalyticsInsightCard countries={filteredCountries} />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <CountryComparison countries={filteredCountries} />
                    <TravelHeatmapCalendar />
                  </div>
                </div>
              )}

              {activeTab === 'achievements' && (
                <div className="space-y-6">
                  <EnhancedAchievements 
                    countries={filteredCountries} 
                    familyMembers={filteredFamilyMembers}
                    totalContinents={filteredContinents}
                  />
                  <EnhancedBucketList />
                </div>
              )}

              {activeTab === 'countries' && (
                <div className="space-y-8">
                  <CountryTracker 
                    countries={countries.filter(c => c.visitedBy.length > 0)} 
                    familyMembers={familyMembers}
                    onUpdate={refetch}
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
    </AppLayout>
  );
};

export default TravelHistory;