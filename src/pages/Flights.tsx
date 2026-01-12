import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { PlaneTakeoff, PlaneLanding, Calendar, Users, Filter, Clock, DollarSign, Car, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AIRLINES = ["American Airlines", "Delta", "United", "Southwest", "JetBlue", "Spirit", "Frontier", "Alaska Airlines"];
const DEPARTURE_TIMES = [
  { value: "early_morning", label: "Early Morning (5-8am)" },
  { value: "morning", label: "Morning (8am-12pm)" },
  { value: "afternoon", label: "Afternoon (12-5pm)" },
  { value: "evening", label: "Evening (5-9pm)" },
  { value: "red_eye", label: "Red Eye (9pm-5am)" },
];

interface FlightSegment {
  departureAirport: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  duration: string;
  stops: number;
}

interface FlightItinerary {
  segments: FlightSegment[];
}

interface FlightResult {
  id: string;
  price: number;
  currency: string;
  itineraries: FlightItinerary[];
}

const Flights = () => {
  const { user, loading: authLoading, needsOnboarding, profile } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [origin, setOrigin] = useState("PBI");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");

  // Preferences
  const [preferNonstop, setPreferNonstop] = useState(false);
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [preferredAirlines, setPreferredAirlines] = useState<string[]>([]);
  const [willingToDriveFurther, setWillingToDriveFurther] = useState(true);
  const [minSavingsForFurtherAirport, setMinSavingsForFurtherAirport] = useState([200]);
  const [maxExtraDriveMinutes, setMaxExtraDriveMinutes] = useState([60]);

  // Search results
  const [searching, setSearching] = useState(false);
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const toggleTime = (time: string) => {
    setPreferredTimes(prev => 
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const toggleAirline = (airline: string) => {
    setPreferredAirlines(prev => 
      prev.includes(airline) ? prev.filter(a => a !== airline) : [...prev, airline]
    );
  };

  const searchFlights = async () => {
    if (!origin || !destination || !departDate) {
      toast.error("Please fill in origin, destination, and departure date");
      return;
    }

    if (tripType === "roundtrip" && !returnDate) {
      toast.error("Please select a return date for round trip");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setFlights([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-flights', {
        body: {
          origin,
          destination,
          departureDate: departDate,
          returnDate: tripType === "roundtrip" ? returnDate : null,
          passengers,
          tripType,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      let results = data.flights || [];

      // Filter by nonstop preference
      if (preferNonstop) {
        results = results.filter((flight: FlightResult) => 
          flight.itineraries?.every(it => it.segments?.every(seg => seg.stops === 0))
        );
      }

      setFlights(results);

      if (results.length === 0) {
        toast.info("No flights found for your search criteria");
      } else {
        toast.success(`Found ${results.length} flight options`);
      }
    } catch (error: any) {
      console.error('Flight search error:', error);
      setSearchError(error.message || "Failed to search flights");
      toast.error("Failed to search flights");
    } finally {
      setSearching(false);
    }
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "";
    const date = new Date(dateTime);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Find Flights</h1>
          <p className="text-muted-foreground">Search for the best flights based on your preferences</p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlaneTakeoff className="h-5 w-5 text-primary" />
              Flight Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button 
                variant={tripType === "roundtrip" ? "default" : "outline"} 
                size="sm"
                onClick={() => setTripType("roundtrip")}
              >
                Round Trip
              </Button>
              <Button 
                variant={tripType === "oneway" ? "default" : "outline"} 
                size="sm"
                onClick={() => setTripType("oneway")}
              >
                One Way
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="origin">From</Label>
                <div className="relative">
                  <PlaneTakeoff className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="origin" placeholder="Airport code (e.g., PBI)" className="pl-10" value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} />
                </div>
              </div>
              <div>
                <Label htmlFor="destination">To</Label>
                <div className="relative">
                  <PlaneLanding className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="destination" placeholder="Airport code (e.g., LAX)" className="pl-10" value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} />
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="depart">Depart</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="depart" type="date" className="pl-10" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
                </div>
              </div>
              {tripType === "roundtrip" && (
                <div>
                  <Label htmlFor="return">Return</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="return" type="date" className="pl-10" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                  </div>
                </div>
              )}
              <div>
                <Label htmlFor="passengers">Passengers</Label>
                <Select value={String(passengers)} onValueChange={(v) => setPassengers(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'passenger' : 'passengers'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={searchFlights} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlaneTakeoff className="h-4 w-4 mr-2" />
              )}
              {searching ? "Searching..." : "Search Flights"}
            </Button>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p>{searchError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {flights.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Flight Results ({flights.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {flights.map((flight) => (
                <div key={flight.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-primary">
                      ${flight.price?.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{flight.currency}</span>
                    </span>
                    <Button size="sm">Select</Button>
                  </div>
                  {flight.itineraries?.map((itinerary, idx) => (
                    <div key={idx} className="space-y-2">
                      {idx > 0 && <div className="border-t my-2 pt-2 text-xs text-muted-foreground">Return Flight</div>}
                      {itinerary.segments?.map((segment, segIdx) => (
                        <div key={segIdx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{segment.airline}</Badge>
                            <span className="font-mono text-xs">{segment.flightNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="font-medium">{formatTime(segment.departureTime)}</div>
                              <div className="text-xs text-muted-foreground">{segment.departureAirport}</div>
                            </div>
                            <PlaneTakeoff className="h-4 w-4 text-muted-foreground" />
                            <div className="text-center px-2">
                              <div className="text-xs text-muted-foreground">{segment.duration || '—'}</div>
                              <div className="border-t w-12"></div>
                              <div className="text-xs">{segment.stops === 0 ? 'Nonstop' : `${segment.stops} stop${segment.stops > 1 ? 's' : ''}`}</div>
                            </div>
                            <PlaneLanding className="h-4 w-4 text-muted-foreground" />
                            <div className="text-left">
                              <div className="font-medium">{formatTime(segment.arrivalTime)}</div>
                              <div className="text-xs text-muted-foreground">{segment.arrivalAirport}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-secondary" />
              Your Preferences
            </CardTitle>
            <CardDescription>Customize your search based on your travel style</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Prefer Non-stop Flights</Label>
              </div>
              <Switch checked={preferNonstop} onCheckedChange={setPreferNonstop} />
            </div>

            <div>
              <Label className="mb-2 block">Preferred Departure Times</Label>
              <div className="flex flex-wrap gap-2">
                {DEPARTURE_TIMES.map(time => (
                  <Badge 
                    key={time.value}
                    variant={preferredTimes.includes(time.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTime(time.value)}
                  >
                    {time.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Preferred Airlines</Label>
              <div className="flex flex-wrap gap-2">
                {AIRLINES.map(airline => (
                  <Badge 
                    key={airline}
                    variant={preferredAirlines.includes(airline) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAirline(airline)}
                  >
                    {airline}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <Label>Willing to drive to a further airport for savings</Label>
                </div>
                <Switch checked={willingToDriveFurther} onCheckedChange={setWillingToDriveFurther} />
              </div>

              {willingToDriveFurther && (
                <div className="space-y-4 pl-6 border-l-2 border-secondary/30">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Max extra drive time</span>
                      <span className="font-medium">{maxExtraDriveMinutes[0]} minutes</span>
                    </div>
                    <Slider value={maxExtraDriveMinutes} onValueChange={setMaxExtraDriveMinutes} min={15} max={120} step={15} />
                    <p className="text-xs text-muted-foreground mt-1">e.g., PBI is 20 min, MIA is 1 hour away</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Minimum savings to justify further airport</span>
                      <span className="font-medium">${minSavingsForFurtherAirport[0]}</span>
                    </div>
                    <Slider value={minSavingsForFurtherAirport} onValueChange={setMinSavingsForFurtherAirport} min={50} max={1000} step={50} />
                    <p className="text-xs text-muted-foreground mt-1">Show further airports only if they save at least this amount</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Flights;
