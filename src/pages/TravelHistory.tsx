import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
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

import { Loader2, BarChart3, Globe2, Trophy, Map, Camera } from "lucide-react";
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
  const { user, loading: authLoading } = useAuth();
  const { familyMembers, countries, wishlist, homeCountry, loading, refetch, totalContinents } = useFamilyData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

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
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
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

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* Sticky Header with Stats + Navigation */}
        <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-3">
            {/* Compact Stats Row */}
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Travel History
              </h1>
              <div className="flex items-center gap-4 text-sm">
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
        </div>
      </div>
    </AppLayout>
  );
};

export default TravelHistory;
