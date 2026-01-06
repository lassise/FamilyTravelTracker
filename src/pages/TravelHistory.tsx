import { useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TravelHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const { familyMembers, countries, wishlist, homeCountry, loading, refetch, totalContinents } = useFamilyData();
  const navigate = useNavigate();

  // Extract home country code from homeCountry name
  const getHomeCountryCode = () => {
    if (!homeCountry) return 'US';
    // Simple mapping for common countries
    const countryCodeMap: Record<string, string> = {
      'united states': 'US',
      'usa': 'US',
      'canada': 'CA',
      'united kingdom': 'GB',
      'uk': 'GB',
      'australia': 'AU',
      'germany': 'DE',
      'france': 'FR',
      'italy': 'IT',
      'spain': 'ES',
      'japan': 'JP',
      'china': 'CN',
      'india': 'IN',
      'brazil': 'BR',
      'mexico': 'MX',
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

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats Dashboard - Hero Section */}
        <QuickStatsDashboard 
          totalCountries={countries.filter(c => c.visitedBy.length > 0).length}
          totalContinents={totalContinents}
          familyMembers={familyMembers}
        />

        {/* Interactive World Map */}
        <div className="mb-8">
          <InteractiveWorldMap countries={countries} wishlist={wishlist} homeCountry={homeCountry} />
        </div>

        {/* Travel DNA and Streaks - New insights row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <TravelDNA 
            countries={countries} 
            homeCountryCode={getHomeCountryCode()}
          />
          <TravelStreaks />
        </div>

        {/* Progress and Insights Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <ContinentProgressRings countries={countries} />
          <CountryComparison countries={countries} />
        </div>

        {/* Heatmap Calendar */}
        <div className="mb-8">
          <TravelHeatmapCalendar />
        </div>

        {/* Achievements and Goals */}
        <div className="mb-8">
          <AchievementsGoals 
            countries={countries} 
            familyMembers={familyMembers}
            totalContinents={totalContinents}
          />
        </div>

        {/* Tabs for Timeline, Photos, and Suggestions */}
        <Tabs defaultValue="timeline" className="mb-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="suggestions">Next Trip</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-6">
            <TravelTimeline countries={countries} />
          </TabsContent>
          <TabsContent value="photos" className="mt-6">
            <PhotoGallery countries={countries} />
          </TabsContent>
          <TabsContent value="suggestions" className="mt-6">
            <TripSuggestions countries={countries} wishlist={wishlist} />
          </TabsContent>
        </Tabs>

        {/* Country Tracker */}
        <CountryTracker 
          countries={countries} 
          familyMembers={familyMembers}
          onUpdate={refetch}
        />

        {/* Wishlist Section */}
        <section className="py-12">
          <CountryWishlist 
            countries={countries}
            wishlist={wishlist}
            onUpdate={refetch}
          />
        </section>
        
        {/* Family Members Section */}
        <section className="py-12">
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
        </section>
      </div>
    </AppLayout>
  );
};

export default TravelHistory;
