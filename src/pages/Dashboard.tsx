import { useEffect, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useTrips";
import { useFamilyData } from "@/hooks/useFamilyData";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import HeroSummaryCard from "@/components/travel/HeroSummaryCard";
import InteractiveWorldMap from "@/components/travel/InteractiveWorldMap";
import TravelMilestones from "@/components/travel/TravelMilestones";
import { 
  Plus, 
  Plane, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Sparkles,
  Globe,
  Loader2,
  Map,
  Trophy,
  BarChart3,
  PlaneTakeoff,
  Compass
} from "lucide-react";

const Dashboard = () => {
  const { user, profile, loading: authLoading, needsOnboarding } = useAuth();
  const { trips, loading: tripsLoading } = useTrips();
  const { familyMembers, countries, wishlist, homeCountry, loading: familyLoading, totalContinents } = useFamilyData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  // Memoize computed values
  const upcomingTrips = useMemo(() => 
    trips.filter((t) => t.status === "upcoming" || t.status === "planning"),
    [trips]
  );
  
  const activeTrips = useMemo(() => 
    trips.filter((t) => t.status === "active"),
    [trips]
  );
  
  const visitedCountriesCount = useMemo(() => 
    countries.filter(c => c.visitedBy.length > 0).length,
    [countries]
  );

  const formatDate = useCallback((date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, []);

  if (authLoading || tripsLoading || familyLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Traveler"}!
          </h1>
          <p className="text-muted-foreground">
            Track your family's adventures, plan your next trip, and explore new destinations.
          </p>
        </div>

        {/* Hero Summary - Countries Visited Overview */}
        <div className="mb-8">
          <HeroSummaryCard 
            countries={countries} 
            familyMembers={familyMembers} 
            totalContinents={totalContinents} 
          />
        </div>

        {/* Interactive World Map */}
        <div className="mb-8">
          <InteractiveWorldMap 
            countries={countries} 
            wishlist={wishlist} 
            homeCountry={homeCountry} 
          />
        </div>

        {/* Travel Milestones */}
        <div className="mb-8">
          <TravelMilestones 
            countries={countries} 
            familyMembers={familyMembers} 
            totalContinents={totalContinents} 
          />
        </div>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-travel transition-all hover:border-primary/50 group"
              onClick={() => navigate("/family")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Countries</h3>
                  <p className="text-xs text-muted-foreground">Track visits</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-travel transition-all hover:border-primary/50 group"
              onClick={() => navigate("/family?tab=analytics")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Analytics</h3>
                  <p className="text-xs text-muted-foreground">View stats</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-travel transition-all hover:border-primary/50 group"
              onClick={() => navigate("/family?tab=achievements")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Trophy className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Achievements</h3>
                  <p className="text-xs text-muted-foreground">Earn badges</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50 group"
              onClick={() => navigate("/trips/new")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Planner</h3>
                  <p className="text-xs text-muted-foreground">Plan trip</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50 group"
              onClick={() => navigate("/flights")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PlaneTakeoff className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Flights</h3>
                  <p className="text-xs text-muted-foreground">Search flights</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50 group"
              onClick={() => navigate("/explore")}
            >
              <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Compass className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Explore</h3>
                  <p className="text-xs text-muted-foreground">Destinations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Active Trip Alert */}
        {activeTrips.length > 0 && (
          <Card className="mb-8 border-primary bg-primary/5">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Plane className="h-6 w-6 text-primary-foreground animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold">You're traveling!</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTrips[0].title} is in progress
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate(`/trips/${activeTrips[0].id}`)}>
                View Trip
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Trips */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Trips</h2>
            <Link to="/trips" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>

          {upcomingTrips.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Plane className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">No upcoming trips</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                  Start planning your next family adventure with our AI-powered trip planner!
                </p>
                <Button onClick={() => navigate("/trips/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Plan a Trip
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTrips.slice(0, 3).map((trip) => (
                <Card 
                  key={trip.id}
                  className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                >
                  {trip.cover_image && (
                    <div className="h-32 bg-muted">
                      <img 
                        src={trip.cover_image} 
                        alt={trip.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{trip.title}</CardTitle>
                      <Badge variant={trip.status === "planning" ? "secondary" : "default"}>
                        {trip.status}
                      </Badge>
                    </div>
                    {trip.destination && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {trip.destination}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {trip.start_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(trip.start_date)}
                          {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Stats Summary */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Your Travel Stats</h2>
            <Link to="/family?tab=analytics" className="text-sm text-primary hover:underline">
              View detailed analytics
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Globe className="h-8 w-8 text-primary mb-2" />
                <p className="text-3xl font-bold">{visitedCountriesCount}</p>
                <p className="text-sm text-muted-foreground">Countries Visited</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Map className="h-8 w-8 text-secondary mb-2" />
                <p className="text-3xl font-bold">{totalContinents}</p>
                <p className="text-sm text-muted-foreground">Continents</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Plane className="h-8 w-8 text-accent mb-2" />
                <p className="text-3xl font-bold">{trips.length}</p>
                <p className="text-sm text-muted-foreground">Total Trips</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <Trophy className="h-8 w-8 text-primary mb-2" />
                <p className="text-3xl font-bold">{familyMembers.length}</p>
                <p className="text-sm text-muted-foreground">Family Members</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
