import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFamilyData } from "@/hooks/useFamilyData";
import AppLayout from "@/components/layout/AppLayout";
import FamilyMember from "@/components/FamilyMember";
import CountryTracker from "@/components/CountryTracker";
import CountryWishlist from "@/components/CountryWishlist";
import FamilyMemberDialog from "@/components/FamilyMemberDialog";
import InteractiveWorldMap from "@/components/travel/InteractiveWorldMap";
import QuickStatsDashboard from "@/components/travel/QuickStatsDashboard";
import ContinentProgressRings from "@/components/travel/ContinentProgressRings";
import TravelTimeline from "@/components/travel/TravelTimeline";
import AchievementsGoals from "@/components/travel/AchievementsGoals";
import PhotoGallery from "@/components/travel/PhotoGallery";
import TravelHeatmapCalendar from "@/components/travel/TravelHeatmapCalendar";
import TripSuggestions from "@/components/travel/TripSuggestions";
import TravelDNA from "@/components/travel/TravelDNA";
import TravelStreaks from "@/components/travel/TravelStreaks";
import CountryComparison from "@/components/travel/CountryComparison";
import { Loader2, BarChart3, Globe2, Trophy, Users, Map, Camera, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKey = 'overview' | 'analytics' | 'achievements' | 'countries' | 'family' | 'memories';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Globe2 },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'achievements', label: 'Achievements', icon: Trophy },
  { key: 'countries', label: 'Countries', icon: Map },
  { key: 'memories', label: 'Memories', icon: Camera },
  { key: 'family', label: 'Family', icon: Users },
];

const TravelHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const { familyMembers, countries, wishlist, homeCountry, loading, refetch, totalContinents } = useFamilyData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

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
      <div className="container mx-auto px-4 py-6">
        {/* Quick Stats - Always visible */}
        <QuickStatsDashboard 
          totalCountries={visitedCountriesCount}
          totalContinents={totalContinents}
          familyMembers={familyMembers}
        />

        {/* Tab Navigation */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4 mt-6">
          <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <InteractiveWorldMap countries={countries} wishlist={wishlist} homeCountry={homeCountry} />
              <div className="grid lg:grid-cols-2 gap-6">
                <TravelDNA countries={countries} homeCountryCode={getHomeCountryCode()} />
                <TravelStreaks />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <ContinentProgressRings countries={countries} />
                <CountryComparison countries={countries} />
              </div>
              <TravelHeatmapCalendar />
            </div>
          )}

          {activeTab === 'achievements' && (
            <AchievementsGoals 
              countries={countries} 
              familyMembers={familyMembers}
              totalContinents={totalContinents}
            />
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

          {activeTab === 'family' && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Family Members
                </h2>
                <p className="text-muted-foreground mb-4">
                  Track each family member's travel adventures
                </p>
                <FamilyMemberDialog onSuccess={refetch} />
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {familyMembers.map((member) => (
                  <FamilyMember 
                    key={member.id} 
                    {...member} 
                    countries={countries}
                    onUpdate={refetch} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default TravelHistory;
