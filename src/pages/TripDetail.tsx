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
  Baby, 
  Loader2,
  CloudRain,
  RefreshCw,
  Train,
  Hotel,
  Share2,
  Globe,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TripCollaboratorsDialog from "@/components/trips/TripCollaboratorsDialog";
import { CustomActivityDialog } from "@/components/trips/CustomActivityDialog";
import ActivityBookingCard from "@/components/trips/ActivityBookingCard";
import TrainSegmentCard from "@/components/trips/TrainSegmentCard";
import LodgingSuggestionsCard from "@/components/trips/LodgingSuggestionsCard";
import CountryFlag from "@/components/common/CountryFlag";
import { getEffectiveFlagCode } from "@/lib/countriesData";
import { useTripLegs, type TripLeg } from "@/hooks/useTripLegs";
import { format, parseISO, differenceInDays } from "date-fns";

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
  rating: number | null;
  review_count: number | null;
  booking_url: string | null;
  provider_type: string | null;
  why_it_fits: string | null;
  best_time_to_visit: string | null;
  crowd_level: string | null;
  seasonal_notes: string | null;
  transport_mode: string | null;
  transport_booking_url: string | null;
  transport_station_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_from_previous: number | null;
  distance_unit: string | null;
  travel_time_minutes: number | null;
  recommended_transit_mode: string | null;
  transit_details: string | null;
  is_wheelchair_accessible: boolean | null;
  accessibility_notes: string | null;
  stroller_notes: string | null;
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
  cover_image: string | null;
  has_lodging_booked: boolean | null;
  needs_wheelchair_access: boolean | null;
  has_stroller: boolean | null;
  lodging_address: string | null;
}

interface TrainSegment {
  id: string;
  origin_city: string;
  origin_station: string;
  origin_station_alternatives: string[] | null;
  destination_city: string;
  destination_station: string;
  destination_station_alternatives: string[] | null;
  departure_time: string | null;
  arrival_time: string | null;
  duration_minutes: number | null;
  train_type: string | null;
  booking_url: string | null;
  price_estimate: number | null;
  currency: string | null;
  station_guidance: string | null;
  station_warning: string | null;
  itinerary_day_id: string | null;
}

interface LodgingSuggestion {
  id: string;
  name: string;
  lodging_type: string | null;
  address: string | null;
  description: string | null;
  price_per_night: number | null;
  currency: string | null;
  rating: number | null;
  review_count: number | null;
  booking_url: string | null;
  is_kid_friendly: boolean | null;
  amenities: string[] | null;
  distance_from_center: string | null;
  why_recommended: string | null;
}

const TripDetail = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { fetchLegsForTrip } = useTripLegs();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tripLegs, setTripLegs] = useState<TripLeg[]>([]);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [trainSegments, setTrainSegments] = useState<TrainSegment[]>([]);
  const [lodgingSuggestions, setLodgingSuggestions] = useState<LodgingSuggestion[]>([]);
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

      // Fetch train segments
      const { data: trainData, error: trainError } = await supabase
        .from("trip_train_segments")
        .select("*")
        .eq("trip_id", tripId);

      if (!trainError && trainData) {
        setTrainSegments(trainData);
      }

      // Fetch lodging suggestions
      const { data: lodgingData, error: lodgingError } = await supabase
        .from("trip_lodging_suggestions")
        .select("*")
        .eq("trip_id", tripId);

      if (!lodgingError && lodgingData) {
        setLodgingSuggestions(lodgingData);
      }

      // Fetch trip legs
      const { data: legsData } = await fetchLegsForTrip(tripId!);
      if (legsData) {
        setTripLegs(legsData);
      }
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
        {/* Header with destination image */}
        <div className="mb-8">
          {trip.cover_image && (
            <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-6">
              <img
                src={trip.cover_image}
                alt={trip.destination || trip.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">{trip.title}</h1>
                {trip.destination && (
                  <p className="text-white/90 flex items-center gap-2 mt-1 drop-shadow">
                    <MapPin className="h-4 w-4" />
                    {trip.destination}
                  </p>
                )}
              </div>
            </div>
          )}

          <Button variant="ghost" onClick={() => navigate("/trips")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trips
          </Button>
          
          {!trip.cover_image && (
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
                <TripCollaboratorsDialog tripId={trip.id} tripTitle={trip.title} />
                <Badge variant="secondary" className="capitalize">
                  {trip.status || "planning"}
                </Badge>
              </div>
            </div>
          )}

          {trip.cover_image && (
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              {trip.start_date && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(trip.start_date)}
                  {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                </p>
              )}
              <div className="flex gap-2">
                <TripCollaboratorsDialog tripId={trip.id} tripTitle={trip.title} />
                <Badge variant="secondary" className="capitalize">
                  {trip.status || "planning"}
                </Badge>
              </div>
            </div>
          )}

          {trip.kids_ages && trip.kids_ages.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <Baby className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Kids: {trip.kids_ages.join(", ")} years
              </span>
            </div>
          )}

          {/* Trip Legs / Multi-country itinerary */}
          {tripLegs.length > 1 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Trip Itinerary ({tripLegs.length} countries)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  {tripLegs.map((leg, index) => {
                    const { code } = getEffectiveFlagCode(leg.country_name, "");
                    const legDays = leg.start_date && leg.end_date
                      ? differenceInDays(parseISO(leg.end_date), parseISO(leg.start_date)) + 1
                      : leg.number_of_days;
                    return (
                      <div key={leg.id} className="flex items-center gap-2">
                        {index > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                          {code && (
                            <CountryFlag countryCode={code} countryName={leg.country_name} size="sm" />
                          )}
                          <div>
                            <div className="font-medium text-sm">{leg.country_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {leg.start_date && format(parseISO(leg.start_date), "MMM d")}
                              {leg.end_date && ` – ${format(parseISO(leg.end_date), "MMM d")}`}
                              {legDays > 0 && ` (${legDays}d)`}
                            </div>
                            {leg.cities && leg.cities.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {leg.cities.join(", ")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeDay.startsWith("tab-") ? activeDay : "tab-itinerary"} onValueChange={(val) => {
          if (val.startsWith("tab-")) setActiveDay(val);
        }} className="space-y-6">
          <TabsList className="mb-2">
            <TabsTrigger value="tab-itinerary">Itinerary</TabsTrigger>
            {trainSegments.length > 0 && (
              <TabsTrigger value="tab-transport" className="flex items-center gap-1">
                <Train className="h-4 w-4" />
                Transport
              </TabsTrigger>
            )}
            {lodgingSuggestions.length > 0 && !trip.has_lodging_booked && (
              <TabsTrigger value="tab-lodging" className="flex items-center gap-1">
                <Hotel className="h-4 w-4" />
                Lodging
              </TabsTrigger>
            )}
          </TabsList>

          {/* Itinerary Tab */}
          <TabsContent value="tab-itinerary">
            {days.length > 0 ? (
              <Tabs value={activeDay.startsWith("tab-") ? "1" : activeDay} onValueChange={(val) => setActiveDay(val)}>
                <TabsList className="mb-6 flex-wrap h-auto gap-1">
                  {days.map((day) => (
                    <TabsTrigger key={day.id} value={day.day_number.toString()} className="text-sm">
                      Day {day.day_number}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {days.map((day) => {
                  // Get train segments for this day
                  const dayTrains = trainSegments.filter(t => t.itinerary_day_id === day.id);
                  
                  return (
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
                            <div className="flex gap-2">
                              <CustomActivityDialog 
                                itineraryDayId={day.id} 
                                onActivityAdded={fetchTripData}
                                existingItemsCount={day.itinerary_items?.length || 0}
                              />
                              <Button variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Regenerate Day
                              </Button>
                            </div>
                          </div>

                          {day.weather_notes && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground mt-3">
                              <CloudRain className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {day.weather_notes}
                            </div>
                          )}
                        </CardHeader>
                        
                        <CardContent className="space-y-6">
                          {/* Train segments for this day */}
                          {dayTrains.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="font-semibold flex items-center gap-2">
                                <Train className="h-4 w-4" />
                                Train Journeys Today
                              </h4>
                              {dayTrains.map((train) => (
                                <TrainSegmentCard key={train.id} segment={train} />
                              ))}
                            </div>
                          )}

                          {/* Activities */}
                          <div className="space-y-4">
                            {day.itinerary_items
                              ?.sort((a, b) => a.sort_order - b.sort_order)
                              .map((item, index, sortedItems) => {
                                const previousItem = index > 0 ? sortedItems[index - 1] : null;
                                const previousLocation = previousItem && (previousItem.latitude || previousItem.location_address) ? {
                                  lat: previousItem.latitude ?? 0,
                                  lng: previousItem.longitude ?? 0,
                                  address: previousItem.location_address ?? undefined
                                } : undefined;
                                
                                return (
                                  <div
                                    key={item.id}
                                    className="relative pl-8 pb-6 border-l-2 border-muted last:pb-0 last:border-transparent"
                                  >
                                    {/* Timeline dot */}
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                                    
                                    <ActivityBookingCard 
                                      activity={item} 
                                      hasKids={!!(trip.kids_ages && trip.kids_ages.length > 0)}
                                      needsWheelchairAccess={trip.needs_wheelchair_access || false}
                                      hasStroller={trip.has_stroller || false}
                                      previousLocation={previousLocation}
                                      lodgingLocation={trip.lodging_address ? { lat: 0, lng: 0, address: trip.lodging_address } : undefined}
                                    />
                                  </div>
                                );
                              })}
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
                  );
                })}
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
          </TabsContent>

          {/* Transport Tab */}
          {trainSegments.length > 0 && (
            <TabsContent value="tab-transport">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Train className="h-5 w-5" />
                    Train Journeys
                  </CardTitle>
                  <CardDescription>
                    All train travel for your trip with booking links
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {trainSegments.map((train) => (
                    <TrainSegmentCard key={train.id} segment={train} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Lodging Tab */}
          {lodgingSuggestions.length > 0 && !trip.has_lodging_booked && (
            <TabsContent value="tab-lodging">
              <LodgingSuggestionsCard 
                suggestions={lodgingSuggestions}
                tripTitle={trip.title}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TripDetail;
