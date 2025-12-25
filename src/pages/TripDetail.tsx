import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  DollarSign, 
  Baby, 
  Loader2,
  CloudRain,
  Utensils,
  Navigation,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingCart
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ItineraryItem {
  id: string;
  sort_order: number;
  time_slot: string | null;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  location_address: string | null;
  category: string | null;
  duration_minutes: number | null;
  cost_estimate: number | null;
  is_kid_friendly: boolean | null;
  is_stroller_friendly: boolean | null;
  requires_reservation: boolean | null;
  reservation_info: string | null;
}

interface ItineraryDay {
  id: string;
  day_number: number;
  date: string | null;
  title: string | null;
  notes: string | null;
  weather_notes: string | null;
  plan_b: string | null;
  itinerary_items: ItineraryItem[];
}

interface Trip {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  kids_ages: number[] | null;
  interests: string[] | null;
  pace_preference: string | null;
  notes: string | null;
}

const TripDetail = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string>("1");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (tripId && user) {
      fetchTripData();
    }
  }, [tripId, user]);

  const fetchTripData = async () => {
    try {
      // Fetch trip details
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // Fetch itinerary days with items
      const { data: daysData, error: daysError } = await supabase
        .from("itinerary_days")
        .select(`
          *,
          itinerary_items (*)
        `)
        .eq("trip_id", tripId)
        .order("day_number");

      if (daysError) throw daysError;
      setDays(daysData || []);
    } catch (error: any) {
      console.error("Error fetching trip:", error);
      toast.error("Failed to load trip");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case "attraction":
        return "bg-blue-500/10 text-blue-600";
      case "restaurant":
        return "bg-orange-500/10 text-orange-600";
      case "outdoor":
        return "bg-green-500/10 text-green-600";
      case "museum":
        return "bg-purple-500/10 text-purple-600";
      case "entertainment":
        return "bg-pink-500/10 text-pink-600";
      case "transport":
        return "bg-gray-500/10 text-gray-600";
      case "rest":
        return "bg-yellow-500/10 text-yellow-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!trip) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Trip not found</h1>
          <Button onClick={() => navigate("/trips")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trips
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/trips")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trips
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{trip.title}</h1>
              {trip.destination && (
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {trip.destination}
                </p>
              )}
              {trip.start_date && (
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(trip.start_date)}
                  {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">
                {trip.status || "planning"}
              </Badge>
            </div>
          </div>

          {trip.kids_ages && trip.kids_ages.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Baby className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Kids: {trip.kids_ages.join(", ")} years
              </span>
            </div>
          )}
        </div>

        {/* Itinerary Tabs */}
        {days.length > 0 ? (
          <Tabs value={activeDay} onValueChange={setActiveDay}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              {days.map((day) => (
                <TabsTrigger key={day.id} value={day.day_number.toString()} className="text-sm">
                  Day {day.day_number}
                </TabsTrigger>
              ))}
            </TabsList>

            {days.map((day) => (
              <TabsContent key={day.id} value={day.day_number.toString()}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-xl">
                          Day {day.day_number}: {day.title || "Explore"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(day.date)}
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate Day
                      </Button>
                    </div>

                    {day.weather_notes && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mt-3">
                        <CloudRain className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {day.weather_notes}
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Activities */}
                    <div className="space-y-4">
                      {day.itinerary_items
                        ?.sort((a, b) => a.sort_order - b.sort_order)
                        .map((item, index) => (
                          <div
                            key={item.id}
                            className="relative pl-8 pb-6 border-l-2 border-muted last:pb-0 last:border-transparent"
                          >
                            {/* Timeline dot */}
                            <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                            
                            <div className="bg-muted/30 rounded-lg p-4">
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  {item.start_time && (
                                    <Badge variant="outline" className="text-xs">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatTime(item.start_time)}
                                      {item.end_time && ` - ${formatTime(item.end_time)}`}
                                    </Badge>
                                  )}
                                  <Badge className={getCategoryColor(item.category)}>
                                    {item.category || "activity"}
                                  </Badge>
                                </div>
                                <div className="flex gap-1">
                                  {item.is_kid_friendly && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Baby className="h-3 w-3 mr-1" />
                                      Kid-friendly
                                    </Badge>
                                  )}
                                  {item.is_stroller_friendly && (
                                    <Badge variant="secondary" className="text-xs">
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Stroller OK
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <h4 className="font-semibold text-lg">{item.title}</h4>
                              
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}

                              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                                {item.location_name && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    {item.location_name}
                                  </div>
                                )}
                                {item.duration_minutes && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    {item.duration_minutes} min
                                  </div>
                                )}
                                {item.cost_estimate !== null && item.cost_estimate > 0 && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <DollarSign className="h-4 w-4" />
                                    ~${item.cost_estimate}
                                  </div>
                                )}
                              </div>

                              {item.requires_reservation && (
                                <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-500/10 rounded-md">
                                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                  <div className="text-sm">
                                    <span className="font-medium text-yellow-600">Reservation required</span>
                                    {item.reservation_info && (
                                      <p className="text-muted-foreground">{item.reservation_info}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {item.location_address && (
                                <Button variant="link" size="sm" className="p-0 h-auto mt-2">
                                  <Navigation className="h-3 w-3 mr-1" />
                                  Get directions
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Plan B */}
                    {day.plan_b && (
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="font-semibold flex items-center gap-2 text-blue-600">
                          <CloudRain className="h-4 w-4" />
                          Plan B (Rain or Tired Kids)
                        </h4>
                        <p className="text-sm mt-2">{day.plan_b}</p>
                      </div>
                    )}

                    {/* Notes */}
                    {day.notes && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="font-semibold mb-2">Tips for Today</h4>
                        <p className="text-sm text-muted-foreground">{day.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No itinerary yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This trip doesn't have an itinerary. Generate one to get started!
              </p>
              <Button>Generate Itinerary</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default TripDetail;
