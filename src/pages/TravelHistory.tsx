import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
import { usePersonalTravelData } from "@/hooks/usePersonalTravelData";
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
import PersonalTravelSummary from "@/components/travel/PersonalTravelSummary";

import { Loader2, BarChart3, Globe2, Trophy, Map, Camera, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = 'overview' | 'analytics' | 'achievements' | 'countries' | 'memories';
type ViewMode = 'family' | 'personal';

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
  const { visitedCountries, totalCountries: personalTotalCountries, continentsVisited: personalContinents, linkedMember, loading: personalLoading } = usePersonalTravelData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  // Default to family view (combined travel history)
  const [viewMode, setViewMode] = useState<ViewMode>('family');

  // Reset scroll to top when tab changes
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const getHomeCountryCode = () => {
    if (!homeCountry) return 'US';
    const countryCodeMap: Record<string, string> = {
      'united states': 'US', 'usa': 'US', 'canada': 'CA', 'united kingdom': 'GB',
      'uk': 'GB', 'australia': 'AU', 'germany': 'DE', 'france': 'FR',
      'italy': 'IT', 'spain': 'ES', 'japan': 'JP', 'china': 'CN',
      'india': 'IN', 'brazil': 'BR', 'mexico': 'MX',
    };
    return countryCodeMap[homeCountry.toLowerCase()] || 'US';
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  if (authLoading || loading || personalLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading travel history...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const visitedCountriesCount = countries.filter(c => c.visitedBy.length > 0).length;

  // Build personal countries data for map
  const personalCountriesForMap = visitedCountries.map(c => ({
    id: c.id,
    name: c.name,
    flag: c.flag,
    continent: c.continent,
    visitedBy: linkedMember ? [linkedMember.name] : [],
  }));

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Sticky Header with Stats + Navigation */}
        <div className="sticky top-16 z-40 bg-background border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-3">
            {/* View Mode Toggle - only show if there are multiple travelers */}
            <div className="flex items-center justify-between mb-3">
              {familyMembers.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('family')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      viewMode === 'family'
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Family Travel History</span>
                    <span className="sm:hidden">Family</span>
                  </button>
                  <button
                    onClick={() => setViewMode('personal')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      viewMode === 'personal'
                        ? "bg-secondary text-secondary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">My Travel</span>
                    <span className="sm:hidden">Me</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground">
                  <User className="h-4 w-4" />
                  <span>My Travel</span>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-sm">
                {viewMode === 'family' ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Globe2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{visitedCountriesCount}</span>
                      <span className="text-muted-foreground hidden sm:inline">countries</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Map className="h-4 w-4 text-secondary" />
                      <span className="font-semibold text-foreground">{totalContinents}</span>
                      <span className="text-muted-foreground hidden sm:inline">continents</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <Globe2 className="h-4 w-4 text-secondary" />
                      <span className="font-semibold text-foreground">{personalTotalCountries}</span>
                      <span className="text-muted-foreground hidden sm:inline">countries</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Map className="h-4 w-4 text-secondary" />
                      <span className="font-semibold text-foreground">{personalContinents}</span>
                      <span className="text-muted-foreground hidden sm:inline">continents</span>
                    </div>
                  </>
                )}
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
                        ? viewMode === 'family' 
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-secondary text-secondary-foreground shadow-md"
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
          {viewMode === 'family' ? (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <HeroSummaryCard countries={countries} familyMembers={familyMembers} totalContinents={totalContinents} />
                  <InteractiveWorldMap countries={countries} wishlist={wishlist} homeCountry={homeCountry} />
                  <TravelMilestones countries={countries} familyMembers={familyMembers} totalContinents={totalContinents} />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <TravelDNA countries={countries} homeCountryCode={getHomeCountryCode()} />
                    <TravelStreaks />
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <AnalyticsInsightCard countries={countries} />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <CountryComparison countries={countries} />
                    <TravelHeatmapCalendar />
                  </div>
                </div>
              )}

              {activeTab === 'achievements' && (
                <div className="space-y-6">
                  <EnhancedAchievements 
                    countries={countries} 
                    familyMembers={familyMembers}
                    totalContinents={totalContinents}
                  />
                  <EnhancedBucketList />
                </div>
              )}

              {activeTab === 'countries' && (
                <div className="space-y-8">
                  <CountryTracker 
                    countries={countries} 
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
                  <TravelTimeline countries={countries} />
                  <PhotoGallery countries={countries} />
                  <TripSuggestions countries={countries} wishlist={wishlist} />
                </div>
              )}
            </>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <PersonalTravelSummary 
                    visitedCountries={visitedCountries}
                    totalCountries={personalTotalCountries}
                    continentsVisited={personalContinents}
                    linkedMember={linkedMember}
                  />
                  <InteractiveWorldMap 
                    countries={personalCountriesForMap} 
                    wishlist={[]} 
                    homeCountry={homeCountry} 
                  />
                  <div className="grid lg:grid-cols-2 gap-6">
                    <TravelDNA countries={personalCountriesForMap} homeCountryCode={getHomeCountryCode()} />
                    <TravelStreaks />
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <AnalyticsInsightCard countries={personalCountriesForMap} />
                  <TravelHeatmapCalendar />
                </div>
              )}

              {activeTab === 'achievements' && (
                <div className="space-y-6">
                  <EnhancedAchievements 
                    countries={personalCountriesForMap} 
                    familyMembers={linkedMember ? [{ 
                      id: linkedMember.id, 
                      name: linkedMember.name, 
                      role: linkedMember.role, 
                      avatar: linkedMember.avatar, 
                      color: linkedMember.color, 
                      countriesVisited: personalTotalCountries 
                    }] : []}
                    totalContinents={personalContinents}
                  />
                  <EnhancedBucketList />
                </div>
              )}

              {activeTab === 'countries' && (
                <div className="space-y-8">
                  {!linkedMember ? (
                    <div className="text-center py-12">
                      <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Profile Linked</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        To see your travel history, complete onboarding or link yourself in profile settings.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {visitedCountries.map(country => (
                        <div key={country.id} className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border">
                          <span className="text-2xl">{country.flag}</span>
                          <div>
                            <p className="font-medium">{country.name}</p>
                            <p className="text-sm text-muted-foreground">{country.continent}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'memories' && (
                <div className="space-y-6">
                  <TravelTimeline countries={personalCountriesForMap} />
                  <PhotoGallery countries={personalCountriesForMap} />
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
