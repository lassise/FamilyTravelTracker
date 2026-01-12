import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFlightPreferences } from "@/hooks/useFlightPreferences";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  PlaneTakeoff, PlaneLanding, Calendar, Users, Filter, Clock, DollarSign, Car, 
  Loader2, AlertCircle, Star, Zap, Heart, Baby, ChevronDown, AlertTriangle,
  TrendingUp, Shield, Armchair, Luggage, CreditCard
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { scoreFlights, categorizeFlights, type ScoredFlight, type FlightResult } from "@/lib/flightScoring";
import { searchAirports, AIRLINES, ALLIANCES, type Airport } from "@/lib/airportsData";

const DEPARTURE_TIMES = [
  { value: "early_morning", label: "Early (5-8am)" },
  { value: "morning", label: "Morning (8am-12pm)" },
  { value: "afternoon", label: "Afternoon (12-5pm)" },
  { value: "evening", label: "Evening (5-9pm)" },
  { value: "red_eye", label: "Red Eye (9pm-5am)" },
];

const CABIN_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

const Flights = () => {
  const { user, loading: authLoading, needsOnboarding, profile } = useAuth();
  const { preferences, updatePreferences, loading: prefsLoading } = useFlightPreferences();
  const navigate = useNavigate();

  // Search state
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [tripType, setTripType] = useState<"roundtrip" | "oneway" | "multicity">("roundtrip");
  const [flexibleDates, setFlexibleDates] = useState(false);

  // Airport search
  const [originResults, setOriginResults] = useState<Airport[]>([]);
  const [destResults, setDestResults] = useState<Airport[]>([]);
  const [showOriginResults, setShowOriginResults] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);

  // Search results
  const [searching, setSearching] = useState(false);
  const [flights, setFlights] = useState<ScoredFlight[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ReturnType<typeof categorizeFlights> | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  // Set origin from home airport preference
  useEffect(() => {
    if (!prefsLoading && preferences.home_airports.length > 0 && !origin) {
      const primary = preferences.home_airports.find(a => a.isPrimary);
      if (primary) setOrigin(primary.code);
    }
  }, [preferences.home_airports, prefsLoading, origin]);

  const handleOriginSearch = (value: string) => {
    setOrigin(value.toUpperCase());
    if (value.length >= 2) {
      setOriginResults(searchAirports(value));
      setShowOriginResults(true);
    } else {
      setShowOriginResults(false);
    }
  };

  const handleDestSearch = (value: string) => {
    setDestination(value.toUpperCase());
    if (value.length >= 2) {
      setDestResults(searchAirports(value));
      setShowDestResults(true);
    } else {
      setShowDestResults(false);
    }
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
    setCategories(null);

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

      const rawFlights: FlightResult[] = data.flights || [];
      
      // Score and categorize flights
      const scored = scoreFlights(rawFlights, preferences);
      setFlights(scored);
      setCategories(categorizeFlights(scored));

      if (scored.length === 0) {
        toast.info("No flights found for your search criteria");
      } else {
        toast.success(`Found ${scored.length} flight options`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to search flights";
      console.error('Flight search error:', error);
      setSearchError(errorMessage);
      toast.error("Failed to search flights");
    } finally {
      setSearching(false);
    }
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const togglePreference = (key: keyof typeof preferences, value: string, isArray: boolean = true) => {
    if (isArray) {
      const current = preferences[key] as string[];
      const updated = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      updatePreferences({ [key]: updated });
    }
  };

  if (authLoading || prefsLoading) {
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
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Flight Booking Assistant</h1>
          <p className="text-muted-foreground">Smart search optimized for your preferences</p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            {/* Trip Type */}
            <div className="flex flex-wrap gap-2">
              {["roundtrip", "oneway"].map((type) => (
                <Button 
                  key={type}
                  variant={tripType === type ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setTripType(type as typeof tripType)}
                >
                  {type === "roundtrip" ? "Round Trip" : "One Way"}
                </Button>
              ))}
              <div className="flex items-center gap-2 ml-auto">
                <Switch checked={flexibleDates} onCheckedChange={setFlexibleDates} id="flexible" />
                <Label htmlFor="flexible" className="text-sm">±3 days</Label>
              </div>
            </div>

            {/* Home Airports Quick Select */}
            {preferences.home_airports.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Label className="w-full text-xs text-muted-foreground">Your airports:</Label>
                {preferences.home_airports.map((airport) => (
                  <Button
                    key={airport.code}
                    variant={origin === airport.code ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrigin(airport.code)}
                  >
                    {airport.code} {airport.isPrimary && "★"}
                  </Button>
                ))}
              </div>
            )}

            {/* Origin & Destination */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <Label>From</Label>
                <div className="relative">
                  <PlaneTakeoff className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="City or airport" 
                    className="pl-10" 
                    value={origin} 
                    onChange={(e) => handleOriginSearch(e.target.value)}
                    onFocus={() => origin.length >= 2 && setShowOriginResults(true)}
                    onBlur={() => setTimeout(() => setShowOriginResults(false), 200)}
                  />
                </div>
                {showOriginResults && originResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                    {originResults.map((a) => (
                      <button
                        key={a.code}
                        className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                        onClick={() => { setOrigin(a.code); setShowOriginResults(false); }}
                      >
                        <span className="font-medium">{a.code}</span> - {a.city} ({a.name})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <Label>To</Label>
                <div className="relative">
                  <PlaneLanding className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="City or airport" 
                    className="pl-10" 
                    value={destination} 
                    onChange={(e) => handleDestSearch(e.target.value)}
                    onFocus={() => destination.length >= 2 && setShowDestResults(true)}
                    onBlur={() => setTimeout(() => setShowDestResults(false), 200)}
                  />
                </div>
                {showDestResults && destResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                    {destResults.map((a) => (
                      <button
                        key={a.code}
                        className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                        onClick={() => { setDestination(a.code); setShowDestResults(false); }}
                      >
                        <span className="font-medium">{a.code}</span> - {a.city} ({a.name})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dates & Passengers */}
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <Label>Depart</Label>
                <Input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
              </div>
              {tripType === "roundtrip" && (
                <div>
                  <Label>Return</Label>
                  <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                </div>
              )}
              <div>
                <Label>Travelers</Label>
                <Select value={String(passengers)} onValueChange={(v) => setPassengers(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cabin</Label>
                <Select 
                  value={preferences.cabin_class} 
                  onValueChange={(v) => updatePreferences({ cabin_class: v as typeof preferences.cabin_class })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CABIN_CLASSES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={preferences.prefer_nonstop} 
                  onCheckedChange={(v) => updatePreferences({ prefer_nonstop: v })} 
                />
                <Label className="text-sm">Non-stop only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={preferences.family_mode} 
                  onCheckedChange={(v) => updatePreferences({ family_mode: v })} 
                />
                <Label className="text-sm flex items-center gap-1">
                  <Baby className="h-3 w-3" /> Family mode
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={preferences.needs_window_for_car_seat} 
                  onCheckedChange={(v) => updatePreferences({ needs_window_for_car_seat: v })} 
                />
                <Label className="text-sm flex items-center gap-1">
                  <Armchair className="h-3 w-3" /> Need window (car seat)
                </Label>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={searchFlights} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlaneTakeoff className="h-4 w-4 mr-2" />}
              {searching ? "Searching..." : "Search Flights"}
            </Button>
          </CardContent>
        </Card>

        {/* Category Cards */}
        {categories && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {categories.bestOverall && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Best Overall</span>
                  </div>
                  <p className="text-xl font-bold">${categories.bestOverall.price}</p>
                  <p className="text-xs text-muted-foreground">Score: {categories.bestOverall.score}/100</p>
                </CardContent>
              </Card>
            )}
            {categories.fastest && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Fastest</span>
                  </div>
                  <p className="text-xl font-bold">${categories.fastest.price}</p>
                </CardContent>
              </Card>
            )}
            {categories.cheapest && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Cheapest</span>
                  </div>
                  <p className="text-xl font-bold">${categories.cheapest.price}</p>
                </CardContent>
              </Card>
            )}
            {categories.bestForFamilies && preferences.family_mode && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">Best for Families</span>
                  </div>
                  <p className="text-xl font-bold">${categories.bestForFamilies.price}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

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
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">All Flights ({flights.length})</h2>
            {flights.map((flight, idx) => (
              <Card key={flight.id} className={idx === 0 ? "border-primary" : ""}>
                <CardContent className="p-4">
                  {/* Score and badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-bold">
                        {flight.score}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {flight.badges.map(b => (
                          <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                        ))}
                        {flight.delayRisk === "high" && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />High delay risk
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">${flight.price?.toFixed(0)}</p>
                      {flight.hiddenCosts.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          +${flight.hiddenCosts.reduce((s, c) => s + c.estimatedCost, 0)} est. fees
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Explanation */}
                  <p className="text-sm text-muted-foreground mb-3 italic">{flight.explanation}</p>

                  {/* Flight segments */}
                  {flight.itineraries?.map((itinerary, itIdx) => (
                    <div key={itIdx} className="space-y-2 mb-2">
                      {itIdx > 0 && <div className="text-xs text-muted-foreground border-t pt-2">Return</div>}
                      {itinerary.segments?.map((seg, segIdx) => (
                        <div key={segIdx} className="flex items-center justify-between text-sm">
                          <Badge variant="outline">{seg.airline} {seg.flightNumber}</Badge>
                          <div className="flex items-center gap-2 text-center">
                            <div>
                              <p className="font-medium">{formatTime(seg.departureTime)}</p>
                              <p className="text-xs text-muted-foreground">{seg.departureAirport}</p>
                            </div>
                            <div className="px-2">
                              <p className="text-xs text-muted-foreground">{seg.duration || '—'}</p>
                              <div className="w-16 h-px bg-border" />
                              <p className="text-xs">{seg.stops === 0 ? 'Nonstop' : `${seg.stops} stop`}</p>
                            </div>
                            <div>
                              <p className="font-medium">{formatTime(seg.arrivalTime)}</p>
                              <p className="text-xs text-muted-foreground">{seg.arrivalAirport}</p>
                            </div>
                          </div>
                          <Button size="sm">Select</Button>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Warnings */}
                  {flight.warnings.length > 0 && (
                    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      {flight.warnings.map((w, i) => <p key={i}>⚠️ {w}</p>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Preferences Panel */}
        <Collapsible open={showPreferences} onOpenChange={setShowPreferences} className="mt-6">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Filter className="h-4 w-4" /> Your Preferences
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPreferences ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Seat Preference */}
                <div>
                  <Label className="mb-2 block">Seat Preference</Label>
                  <div className="flex gap-2">
                    {["window", "aisle", "middle"].map(seat => (
                      <Button
                        key={seat}
                        variant={preferences.seat_preference === seat ? "default" : "outline"}
                        size="sm"
                        onClick={() => updatePreferences({ seat_preference: seat as typeof preferences.seat_preference })}
                      >
                        {seat.charAt(0).toUpperCase() + seat.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Departure Times */}
                <div>
                  <Label className="mb-2 block">Preferred Times</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEPARTURE_TIMES.map(time => (
                      <Badge 
                        key={time.value}
                        variant={preferences.preferred_departure_times.includes(time.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => togglePreference("preferred_departure_times", time.value)}
                      >
                        {time.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Airlines */}
                <div>
                  <Label className="mb-2 block">Preferred Airlines</Label>
                  <div className="flex flex-wrap gap-2">
                    {AIRLINES.slice(0, 10).map(airline => (
                      <Badge 
                        key={airline.code}
                        variant={preferences.preferred_airlines.includes(airline.name) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => togglePreference("preferred_airlines", airline.name)}
                      >
                        {airline.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Avoided Airlines */}
                <div>
                  <Label className="mb-2 block">Avoid Airlines</Label>
                  <div className="flex flex-wrap gap-2">
                    {AIRLINES.slice(0, 10).map(airline => (
                      <Badge 
                        key={`avoid-${airline.code}`}
                        variant={preferences.avoided_airlines.includes(airline.name) ? "destructive" : "outline"}
                        className="cursor-pointer"
                        onClick={() => togglePreference("avoided_airlines", airline.name)}
                      >
                        {airline.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Layover Settings - Only show if nonstop not selected */}
                {!preferences.prefer_nonstop && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Max Layover Hours</Label>
                        <span className="text-sm">{preferences.max_layover_hours}h</span>
                      </div>
                      <Slider 
                        value={[preferences.max_layover_hours]} 
                        onValueChange={([v]) => updatePreferences({ max_layover_hours: v })} 
                        min={1} max={12} step={1} 
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Min Connection Time (min)</Label>
                        <span className="text-sm">{preferences.min_connection_minutes}m</span>
                      </div>
                      <Slider 
                        value={[preferences.min_connection_minutes]} 
                        onValueChange={([v]) => updatePreferences({ min_connection_minutes: v })} 
                        min={30} max={180} step={15} 
                      />
                    </div>
                  </div>
                )}

                {/* Further Airport */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="flex items-center gap-2">
                      <Car className="h-4 w-4" /> Drive further for savings
                    </Label>
                    <Switch 
                      checked={preferences.willing_to_drive_further} 
                      onCheckedChange={(v) => updatePreferences({ willing_to_drive_further: v })} 
                    />
                  </div>
                  {preferences.willing_to_drive_further && (
                    <div className="space-y-4 pl-4 border-l-2">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Max extra drive</span>
                          <span className="text-sm font-medium">{preferences.max_extra_drive_minutes} min</span>
                        </div>
                        <Slider 
                          value={[preferences.max_extra_drive_minutes]} 
                          onValueChange={([v]) => updatePreferences({ max_extra_drive_minutes: v })} 
                          min={15} max={120} step={15} 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Min savings required</span>
                          <span className="text-sm font-medium">${preferences.min_savings_for_further_airport}</span>
                        </div>
                        <Slider 
                          value={[preferences.min_savings_for_further_airport]} 
                          onValueChange={([v]) => updatePreferences({ min_savings_for_further_airport: v })} 
                          min={50} max={500} step={25} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </AppLayout>
  );
};

export default Flights;
