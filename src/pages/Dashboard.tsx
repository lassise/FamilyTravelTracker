import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useTrips";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Plane, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Sparkles,
  Globe,
  Loader2
} from "lucide-react";

const Dashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { trips, loading: tripsLoading } = useTrips();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || tripsLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const upcomingTrips = trips.filter((t) => t.status === "upcoming" || t.status === "planning");
  const activeTrips = trips.filter((t) => t.status === "active");
  const completedTrips = trips.filter((t) => t.status === "completed");

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name?.split(" ")[0] || "Traveler"}!
          </h1>
          <p className="text-muted-foreground">
            Plan your next family adventure or check on your upcoming trips.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:shadow-travel transition-all hover:border-primary/50 group"
            onClick={() => navigate("/trips/new")}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">AI Trip Planner</h3>
                <p className="text-sm text-muted-foreground">Generate a custom itinerary</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => navigate("/trips/new?mode=manual")}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Create Trip</h3>
                <p className="text-sm text-muted-foreground">Start from scratch</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
            onClick={() => navigate("/travel-history")}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Travel History</h3>
                <p className="text-sm text-muted-foreground">View countries visited</p>
              </div>
            </CardContent>
          </Card>
        </div>

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

        {/* Past Trips */}
        {completedTrips.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Past Adventures</h2>
              <Link to="/trips?status=completed" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {completedTrips.slice(0, 4).map((trip) => (
                <Card 
                  key={trip.id}
                  className="cursor-pointer hover:shadow-md transition-shadow opacity-80 hover:opacity-100"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{trip.title}</CardTitle>
                    {trip.destination && (
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <MapPin className="h-3 w-3" />
                        {trip.destination}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
