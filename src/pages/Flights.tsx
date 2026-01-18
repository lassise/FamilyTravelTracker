import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFlightPreferences } from "@/hooks/useFlightPreferences";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlternateAirportsSection } from "@/components/flights/AlternateAirportsSection";
import { PriceAlertDialog } from "@/components/flights/PriceAlertDialog";
import { FlightTransparencyPanel } from "@/components/flights/FlightTransparencyPanel";
import { ConnectionRiskIndicator } from "@/components/flights/ConnectionRiskIndicator";
import { 
  PlaneTakeoff, PlaneLanding, Users, Filter, Clock, DollarSign, 
  Loader2, AlertCircle, Star, Zap, Heart, Baby, ChevronDown, AlertTriangle,
  Info, Armchair, CheckCircle2, XCircle, ExternalLink, ArrowUpDown, Bell,
  TrendingDown, TrendingUp, Minus, Lightbulb, ArrowLeft, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { scoreFlights, categorizeFlights, type ScoredFlight, type FlightResult, type PassengerBreakdown } from "@/lib/flightScoring";
import { searchAirports, MAJOR_US_AIRLINES, INTERNATIONAL_AIRLINES, AIRLINES, type Airport } from "@/lib/airportsData";

// Build Google Flights deep link for booking handoff
const buildGoogleFlightsUrl = (
  origin: string,
  destination: string,
  departDate: string,
  returnDate?: string,
  passengers?: number,
  cabinClass?: string
): string => {
  const cabinMap: Record<string, string> = {
    'economy': '1',
    'premium_economy': '2',
    'business': '3',
    'first': '4',
  };
  
  const baseUrl = 'https://www.google.com/travel/flights';
  const params = new URLSearchParams();
  
  // Build the query string for Google Flights
  const tripType = returnDate ? 'roundtrip' : 'oneway';
  const cabin = cabinMap[cabinClass || 'economy'] || '1';
  
  // Format: Flights from [origin] to [destination] on [date]
  let query = `Flights from ${origin} to ${destination}`;
  if (departDate) {
    query += ` on ${departDate}`;
  }
  if (returnDate) {
    query += ` returning ${returnDate}`;
  }
  
  params.set('q', query);
  if (passengers && passengers > 1) {
    params.set('pax', passengers.toString());
  }
  
  return `${baseUrl}?${params.toString()}`;
};

const DEPARTURE_TIMES = [
  { value: "early_morning", label: "Early (5-8am)" },
  { value: "morning", label: "Morning (8am-12pm)" },
  { value: "afternoon", label: "Afternoon (12-5pm)" },
  { value: "evening", label: "Evening (5-9pm)" },
  { value: "red_eye", label: "Red Eye (9pm-5am)" },
];

const CABIN_CLASSES = [
  { value: "any", label: "Any Class" },
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

const STOPS_OPTIONS = [
  { value: "nonstop", label: "Nonstop only" },
  { value: "1_or_fewer", label: "1 stop or fewer" },
  { value: "2_or_fewer", label: "2 stops or fewer" },
];

const SEAT_OPTIONS = [
  { value: "window", label: "Window" },
  { value: "aisle", label: "Aisle" },
  { value: "middle", label: "Middle" },
];

// Premium cabin seat types for business/first class
const PREMIUM_SEAT_TYPES = [
  { value: "lay_flat", label: "Lay-Flat Bed", description: "180° recline seats" },
  { value: "angled_flat", label: "Angled Flat", description: "160-170° recline" },
  { value: "pod", label: "Private Pod/Suite", description: "Enclosed suite with door" },
  { value: "reverse_herringbone", label: "Reverse Herringbone", description: "Direct aisle access, angled" },
  { value: "herringbone", label: "Herringbone", description: "Angled seats with aisle access" },
  { value: "staggered", label: "Staggered", description: "Alternating window/aisle focus" },
  { value: "standard_recliner", label: "Standard Recliner", description: "No lie-flat capability" },
];

// Airline Selector Component with expandable list
interface AirlineSelectorProps {
  label: string;
  selectedAirlines: string[];
  onToggle: (airlineName: string) => void;
  variant: 'preferred' | 'avoided';
}

const AirlineSelector = ({ label, selectedAirlines, onToggle, variant }: AirlineSelectorProps) => {
  const [showMore, setShowMore] = useState(false);
  
  const displayedAirlines = showMore 
    ? [...MAJOR_US_AIRLINES, ...INTERNATIONAL_AIRLINES]
    : MAJOR_US_AIRLINES;
  
  const badgeVariant = (airlineName: string) => {
    const isSelected = selectedAirlines.includes(airlineName);
    if (variant === 'avoided') {
      return isSelected ? 'destructive' : 'outline';
    }
    return isSelected ? 'default' : 'outline';
  };
  
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {displayedAirlines.map(airline => (
          <Badge 
            key={`${variant}-${airline.code}`}
            variant={badgeVariant(airline.name) as any}
            className="cursor-pointer"
            onClick={() => onToggle(airline.name)}
          >
            {airline.name}
          </Badge>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 text-muted-foreground text-xs h-7"
        onClick={() => setShowMore(!showMore)}
      >
        {showMore ? 'Show less' : `More airlines (${INTERNATIONAL_AIRLINES.length}+)...`}
        <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
      </Button>
      {selectedAirlines.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedAirlines.length} selected
        </p>
      )}
    </div>
  );
};

const Flights = () => {
  const { user, loading: authLoading, needsOnboarding, profile } = useAuth();
  const { preferences, updatePreferences, loading: prefsLoading } = useFlightPreferences();
  const navigate = useNavigate();

  // Search state
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [tripType, setTripType] = useState<"roundtrip" | "oneway" | "multicity">("roundtrip");
  
  // Multi-city segments
  interface FlightSegment {
    origin: string;
    destination: string;
    date: string;
  }
  const [multiCitySegments, setMultiCitySegments] = useState<FlightSegment[]>([
    { origin: "", destination: "", date: "" },
    { origin: "", destination: "", date: "" },
  ]);
  
  // Passenger breakdown
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0); // Ages 2-11
  const [infantsInSeat, setInfantsInSeat] = useState(0);
  const [infantsOnLap, setInfantsOnLap] = useState(0);
  
  // Total passengers derived
  const passengers = adults + children + infantsInSeat + infantsOnLap;

  // Airport search
  const [originResults, setOriginResults] = useState<Airport[]>([]);
  const [destResults, setDestResults] = useState<Airport[]>([]);
  const [showOriginResults, setShowOriginResults] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);

  // Search results
  const [searching, setSearching] = useState(false);
  const [flights, setFlights] = useState<ScoredFlight[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [categories, setCategories] = useState<ReturnType<typeof categorizeFlights> | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "price" | "departure" | "arrival" | "duration" | "stops">("score");
  const [cheapestPrimaryPrice, setCheapestPrimaryPrice] = useState<number | null>(null);
  
  // Seat preferences - multiple selection
  const [seatPreferences, setSeatPreferences] = useState<string[]>([]);
  
  // Premium seat type preferences for business/first class
  const [premiumSeatTypes, setPremiumSeatTypes] = useState<string[]>([]);
  
  // Stops filter
  const [stopsFilter, setStopsFilter] = useState<string>("1_or_fewer");
  
  // Compare all cabins toggle
  const [compareAllCabins, setCompareAllCabins] = useState(false);
  
  // Cabin class - local state to support "any" option
  const [cabinClass, setCabinClass] = useState<string>("economy");
  
  // Price alert dialog
  const [priceAlertOpen, setPriceAlertOpen] = useState(false);

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
  
  // Load seat preferences
  useEffect(() => {
    if (!prefsLoading && preferences.seat_preference && preferences.seat_preference.length > 0) {
      setSeatPreferences(preferences.seat_preference);
    }
  }, [preferences.seat_preference, prefsLoading]);

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
  
  const toggleSeatPreference = (seat: string) => {
    const updated = seatPreferences.includes(seat)
      ? seatPreferences.filter(s => s !== seat)
      : [...seatPreferences, seat];
    setSeatPreferences(updated);
    updatePreferences({ seat_preference: updated });
  };
  
  const togglePremiumSeatType = (seatType: string) => {
    const updated = premiumSeatTypes.includes(seatType)
      ? premiumSeatTypes.filter(s => s !== seatType)
      : [...premiumSeatTypes, seatType];
    setPremiumSeatTypes(updated);
    // Could save to preferences in future - for now local state
  };
  
  const isPremiumCabin = cabinClass === "business" || cabinClass === "first";
  
  // Cabin class for search - use any as null for API
  const effectiveCabinClass = cabinClass === "any" ? null : cabinClass;

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
    setSearchMessage(null);
    setFlights([]);
    setCategories(null);
    setIsDemo(false);

    try {
      const { data, error } = await supabase.functions.invoke('search-flights', {
        body: {
          origin,
          destination,
          departureDate: departDate,
          returnDate: tripType === "roundtrip" ? returnDate : null,
          passengers,
          tripType,
          cabinClass: effectiveCabinClass,
          alternateAirports: preferences.alternate_airports,
          stopsFilter,
          compareAllCabins: compareAllCabins && cabinClass === "any",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const rawFlights: FlightResult[] = data.flights || [];
      setIsDemo(data.isDemo || false);
      setSearchMessage(data.message || null);
      
      // Store cheapest primary price for savings calculation
      const primaryCheapest = data.searchMetadata?.cheapestPrimaryPrice || null;
      setCheapestPrimaryPrice(primaryCheapest);
      
      // Score and categorize flights with preference matching info
      const passengerBreakdown = { adults, children, infantsInSeat, infantsOnLap };
      const scored = scoreFlights(rawFlights, preferences, undefined, passengerBreakdown, preferences.cabin_class);
      
      // Calculate savings from primary for alternate airport flights
      if (primaryCheapest) {
        scored.forEach(flight => {
          if (flight.isAlternateOrigin) {
            flight.savingsFromPrimary = primaryCheapest - flight.price;
            flight.savingsPerTicket = passengers > 0 ? (primaryCheapest - flight.price) / passengers : 0;
          }
        });
      }
      
      setFlights(scored);
      setCategories(categorizeFlights(scored));

      if (scored.length === 0) {
        toast.info("No flights found for your search criteria");
      } else {
        if (data.isDemo) {
          toast.info(`Found ${scored.length} sample flight options`);
        } else {
          toast.success(`Found ${scored.length} flight options`);
        }
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

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  // Check if an airline is avoided
  const isAvoidedAirline = (airlineCode: string): boolean => {
    const airline = AIRLINES.find(a => airlineCode.startsWith(a.code) || airlineCode === a.name);
    if (!airline) return false;
    return preferences.avoided_airlines.includes(airline.name) || 
           preferences.avoided_airlines.includes(airline.code);
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

        {/* Preferences Panel */}
        <Collapsible open={showPreferences} onOpenChange={setShowPreferences} className="mb-6">
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
                {/* Seat Preference - Multiple Selection */}
                <div>
                  <Label className="mb-2 block">Seat Preference (select all that apply)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {SEAT_OPTIONS.map(seat => (
                      <Badge
                        key={seat.value}
                        variant={seatPreferences.includes(seat.value) ? "default" : "outline"}
                        className="cursor-pointer px-3 py-1.5"
                        onClick={() => toggleSeatPreference(seat.value)}
                      >
                        {seat.label}
                      </Badge>
                    ))}
                    {seatPreferences.length === 0 && (
                      <span className="text-xs text-muted-foreground">No preference</span>
                    )}
                  </div>
                </div>

                {/* Premium Seat Type Preferences - Only for Business/First Class */}
                {isPremiumCabin && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <Label className="mb-2 block font-medium flex items-center gap-2">
                      <Armchair className="h-4 w-4" />
                      {preferences.cabin_class === "first" ? "First Class" : "Business Class"} Seat Type Preferences
                    </Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select the seat configurations you prefer (results will highlight matching flights)
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {PREMIUM_SEAT_TYPES.map(seatType => (
                        <Tooltip key={seatType.value}>
                          <TooltipTrigger asChild>
                            <div
                              className={`cursor-pointer p-2.5 rounded-md border transition-all ${
                                premiumSeatTypes.includes(seatType.value)
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background hover:bg-muted border-border'
                              }`}
                              onClick={() => togglePremiumSeatType(seatType.value)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{seatType.label}</span>
                                {premiumSeatTypes.includes(seatType.value) && (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{seatType.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                    {premiumSeatTypes.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">No preference - all seat types will be shown</p>
                    )}
                  </div>
                )}

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

                {/* Airlines - Preferred */}
                <AirlineSelector
                  label="Preferred Airlines"
                  selectedAirlines={preferences.preferred_airlines}
                  onToggle={(name) => togglePreference("preferred_airlines", name)}
                  variant="preferred"
                />

                {/* Airlines - Avoided */}
                <AirlineSelector
                  label="Avoid Airlines"
                  selectedAirlines={preferences.avoided_airlines}
                  onToggle={(name) => togglePreference("avoided_airlines", name)}
                  variant="avoided"
                />

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

                {/* Amenity Preferences */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="font-medium">Amenity Preferences (Must Have / Nice to Have)</Label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { key: 'entertainment_seatback', label: 'Seatback Entertainment' },
                      { key: 'entertainment_mobile', label: 'WiFi / Streaming' },
                      { key: 'usb_charging', label: 'USB / Power Outlet' },
                      { key: 'legroom_preference', label: 'Extra Legroom' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{label}</span>
                        <Select 
                          value={preferences[key as keyof typeof preferences] as string || 'nice_to_have'} 
                          onValueChange={(v) => updatePreferences({ [key]: v })}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Don't care</SelectItem>
                            <SelectItem value="nice_to_have">Nice to have</SelectItem>
                            <SelectItem value="must_have">Must have</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alternate Airports for Savings */}
                <AlternateAirportsSection 
                  alternateAirports={preferences.alternate_airports}
                  onUpdate={(airports) => updatePreferences({ alternate_airports: airports })}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            {/* Trip Type */}
            <div className="flex flex-wrap gap-2">
              {[
                { value: "roundtrip", label: "Round Trip" },
                { value: "oneway", label: "One Way" },
                { value: "multicity", label: "Multi-City" },
              ].map((type) => (
                <Button 
                  key={type.value}
                  variant={tripType === type.value ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setTripType(type.value as typeof tripType)}
                >
                  {type.label}
                </Button>
              ))}
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
                    onClick={() => {
                      setOrigin(airport.code);
                      setShowOriginResults(false);
                    }}
                  >
                    {airport.code} {airport.isPrimary && "★"}
                  </Button>
                ))}
              </div>
            )}

            {/* Origin & Destination - Standard for roundtrip/oneway */}
            {tripType !== "multicity" && (
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
            )}

            {/* Multi-City Segments */}
            {tripType === "multicity" && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Flight Segments</Label>
                {multiCitySegments.map((segment, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Segment {index + 1}</Badge>
                      {multiCitySegments.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMultiCitySegments(segments => segments.filter((_, i) => i !== index));
                          }}
                          className="h-6 px-2 text-destructive hover:text-destructive"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input 
                          placeholder="Airport code"
                          value={segment.origin}
                          onChange={(e) => {
                            const newSegments = [...multiCitySegments];
                            newSegments[index].origin = e.target.value.toUpperCase();
                            setMultiCitySegments(newSegments);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input 
                          placeholder="Airport code"
                          value={segment.destination}
                          onChange={(e) => {
                            const newSegments = [...multiCitySegments];
                            newSegments[index].destination = e.target.value.toUpperCase();
                            setMultiCitySegments(newSegments);
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input 
                          type="date"
                          value={segment.date}
                          onChange={(e) => {
                            const newSegments = [...multiCitySegments];
                            newSegments[index].date = e.target.value;
                            setMultiCitySegments(newSegments);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {multiCitySegments.length < 6 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastSegment = multiCitySegments[multiCitySegments.length - 1];
                      setMultiCitySegments([
                        ...multiCitySegments,
                        { origin: lastSegment?.destination || "", destination: "", date: "" }
                      ]);
                    }}
                  >
                    + Add Another Segment
                  </Button>
                )}
              </div>
            )}

            {/* Dates - only for non-multicity */}
            {tripType !== "multicity" && (
              <div className="grid sm:grid-cols-2 gap-4">
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
              </div>
            )}

            {/* Travelers Breakdown */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Travelers ({passengers} total)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Adults</Label>
                  <Select value={String(adults)} onValueChange={(v) => setAdults(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Children (2-11)</Label>
                  <Select value={String(children)} onValueChange={(v) => setChildren(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0,1,2,3,4,5,6].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Infant in seat</Label>
                  <Select value={String(infantsInSeat)} onValueChange={(v) => setInfantsInSeat(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0,1,2,3,4].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Infant on lap</Label>
                  <Select value={String(infantsOnLap)} onValueChange={(v) => setInfantsOnLap(Number(v))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[0,1,2,3,4].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Cabin Class & Stops Filter */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Cabin</Label>
                <Select 
                  value={cabinClass} 
                  onValueChange={(v) => {
                    setCabinClass(v);
                    // Clear premium seat types if switching away from business/first
                    if (v !== "business" && v !== "first") {
                      setPremiumSeatTypes([]);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CABIN_CLASSES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stops</Label>
                <Select value={stopsFilter} onValueChange={setStopsFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STOPS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Compare All Cabins Toggle - only when Any Class selected */}
            {cabinClass === "any" && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <Switch checked={compareAllCabins} onCheckedChange={setCompareAllCabins} />
                <Label className="text-sm">Show all cabin classes (compare prices)</Label>
              </div>
            )}
              
              {/* Premium Seat Type Quick Select - Shows when Business/First selected */}
              {isPremiumCabin && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Armchair className="h-4 w-4" />
                    Preferred Seat Types
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Select seat configurations you prefer. Flights with matching seat types will be highlighted in results.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PREMIUM_SEAT_TYPES.map(seatType => (
                      <Tooltip key={seatType.value}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={premiumSeatTypes.includes(seatType.value) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => togglePremiumSeatType(seatType.value)}
                          >
                            {seatType.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{seatType.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  {premiumSeatTypes.length > 0 && (
                    <p className="text-xs text-primary">
                      Looking for: {premiumSeatTypes.map(t => 
                        PREMIUM_SEAT_TYPES.find(p => p.value === t)?.label
                      ).join(", ")}
                    </p>
                  )}
                </div>
              )}

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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Family mode prioritizes flights with longer connection times (90+ min), avoids red-eye flights, and considers kid-friendly factors like departure times and total travel duration.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={preferences.needs_window_for_car_seat} 
                  onCheckedChange={(v) => updatePreferences({ needs_window_for_car_seat: v })} 
                />
                <Label className="text-sm flex items-center gap-1">
                  <Armchair className="h-3 w-3" /> Need window (car seat)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Many flights require an infant in a car seat to sit by a window.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={searchFlights} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlaneTakeoff className="h-4 w-4 mr-2" />}
              {searching ? "Searching..." : "Search Flights"}
            </Button>
          </CardContent>
        </Card>

        {/* Demo Mode Notice */}
        {isDemo && searchMessage && (
          <Card className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Info className="h-5 w-5" />
                <p className="text-sm">{searchMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold">
                All Flights ({flights.length})
                {isDemo && <Badge variant="secondary" className="ml-2">Sample Data</Badge>}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPriceAlertOpen(true)}
                  className="gap-1"
                >
                  <Bell className="h-4 w-4" />
                  Set Price Alert
                </Button>
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Best Match</SelectItem>
                    <SelectItem value="price">Price (Low to High)</SelectItem>
                    <SelectItem value="departure">Departure Time</SelectItem>
                    <SelectItem value="arrival">Arrival Time</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="stops">Stops</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {[...flights].sort((a, b) => {
              switch (sortBy) {
                case "price":
                  return a.price - b.price;
                case "departure": {
                  const aTime = new Date(a.itineraries[0]?.segments[0]?.departureTime || 0).getTime();
                  const bTime = new Date(b.itineraries[0]?.segments[0]?.departureTime || 0).getTime();
                  return aTime - bTime;
                }
                case "arrival": {
                  const aSegs = a.itineraries[0]?.segments || [];
                  const bSegs = b.itineraries[0]?.segments || [];
                  const aTime = new Date(aSegs[aSegs.length - 1]?.arrivalTime || 0).getTime();
                  const bTime = new Date(bSegs[bSegs.length - 1]?.arrivalTime || 0).getTime();
                  return aTime - bTime;
                }
                case "duration": {
                  const aDur = a.itineraries.reduce((sum, it) => sum + it.segments.reduce((s, seg) => s + (typeof seg.duration === 'number' ? seg.duration : 0), 0), 0);
                  const bDur = b.itineraries.reduce((sum, it) => sum + it.segments.reduce((s, seg) => s + (typeof seg.duration === 'number' ? seg.duration : 0), 0), 0);
                  return aDur - bDur;
                }
                case "stops": {
                  const aStops = a.itineraries.reduce((sum, it) => sum + it.segments.length - 1, 0);
                  const bStops = b.itineraries.reduce((sum, it) => sum + it.segments.length - 1, 0);
                  return aStops - bStops;
                }
                default:
                  return b.score - a.score;
              }
            }).map((flight, idx) => {
              const firstSegment = flight.itineraries[0]?.segments[0];
              const flightAirline = firstSegment?.airline || "";
              const isAvoided = isAvoidedAirline(flightAirline);
              
              return (
                <Card 
                  key={flight.id} 
                  className={`
                    ${idx === 0 && sortBy === "score" && !isAvoided ? "border-primary" : ""} 
                    ${flight.isAlternateOrigin ? "border-l-4 border-l-orange-500" : ""} 
                    ${isAvoided ? "border-red-500 border-2 bg-red-50/30 dark:bg-red-950/10" : ""}
                  `}
                >
                  <CardContent className="p-4">
                    {/* Avoided Airline Warning */}
                    {isAvoided && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-red-100 dark:bg-red-950/40 rounded-md text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Avoided Airline</span>
                      </div>
                    )}

                    {/* Alternate Airport Badge */}
                    {flight.isAlternateOrigin && flight.departureAirport && (
                      <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-md">
                        <Badge className="bg-orange-500 hover:bg-orange-600 text-white">
                          From {flight.departureAirport}
                        </Badge>
                        {flight.savingsFromPrimary && flight.savingsFromPrimary > 0 && (
                          <div className="flex flex-wrap gap-2 text-sm text-orange-700 dark:text-orange-400 font-medium">
                            <span>Save ${flight.savingsFromPrimary.toFixed(0)} total</span>
                            {passengers > 1 && flight.savingsPerTicket && (
                              <span className="text-orange-600 dark:text-orange-300">
                                (${flight.savingsPerTicket.toFixed(0)}/ticket)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Score and badges */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-sm font-bold ${isAvoided ? 'bg-red-500 text-white' : 'bg-primary text-primary-foreground'}`}>
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
                        {passengers > 1 && flight.pricePerTicket && (
                          <p className="text-sm text-muted-foreground">
                            ${flight.pricePerTicket.toFixed(0)}/ticket
                          </p>
                        )}
                        {flight.hiddenCosts.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            +${flight.hiddenCosts.reduce((s, c) => s + c.estimatedCost, 0)} est. fees
                          </p>
                        )}
                        {/* Price Insight Badge */}
                        {flight.priceInsight && (
                          <Badge 
                            variant="outline" 
                            className={`mt-1 text-xs ${
                              flight.priceInsight.level === "low" 
                                ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" 
                                : flight.priceInsight.level === "high" 
                                  ? "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                                  : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400"
                            }`}
                          >
                            {flight.priceInsight.level === "low" && <TrendingDown className="h-3 w-3 mr-1" />}
                            {flight.priceInsight.level === "high" && <TrendingUp className="h-3 w-3 mr-1" />}
                            {flight.priceInsight.level === "medium" && <Minus className="h-3 w-3 mr-1" />}
                            {flight.priceInsight.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price Insight Advice */}
                    {flight.priceInsight && (
                      <div className={`text-xs p-2 rounded-md mb-3 flex items-start gap-2 ${
                        flight.priceInsight.level === "low" 
                          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                          : flight.priceInsight.level === "high"
                            ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                            : "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400"
                      }`}>
                        <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>{flight.priceInsight.advice}</span>
                      </div>
                    )}

                    {/* Explanation */}
                    <p className="text-sm text-muted-foreground mb-3 italic">{flight.explanation}</p>

                    {/* Match Explanation - only show detailed "best match" for #1, others get "not best match" */}
                    {idx === 0 && sortBy === "score" && flight.score < 100 && flight.matchExplanation && (
                      <div className="mb-3 p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          <span>Why this is your best match:</span>
                        </div>
                        
                        {flight.matchExplanation.whyNotPerfect.length > 0 && (
                          <div className="text-xs space-y-1">
                            <p className="text-muted-foreground font-medium">Not a 100% match because:</p>
                            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                              {flight.matchExplanation.whyNotPerfect.map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {flight.matchExplanation.whyBestChoice.length > 0 && (
                          <div className="text-xs space-y-1">
                            <p className="text-green-700 dark:text-green-400 font-medium">But it's still best because:</p>
                            <ul className="list-disc list-inside text-green-700 dark:text-green-400 space-y-0.5">
                              {flight.matchExplanation.whyBestChoice.map((reason, i) => (
                                <li key={i}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* For non-first results, show why it's not the best match */}
                    {idx > 0 && sortBy === "score" && flight.matchExplanation && flight.matchExplanation.whyNotPerfect.length > 0 && (
                      <div className="mb-3 p-2 bg-muted/30 rounded-md">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Why this is not your best match:</span>{" "}
                          {flight.matchExplanation.whyNotPerfect.slice(0, 2).join("; ")}
                        </p>
                      </div>
                    )}

                    {/* Preference Matches - Positives and Negatives */}
                    {flight.preferenceMatches && flight.preferenceMatches.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {flight.preferenceMatches.filter(m => m.type === "positive").map((match, i) => (
                          <Tooltip key={`pos-${i}`}>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs border-green-500/50 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 cursor-help">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {match.label}
                              </Badge>
                            </TooltipTrigger>
                            {match.detail && (
                              <TooltipContent>
                                <p>{match.detail}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        ))}
                        {flight.preferenceMatches.filter(m => m.type === "negative").map((match, i) => (
                          <Tooltip key={`neg-${i}`}>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs border-red-500/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 cursor-help">
                                <XCircle className="h-3 w-3 mr-1" />
                                {match.label}
                              </Badge>
                            </TooltipTrigger>
                            {match.detail && (
                              <TooltipContent>
                                <p>{match.detail}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        ))}
                      </div>
                    )}

                    {/* Flight segments */}
                    {flight.itineraries?.map((itinerary, itIdx) => {
                      const isReturn = itinerary.type === 'return' || itIdx > 0;
                      return (
                        <div key={itIdx} className="space-y-2 mb-3">
                          {/* Itinerary header */}
                          <div className={`flex items-center gap-2 ${itIdx > 0 ? 'border-t pt-3' : ''}`}>
                            <Badge variant={isReturn ? "secondary" : "default"} className="text-xs">
                              {isReturn ? (
                                <>
                                  <ArrowLeft className="h-3 w-3 mr-1" />
                                  Return Flight
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Outbound Flight
                                </>
                              )}
                            </Badge>
                            {itinerary.segments?.length > 1 && (
                              <span className="text-xs text-muted-foreground">
                                ({itinerary.segments.length - 1} connection{itinerary.segments.length > 2 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          
                          {itinerary.segments?.map((seg, segIdx) => {
                            // Get layover info for connection risk indicator
                            const layover = flight.layovers?.[segIdx];
                            const hasLayover = segIdx < itinerary.segments.length - 1 && layover;
                            
                            return (
                              <div key={segIdx} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <Badge variant={isAvoided ? "destructive" : "outline"}>{seg.airline} {seg.flightNumber}</Badge>
                                  <div className="flex items-center gap-2 text-center">
                                    <div>
                                      <p className="font-medium">{formatTime(seg.departureTime)}</p>
                                      <p className="text-xs text-muted-foreground">{formatDate(seg.departureTime)}</p>
                                      <p className="text-xs text-muted-foreground">{seg.departureAirport}</p>
                                    </div>
                                    <div className="px-2">
                                      <p className="text-xs text-muted-foreground">{typeof seg.duration === 'number' ? `${Math.floor(seg.duration / 60)}h ${seg.duration % 60}m` : seg.duration || '—'}</p>
                                      <div className="w-16 h-px bg-border" />
                                      <p className="text-xs">{seg.stops === 0 ? 'Nonstop' : `${seg.stops} stop`}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">{formatTime(seg.arrivalTime)}</p>
                                      <p className="text-xs text-muted-foreground">{formatDate(seg.arrivalTime)}</p>
                                      <p className="text-xs text-muted-foreground">{seg.arrivalAirport}</p>
                                    </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      const googleFlightsUrl = buildGoogleFlightsUrl(
                                        seg.departureAirport,
                                        seg.arrivalAirport,
                                        seg.departureTime ? new Date(seg.departureTime).toISOString().split('T')[0] : departDate,
                                        tripType === "roundtrip" ? returnDate : undefined,
                                        passengers,
                                        cabinClass
                                      );
                                      window.open(googleFlightsUrl, '_blank');
                                    }}
                                    className="gap-1"
                                    title="Book on Google Flights - final price confirmed there"
                                  >
                                    Book on Google <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                {/* Connection Risk Indicator - show between segments */}
                                {hasLayover && layover && (
                                  <div className="flex items-center gap-2 pl-4 py-1 border-l-2 border-dashed border-muted ml-4">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {layover.duration}min layover at {layover.airport || layover.airportName}
                                    </span>
                                    <ConnectionRiskIndicator
                                      layoverMinutes={layover.duration}
                                      hasKids={preferences.family_mode || children > 0 || infantsInSeat > 0}
                                      isInternational={origin.length === 3 && destination.length === 3}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    
                    {/* Round-trip return flight note */}
                    {tripType === "roundtrip" && flight.itineraries?.length === 1 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            <p className="font-medium mb-1">Return flight options</p>
                            <p className="text-blue-600 dark:text-blue-400">
                              This price includes round-trip. Click "View Round Trip" to see return flight options for {returnDate} on Google Flights.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Transparency Panel - What's included */}
                    <FlightTransparencyPanel
                      cabinClass={cabinClass === "any" ? "economy" : cabinClass}
                      isBasicEconomy={flight.badges?.includes("Basic Economy")}
                      fareFamily={flight.itineraries[0]?.segments[0]?.cabin}
                      inclusions={{
                        carryOn: cabinClass === "business" || cabinClass === "first" ? true : 'fee',
                        checkedBag: cabinClass === "business" || cabinClass === "first" ? true : 'fee',
                        seatSelection: cabinClass === "business" || cabinClass === "first" ? true : (cabinClass === "premium_economy" ? true : 'fee'),
                        mealIncluded: cabinClass === "business" || cabinClass === "first" ? true : false,
                        wifi: 'fee',
                        power: cabinClass === "business" || cabinClass === "first" ? true : false,
                        entertainment: true,
                        changeable: cabinClass === "economy" ? 'fee' : true,
                        refundable: cabinClass === "business" || cabinClass === "first" ? true : false,
                      }}
                      restrictions={flight.badges?.includes("Basic Economy") ? [
                        "No carry-on bag (personal item only)",
                        "Seat assigned at check-in",
                        "Board last",
                        "No changes or refunds"
                      ] : []}
                      estimatedBagFees={{
                        firstBag: cabinClass === "business" || cabinClass === "first" ? 0 : 35,
                        secondBag: cabinClass === "business" || cabinClass === "first" ? 0 : 45,
                      }}
                    />
                    
                    {/* View Round Trip CTA for round-trip searches */}
                    {tripType === "roundtrip" && (
                      <Button 
                        className="w-full mt-3 gap-2"
                        onClick={() => {
                          const firstSeg = flight.itineraries[0]?.segments[0];
                          const googleFlightsUrl = buildGoogleFlightsUrl(
                            firstSeg?.departureAirport || origin,
                            firstSeg?.arrivalAirport || destination,
                            departDate,
                            returnDate,
                            passengers,
                            cabinClass
                          );
                          window.open(googleFlightsUrl, '_blank');
                        }}
                      >
                        View Round Trip on Google Flights <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Disclaimer */}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {tripType === "roundtrip" 
                        ? "Price shown is for round-trip. Final price and return flight options confirmed on Google Flights."
                        : "Estimated fare shown. Final price and inclusions confirmed on Google Flights/airline site."
                      }
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Price Alert Dialog */}
        <PriceAlertDialog
          open={priceAlertOpen}
          onOpenChange={setPriceAlertOpen}
          origin={origin}
          destination={destination}
          departureDate={departDate}
          returnDate={tripType === "roundtrip" ? returnDate : undefined}
          currentPrice={flights[0]?.price || 0}
          passengers={passengers}
        />
      </div>
    </AppLayout>
  );
};

export default Flights;
