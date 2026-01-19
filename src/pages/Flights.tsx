import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFlightPreferences } from "@/hooks/useFlightPreferences";
import { useFlightSearch } from "@/hooks/useFlightSearch";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlternateAirportsSection } from "@/components/flights/AlternateAirportsSection";
import { PriceAlertDialog } from "@/components/flights/PriceAlertDialog";
import { FlightSelectionCart, type SelectedFlight } from "@/components/flights/FlightSelectionCart";
import { FlightLegResults } from "@/components/flights/FlightLegResults";
import { buildGoogleFlightsUrl, logBookingEvent } from "@/lib/googleFlightsUrl";
import { PlaneTakeoff, PlaneLanding, Users, Filter, Clock, DollarSign, Loader2, AlertCircle, Star, Zap, Heart, Baby, ChevronDown, AlertTriangle, Info, Armchair, CheckCircle2, XCircle, ExternalLink, ArrowUpDown, Bell, TrendingDown, TrendingUp, Minus, Lightbulb, ArrowLeft, ArrowRight, Plus, Trash2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { scoreFlights, categorizeFlights, type ScoredFlight, type FlightResult, type PassengerBreakdown } from "@/lib/flightScoring";
import { searchAirports, MAJOR_US_AIRLINES, INTERNATIONAL_AIRLINES, AIRLINES, type Airport } from "@/lib/airportsData";

const DEPARTURE_TIMES = [{
  value: "early_morning",
  label: "Early (5-8am)"
}, {
  value: "morning",
  label: "Morning (8am-12pm)"
}, {
  value: "afternoon",
  label: "Afternoon (12-5pm)"
}, {
  value: "evening",
  label: "Evening (5-9pm)"
}, {
  value: "red_eye",
  label: "Red Eye (9pm-5am)"
}];

const CABIN_CLASSES = [{
  value: "any",
  label: "Any Class"
}, {
  value: "economy",
  label: "Economy"
}, {
  value: "premium_economy",
  label: "Premium Economy"
}, {
  value: "business",
  label: "Business"
}, {
  value: "first",
  label: "First Class"
}];

const STOPS_OPTIONS = [{
  value: "any",
  label: "Any stops"
}, {
  value: "nonstop",
  label: "Nonstop only"
}, {
  value: "1_or_fewer",
  label: "1 stop or fewer"
}, {
  value: "2_or_fewer",
  label: "2 stops or fewer"
}];

const SEAT_OPTIONS = [{
  value: "window",
  label: "Window"
}, {
  value: "aisle",
  label: "Aisle"
}, {
  value: "middle",
  label: "Middle"
}];

const PREMIUM_SEAT_TYPES = [{
  value: "lay_flat",
  label: "Lay-Flat Bed",
  description: "180° recline seats"
}, {
  value: "angled_flat",
  label: "Angled Flat",
  description: "160-170° recline"
}, {
  value: "pod",
  label: "Private Pod/Suite",
  description: "Enclosed suite with door"
}, {
  value: "reverse_herringbone",
  label: "Reverse Herringbone",
  description: "Direct aisle access, angled"
}, {
  value: "herringbone",
  label: "Herringbone",
  description: "Angled seats with aisle access"
}, {
  value: "staggered",
  label: "Staggered",
  description: "Alternating window/aisle focus"
}, {
  value: "standard_recliner",
  label: "Standard Recliner",
  description: "No lie-flat capability"
}];

interface AirlineSelectorProps {
  label: string;
  selectedAirlines: string[];
  onToggle: (airlineName: string) => void;
  variant: 'preferred' | 'avoided';
}

const AirlineSelector = ({
  label,
  selectedAirlines,
  onToggle,
  variant
}: AirlineSelectorProps) => {
  const [showMore, setShowMore] = useState(false);
  const displayedAirlines = showMore ? [...MAJOR_US_AIRLINES, ...INTERNATIONAL_AIRLINES] : MAJOR_US_AIRLINES;
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
      <Button variant="ghost" size="sm" className="mt-2 text-muted-foreground text-xs h-7" onClick={() => setShowMore(!showMore)}>
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
  const {
    user,
    loading: authLoading,
    needsOnboarding,
    profile
  } = useAuth();
  const {
    preferences,
    updatePreferences,
    loading: prefsLoading
  } = useFlightPreferences();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Search state
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [tripType, setTripType] = useState<"roundtrip" | "oneway" | "multicity">("roundtrip");

  // Multi-city segments
  interface FlightSegment {
    id: string;
    origin: string;
    destination: string;
    date: string;
  }
  const [multiCitySegments, setMultiCitySegments] = useState<FlightSegment[]>([
    { id: "1", origin: "", destination: "", date: "" },
    { id: "2", origin: "", destination: "", date: "" }
  ]);

  // Passenger breakdown
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infantsInSeat, setInfantsInSeat] = useState(0);
  const [infantsOnLap, setInfantsOnLap] = useState(0);

  const passengers = adults + children + infantsInSeat + infantsOnLap;
  const passengerBreakdown = { adults, children, infantsInSeat, infantsOnLap };

  // Airport search
  const [originResults, setOriginResults] = useState<Airport[]>([]);
  const [destResults, setDestResults] = useState<Airport[]>([]);
  const [showOriginResults, setShowOriginResults] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);

  // UI state
  const [showPreferences, setShowPreferences] = useState(false);
  const [seatPreferences, setSeatPreferences] = useState<string[]>([]);
  const [premiumSeatTypes, setPremiumSeatTypes] = useState<string[]>([]);
  const [stopsFilter, setStopsFilter] = useState<string>("any");
  const [compareAllCabins, setCompareAllCabins] = useState(false);
  const [cabinClass, setCabinClass] = useState<string>("economy");
  const [priceAlertOpen, setPriceAlertOpen] = useState(false);

  // Selection cart
  const [selectedFlights, setSelectedFlights] = useState<SelectedFlight[]>([]);
  const [confirmedLegs, setConfirmedLegs] = useState<string[]>([]);
  
  // Active leg tab for separated views
  const [activeLegTab, setActiveLegTab] = useState<string>("outbound");

  // Flight search hook
  const {
    legResults,
    isSearching,
    searchOneWay,
    searchRoundTrip,
    searchReturnLeg,
    searchMultiCity,
    retryLeg,
    clearResults,
    isReturnPending,
  } = useFlightSearch(preferences, passengerBreakdown, cabinClass, stopsFilter);

  // For sequential round-trip: trigger return search when outbound is selected
  const outboundSelected = selectedFlights.find(s => s.legId === "outbound");
  
  useEffect(() => {
    if (tripType === "roundtrip" && outboundSelected && isReturnPending) {
      searchReturnLeg();
    }
  }, [tripType, outboundSelected, isReturnPending, searchReturnLeg]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && profile !== null && needsOnboarding) {
      navigate("/onboarding");
    }
  }, [user, authLoading, profile, needsOnboarding, navigate]);

  useEffect(() => {
    if (!prefsLoading && preferences.home_airports.length > 0 && !origin) {
      const primary = preferences.home_airports.find(a => a.isPrimary);
      if (primary) setOrigin(primary.code);
    }
  }, [preferences.home_airports, prefsLoading, origin]);

  useEffect(() => {
    if (!prefsLoading && preferences.seat_preference && preferences.seat_preference.length > 0) {
      setSeatPreferences(preferences.seat_preference);
    }
  }, [preferences.seat_preference, prefsLoading]);

  // Clear selections when trip type changes
  useEffect(() => {
    setSelectedFlights([]);
    setConfirmedLegs([]);
    setActiveLegTab(tripType === "multicity" ? "segment-1" : "outbound");
    clearResults();
  }, [tripType, clearResults]);

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
    const updated = seatPreferences.includes(seat) ? seatPreferences.filter(s => s !== seat) : [...seatPreferences, seat];
    setSeatPreferences(updated);
    updatePreferences({ seat_preference: updated });
  };

  const togglePremiumSeatType = (seatType: string) => {
    const updated = premiumSeatTypes.includes(seatType) ? premiumSeatTypes.filter(s => s !== seatType) : [...premiumSeatTypes, seatType];
    setPremiumSeatTypes(updated);
  };

  const isPremiumCabin = cabinClass === "business" || cabinClass === "first";

  const searchFlights = async () => {
    if (tripType === "multicity") {
      const validSegments = multiCitySegments.filter(s => s.origin && s.destination && s.date);
      if (validSegments.length < 2) {
        toast.error("Please fill in at least 2 flight segments");
        return;
      }
      setSelectedFlights([]);
      setConfirmedLegs([]);
      setActiveLegTab("segment-1");
      searchMultiCity(validSegments);
    } else if (tripType === "roundtrip") {
      if (!origin || !destination || !departDate || !returnDate) {
        toast.error("Please fill in all fields for round trip");
        return;
      }
      setSelectedFlights([]);
      setConfirmedLegs([]);
      setActiveLegTab("outbound");
      searchRoundTrip(origin, destination, departDate, returnDate);
    } else {
      if (!origin || !destination || !departDate) {
        toast.error("Please fill in origin, destination, and departure date");
        return;
      }
      setSelectedFlights([]);
      setConfirmedLegs([]);
      setActiveLegTab("outbound");
      searchOneWay(origin, destination, departDate);
    }
  };

  const formatTime = (dateTime: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateTime: string) => {
    if (!dateTime) return "";
    return new Date(dateTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const togglePreference = (key: keyof typeof preferences, value: string, isArray: boolean = true) => {
    if (isArray) {
      const current = preferences[key] as string[];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      updatePreferences({ [key]: updated });
    }
  };

  const isAvoidedAirline = (airlineCode: string): boolean => {
    const airline = AIRLINES.find(a => airlineCode.startsWith(a.code) || airlineCode === a.name);
    if (!airline) return false;
    return preferences.avoided_airlines.includes(airline.name) || preferences.avoided_airlines.includes(airline.code);
  };

  // Handle flight selection
  const handleSelectFlight = (legId: string, legLabel: string, flight: ScoredFlight, legOrigin: string, legDestination: string, date: string) => {
    setSelectedFlights(prev => {
      const existing = prev.filter(s => s.legId !== legId);
      return [...existing, { legId, legLabel, flight, origin: legOrigin, destination: legDestination, date }];
    });
  };

  // Remove selection
  const handleRemoveSelection = (legId: string) => {
    setSelectedFlights(prev => prev.filter(s => s.legId !== legId));
    setConfirmedLegs(prev => prev.filter(id => id !== legId));
  };

  // Handle confirming a leg selection
  const handleConfirmLeg = (legId: string) => {
    setConfirmedLegs(prev => {
      if (prev.includes(legId)) return prev;
      return [...prev, legId];
    });
    
    // Switch to next leg tab
    const legOrder = tripType === "roundtrip" 
      ? ["outbound", "return"]
      : tripType === "multicity"
        ? multiCitySegments.filter(s => s.origin && s.destination && s.date).map((_, i) => `segment-${i + 1}`)
        : ["outbound"];
    
    const currentIndex = legOrder.indexOf(legId);
    if (currentIndex < legOrder.length - 1) {
      const nextLegId = legOrder[currentIndex + 1];
      setTimeout(() => {
        setActiveLegTab(nextLegId);
        toast.success(`${getLegInfo(legId).label} flight confirmed! Now select your ${getLegInfo(nextLegId).label} flight.`);
      }, 100);
    } else {
      toast.success(`All flights selected! Continue to Google Flights to book.`);
    }
  };

  // Handle going back to change a leg
  const handleGoBackToLeg = (legId: string) => {
    setConfirmedLegs(prev => prev.filter(id => id !== legId));
    setActiveLegTab(legId);
  };

  // Focus on a leg for changing selection
  const handleChangeSelection = (legId: string) => {
    setConfirmedLegs(prev => prev.filter(id => id !== legId));
    setActiveLegTab(legId);
  };

  // Check if selection is complete
  const isSelectionComplete = useMemo(() => {
    if (tripType === "oneway") {
      return selectedFlights.some(s => s.legId === "outbound");
    } else if (tripType === "roundtrip") {
      return selectedFlights.some(s => s.legId === "outbound") && selectedFlights.some(s => s.legId === "return");
    } else {
      const requiredLegs = multiCitySegments.filter(s => s.origin && s.destination && s.date).length;
      const selectedLegs = selectedFlights.filter(s => s.legId.startsWith("segment-")).length;
      return requiredLegs > 0 && selectedLegs === requiredLegs;
    }
  }, [tripType, selectedFlights, multiCitySegments]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    return selectedFlights.reduce((sum, sel) => sum + (sel.flight.price || 0), 0);
  }, [selectedFlights]);

  // Continue to Google Flights
  const handleContinueToGoogle = () => {
    let url: string;

    if (tripType === "oneway") {
      url = buildGoogleFlightsUrl({
        tripType: "oneway",
        origin,
        destination,
        departDate,
        passengers,
        cabinClass,
      });
      logBookingEvent("oneway", { origin, destination, departDate, passengers });
    } else if (tripType === "roundtrip") {
      url = buildGoogleFlightsUrl({
        tripType: "roundtrip",
        origin,
        destination,
        departDate,
        returnDate,
        passengers,
        cabinClass,
      });
      logBookingEvent("roundtrip", { origin, destination, departDate, returnDate, passengers });
    } else {
      const segments = multiCitySegments.filter(s => s.origin && s.destination && s.date);
      url = buildGoogleFlightsUrl({
        tripType: "multicity",
        origin: segments[0]?.origin || "",
        destination: segments[segments.length - 1]?.destination || "",
        departDate: segments[0]?.date || "",
        passengers,
        cabinClass,
        segments,
      });
      logBookingEvent("multicity", { segments, passengers });
    }

    window.open(url, '_blank');
  };

  // Add multi-city segment
  const addMultiCitySegment = () => {
    if (multiCitySegments.length >= 6) return;
    const lastSeg = multiCitySegments[multiCitySegments.length - 1];
    setMultiCitySegments([...multiCitySegments, {
      id: String(Date.now()),
      origin: lastSeg?.destination || "",
      destination: "",
      date: ""
    }]);
  };

  // Remove multi-city segment
  const removeMultiCitySegment = (id: string) => {
    if (multiCitySegments.length <= 2) return;
    setMultiCitySegments(multiCitySegments.filter(s => s.id !== id));
  };

  // Update multi-city segment
  const updateMultiCitySegment = (id: string, field: keyof FlightSegment, value: string) => {
    setMultiCitySegments(segments => {
      const updated = segments.map(s => s.id === id ? { ...s, [field]: value } : s);
      // Auto-fill next segment origin when destination changes
      if (field === "destination") {
        const idx = updated.findIndex(s => s.id === id);
        if (idx < updated.length - 1 && !updated[idx + 1].origin) {
          updated[idx + 1] = { ...updated[idx + 1], origin: value };
        }
      }
      return updated;
    });
  };

  // Get leg info for display
  const getLegInfo = (legId: string) => {
    if (legId === "outbound") {
      return { origin, destination, date: departDate, label: "Outbound" };
    } else if (legId === "return") {
      return { origin: destination, destination: origin, date: returnDate, label: "Return" };
    } else {
      const idx = parseInt(legId.replace("segment-", "")) - 1;
      const seg = multiCitySegments[idx];
      return {
        origin: seg?.origin || "",
        destination: seg?.destination || "",
        date: seg?.date || "",
        label: `Flight ${idx + 1}`
      };
    }
  };

  // Get ordered leg IDs
  const getOrderedLegIds = () => {
    if (tripType === "roundtrip") {
      return ["outbound", "return"];
    } else if (tripType === "multicity") {
      return multiCitySegments
        .filter(s => s.origin && s.destination && s.date)
        .map((_, i) => `segment-${i + 1}`);
    }
    return ["outbound"];
  };

  // Get next leg label for confirm button
  const getNextLegLabel = (currentLegId: string) => {
    const legOrder = getOrderedLegIds();
    const currentIndex = legOrder.indexOf(currentLegId);
    if (currentIndex < legOrder.length - 1) {
      const nextLegId = legOrder[currentIndex + 1];
      return getLegInfo(nextLegId).label;
    }
    return null;
  };

  if (authLoading || prefsLoading) {
    return <AppLayout>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>;
  }

  const hasResults = Object.keys(legResults).length > 0;

  return <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Flight Analyzer</h1>
          <p className="text-muted-foreground">Analyzes available flights and tells you which ones to pick <span className="text-xs font-medium text-amber-600 dark:text-amber-400">*CANNOT DO DIRECT BOOKING*</span></p>
        </div>

        {/* Main content with cart sidebar on desktop */}
        <div className={`flex gap-6 ${hasResults ? 'flex-col lg:flex-row' : ''}`}>
          {/* Left column - Search and Results */}
          <div className={hasResults ? "flex-1 lg:max-w-3xl" : "w-full"}>
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
                    {/* Stops Filter in Preferences */}
                    <div>
                      <Label className="mb-2 block">Maximum Stops</Label>
                      <Select value={stopsFilter} onValueChange={setStopsFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Any stops" />
                        </SelectTrigger>
                        <SelectContent>
                          {STOPS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Seat Preference */}
                    <div>
                      <Label className="mb-2 block">Seat Preference (select all that apply)</Label>
                      <div className="flex gap-2 flex-wrap">
                        {SEAT_OPTIONS.map(seat => <Badge key={seat.value} variant={seatPreferences.includes(seat.value) ? "default" : "outline"} className="cursor-pointer px-3 py-1.5" onClick={() => toggleSeatPreference(seat.value)}>
                            {seat.label}
                          </Badge>)}
                        {seatPreferences.length === 0 && <span className="text-xs text-muted-foreground">No preference</span>}
                      </div>
                    </div>

                    {/* Premium Seat Types */}
                    {isPremiumCabin && <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <Label className="mb-2 block font-medium flex items-center gap-2">
                          <Armchair className="h-4 w-4" />
                          {preferences.cabin_class === "first" ? "First Class" : "Business Class"} Seat Type Preferences
                        </Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Select the seat configurations you prefer (results will highlight matching flights)
                        </p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {PREMIUM_SEAT_TYPES.map(seatType => <Tooltip key={seatType.value}>
                              <TooltipTrigger asChild>
                                <div className={`cursor-pointer p-2.5 rounded-md border transition-all ${premiumSeatTypes.includes(seatType.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'}`} onClick={() => togglePremiumSeatType(seatType.value)}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{seatType.label}</span>
                                    {premiumSeatTypes.includes(seatType.value) && <CheckCircle2 className="h-4 w-4" />}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p>{seatType.description}</p>
                              </TooltipContent>
                            </Tooltip>)}
                        </div>
                        {premiumSeatTypes.length === 0 && <p className="text-xs text-muted-foreground mt-2">No preference - all seat types will be shown</p>}
                      </div>}

                    {/* Departure Times */}
                    <div>
                      <Label className="mb-2 block">Preferred Times</Label>
                      <div className="flex flex-wrap gap-2">
                        {DEPARTURE_TIMES.map(time => <Badge key={time.value} variant={preferences.preferred_departure_times.includes(time.value) ? "default" : "outline"} className="cursor-pointer" onClick={() => togglePreference("preferred_departure_times", time.value)}>
                            {time.label}
                          </Badge>)}
                      </div>
                    </div>

                    {/* Airlines - Preferred */}
                    <AirlineSelector label="Preferred Airlines" selectedAirlines={preferences.preferred_airlines} onToggle={name => togglePreference("preferred_airlines", name)} variant="preferred" />

                    {/* Airlines - Avoided */}
                    <AirlineSelector label="Avoid Airlines" selectedAirlines={preferences.avoided_airlines} onToggle={name => togglePreference("avoided_airlines", name)} variant="avoided" />

                    {/* Layover Settings */}
                    {!preferences.prefer_nonstop && stopsFilter !== "nonstop" && <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Max Layover Hours</Label>
                            <span className="text-sm">{preferences.max_layover_hours}h</span>
                          </div>
                          <Slider value={[preferences.max_layover_hours]} onValueChange={([v]) => updatePreferences({ max_layover_hours: v })} min={1} max={12} step={1} />
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label>Min Connection Time (min)</Label>
                            <span className="text-sm">{preferences.min_connection_minutes}m</span>
                          </div>
                          <Slider value={[preferences.min_connection_minutes]} onValueChange={([v]) => updatePreferences({ min_connection_minutes: v })} min={30} max={180} step={15} />
                        </div>
                      </div>}

                    {/* Amenity Preferences */}
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="font-medium">Amenity Preferences (Must Have / Nice to Have)</Label>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[{
                          key: 'entertainment_seatback',
                          label: 'Seatback Entertainment'
                        }, {
                          key: 'entertainment_mobile',
                          label: 'WiFi / Streaming'
                        }, {
                          key: 'usb_charging',
                          label: 'USB / Power Outlet'
                        }, {
                          key: 'legroom_preference',
                          label: 'Extra Legroom'
                        }].map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-2">
                            <span className="text-sm">{label}</span>
                            <Select value={preferences[key as keyof typeof preferences] as string || 'nice_to_have'} onValueChange={v => updatePreferences({ [key]: v })}>
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Don't care</SelectItem>
                                <SelectItem value="nice_to_have">Nice to have</SelectItem>
                                <SelectItem value="must_have">Must have</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>)}
                      </div>
                    </div>

                    {/* Alternate Airports */}
                    <AlternateAirportsSection alternateAirports={preferences.alternate_airports} onUpdate={airports => updatePreferences({ alternate_airports: airports })} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Search Form */}
            <Card className="mb-6">
              <CardContent className="pt-6 space-y-4">
                {/* Trip Type */}
                <div className="flex flex-wrap gap-2">
                  {[{ value: "roundtrip", label: "Round Trip" }, { value: "oneway", label: "One Way" }, { value: "multicity", label: "Multi-City" }].map(type => <Button key={type.value} variant={tripType === type.value ? "default" : "outline"} size="sm" onClick={() => setTripType(type.value as typeof tripType)}>
                      {type.label}
                    </Button>)}
                </div>

                {/* Home Airports Quick Select */}
                {preferences.home_airports.length > 0 && tripType !== "multicity" && <div className="flex flex-wrap gap-2">
                    <Label className="w-full text-xs text-muted-foreground">Your airports:</Label>
                    {preferences.home_airports.map(airport => <Button key={airport.code} variant={origin === airport.code ? "default" : "outline"} size="sm" onClick={() => {
                      setOrigin(airport.code);
                      setShowOriginResults(false);
                    }}>
                        {airport.code} {airport.isPrimary && "★"}
                      </Button>)}
                  </div>}

                {/* Origin & Destination - Standard for roundtrip/oneway */}
                {tripType !== "multicity" && <div className="grid sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <Label>From</Label>
                      <div className="relative">
                        <PlaneTakeoff className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="City or airport" className="pl-10" value={origin} onChange={e => handleOriginSearch(e.target.value)} onFocus={() => origin.length >= 2 && setShowOriginResults(true)} onBlur={() => setTimeout(() => setShowOriginResults(false), 200)} />
                      </div>
                      {showOriginResults && originResults.length > 0 && <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                          {originResults.map(a => <button key={a.code} className="w-full px-3 py-2 text-left hover:bg-muted text-sm" onClick={() => {
                            setOrigin(a.code);
                            setShowOriginResults(false);
                          }}>
                              <span className="font-medium">{a.code}</span> - {a.city} ({a.name})
                            </button>)}
                        </div>}
                    </div>
                    <div className="relative">
                      <Label>To</Label>
                      <div className="relative">
                        <PlaneLanding className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="City or airport" className="pl-10" value={destination} onChange={e => handleDestSearch(e.target.value)} onFocus={() => destination.length >= 2 && setShowDestResults(true)} onBlur={() => setTimeout(() => setShowDestResults(false), 200)} />
                      </div>
                      {showDestResults && destResults.length > 0 && <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                          {destResults.map(a => <button key={a.code} className="w-full px-3 py-2 text-left hover:bg-muted text-sm" onClick={() => {
                            setDestination(a.code);
                            setShowDestResults(false);
                          }}>
                              <span className="font-medium">{a.code}</span> - {a.city} ({a.name})
                            </button>)}
                        </div>}
                    </div>
                  </div>}

                {/* Multi-City Segments */}
                {tripType === "multicity" && <div className="space-y-4">
                    <Label className="text-sm font-medium">Flight Segments</Label>
                    {multiCitySegments.map((segment, index) => <div key={segment.id} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Flight {index + 1}</Badge>
                          {multiCitySegments.length > 2 && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeMultiCitySegment(segment.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>}
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs">From</Label>
                            <Input placeholder="Airport code" value={segment.origin} onChange={e => updateMultiCitySegment(segment.id, 'origin', e.target.value.toUpperCase())} />
                          </div>
                          <div>
                            <Label className="text-xs">To</Label>
                            <Input placeholder="Airport code" value={segment.destination} onChange={e => updateMultiCitySegment(segment.id, 'destination', e.target.value.toUpperCase())} />
                          </div>
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Input type="date" value={segment.date} min={index > 0 ? multiCitySegments[index - 1]?.date : new Date().toISOString().split('T')[0]} onChange={e => updateMultiCitySegment(segment.id, 'date', e.target.value)} />
                          </div>
                        </div>
                      </div>)}
                    {multiCitySegments.length < 6 && <Button variant="outline" size="sm" onClick={addMultiCitySegment} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Another Flight
                      </Button>}
                  </div>}

                {/* Dates - only for non-multicity */}
                {tripType !== "multicity" && <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Depart</Label>
                      <Input type="date" value={departDate} onChange={e => setDepartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                    </div>
                    {tripType === "roundtrip" && <div>
                        <Label>Return</Label>
                        <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} min={departDate || new Date().toISOString().split('T')[0]} />
                      </div>}
                  </div>}

                {/* Travelers Breakdown */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Travelers ({passengers} total)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Adults</Label>
                      <Select value={String(adults)} onValueChange={v => setAdults(Number(v))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Children (2-11)</Label>
                      <Select value={String(children)} onValueChange={v => setChildren(Number(v))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4, 5, 6].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Infant in seat</Label>
                      <Select value={String(infantsInSeat)} onValueChange={v => setInfantsInSeat(Number(v))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Infant on lap</Label>
                      <Select value={String(infantsOnLap)} onValueChange={v => setInfantsOnLap(Number(v))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[0, 1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Cabin Class */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Cabin</Label>
                    <Select value={cabinClass} onValueChange={v => {
                      setCabinClass(v);
                      if (v !== "business" && v !== "first") {
                        setPremiumSeatTypes([]);
                      }
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CABIN_CLASSES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-md w-full">
                      <Switch checked={preferences.prefer_nonstop} onCheckedChange={v => {
                        updatePreferences({ prefer_nonstop: v });
                        if (v) setStopsFilter("nonstop");
                      }} />
                      <Label className="text-sm">Non-stop only</Label>
                    </div>
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Switch checked={preferences.needs_window_for_car_seat} onCheckedChange={v => updatePreferences({ needs_window_for_car_seat: v })} />
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

                <Button className="w-full" size="lg" onClick={searchFlights} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlaneTakeoff className="h-4 w-4 mr-2" />}
                  {isSearching ? "Searching..." : "Search Flights"}
                </Button>
              </CardContent>
            </Card>

            {/* Results by Leg - Tabbed View */}
            {hasResults && <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {tripType === "oneway" && "Available Flights"}
                    {tripType === "roundtrip" && "Select Your Flights"}
                    {tripType === "multicity" && "Select a Flight for Each Segment"}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => setPriceAlertOpen(true)} className="gap-1">
                    <Bell className="h-4 w-4" />
                    Set Price Alert
                  </Button>
                </div>

                {/* Leg Navigation Tabs */}
                {(tripType === "roundtrip" || tripType === "multicity") && (
                  <Tabs value={activeLegTab} onValueChange={setActiveLegTab} className="w-full">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${getOrderedLegIds().length}, 1fr)` }}>
                      {getOrderedLegIds().map((legId, index) => {
                        const legInfo = getLegInfo(legId);
                        const isConfirmed = confirmedLegs.includes(legId);
                        const selectedForLeg = selectedFlights.find(s => s.legId === legId);
                        const previousLegId = index > 0 ? getOrderedLegIds()[index - 1] : null;
                        const previousConfirmed = previousLegId ? confirmedLegs.includes(previousLegId) : true;
                        const isLocked = !previousConfirmed && index > 0;
                        
                        return (
                          <TabsTrigger 
                            key={legId} 
                            value={legId}
                            disabled={isLocked}
                            className="relative flex flex-col gap-0.5 py-2"
                          >
                            <div className="flex items-center gap-1.5">
                              {index === 0 ? (
                                <PlaneTakeoff className="h-3.5 w-3.5" />
                              ) : (
                                <PlaneLanding className="h-3.5 w-3.5" />
                              )}
                              <span className="font-medium">{legInfo.label}</span>
                              {isConfirmed && (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {legInfo.origin} → {legInfo.destination}
                            </span>
                            {selectedForLeg && !isConfirmed && (
                              <Badge variant="secondary" className="absolute -top-1 -right-1 text-[9px] px-1 py-0">
                                Selected
                              </Badge>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {/* Tab Content - Each leg on separate tab */}
                    {getOrderedLegIds().map((legId, index) => {
                      const result = legResults[legId];
                      if (!result) return null;
                      
                      const legInfo = getLegInfo(legId);
                      const selectedForLeg = selectedFlights.find(s => s.legId === legId);
                      const isConfirmed = confirmedLegs.includes(legId);
                      const nextLegLabel = getNextLegLabel(legId);
                      const previousLegId = index > 0 ? getOrderedLegIds()[index - 1] : null;
                      const previousConfirmed = previousLegId ? confirmedLegs.includes(previousLegId) : true;
                      const isLocked = !previousConfirmed && index > 0;
                      const prevLegInfo = previousLegId ? getLegInfo(previousLegId) : null;
                      const lockedMessage = isLocked && prevLegInfo 
                        ? `Confirm your ${prevLegInfo.label} flight first to see ${legInfo.label} options` 
                        : "";

                      return (
                        <TabsContent key={legId} value={legId} className="mt-4">
                          <FlightLegResults
                            legId={legId}
                            legLabel={legInfo.label}
                            origin={legInfo.origin}
                            destination={legInfo.destination}
                            date={legInfo.date}
                            flights={result.flights}
                            isLoading={result.isLoading}
                            error={result.error}
                            selectedFlightId={selectedForLeg?.flight.id || null}
                            onSelectFlight={(flight) => handleSelectFlight(legId, legInfo.label, flight, legInfo.origin, legInfo.destination, legInfo.date)}
                            onConfirmSelection={() => handleConfirmLeg(legId)}
                            onRetry={() => retryLeg(legId, legInfo.origin, legInfo.destination, legInfo.date)}
                            isAvoidedAirline={isAvoidedAirline}
                            formatTime={formatTime}
                            formatDate={formatDate}
                            isLocked={isLocked}
                            lockedMessage={lockedMessage}
                            passengers={passengers}
                            isConfirmed={isConfirmed}
                            canGoBack={index > 0}
                            onGoBack={() => handleGoBackToLeg(legId)}
                            nextLegLabel={nextLegLabel || undefined}
                          />
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}

                {/* One-way: No tabs needed, just show results */}
                {tripType === "oneway" && Object.entries(legResults).map(([legId, result]) => {
                  const legInfo = getLegInfo(legId);
                  const selectedForLeg = selectedFlights.find(s => s.legId === legId);
                  const isConfirmed = confirmedLegs.includes(legId);
                  
                  return (
                    <div key={legId} id={`leg-${legId}`}>
                      <FlightLegResults
                        legId={legId}
                        legLabel={legInfo.label}
                        origin={legInfo.origin}
                        destination={legInfo.destination}
                        date={legInfo.date}
                        flights={result.flights}
                        isLoading={result.isLoading}
                        error={result.error}
                        selectedFlightId={selectedForLeg?.flight.id || null}
                        onSelectFlight={(flight) => handleSelectFlight(legId, legInfo.label, flight, legInfo.origin, legInfo.destination, legInfo.date)}
                        onConfirmSelection={() => handleConfirmLeg(legId)}
                        onRetry={() => retryLeg(legId, legInfo.origin, legInfo.destination, legInfo.date)}
                        isAvoidedAirline={isAvoidedAirline}
                        formatTime={formatTime}
                        formatDate={formatDate}
                        isLocked={false}
                        lockedMessage=""
                        passengers={passengers}
                        isConfirmed={isConfirmed}
                        canGoBack={false}
                        nextLegLabel={undefined}
                      />
                    </div>
                  );
                })}
              </div>}
          </div>

          {/* Right column - Selection Cart (desktop) */}
          {hasResults && !isMobile && <div className="w-80 flex-shrink-0">
              <FlightSelectionCart
                tripType={tripType}
                selections={selectedFlights}
                onRemoveSelection={handleRemoveSelection}
                onChangeSelection={handleChangeSelection}
                onContinueToGoogle={handleContinueToGoogle}
                isComplete={isSelectionComplete}
                totalPrice={totalPrice}
                passengerCount={passengers}
                cabinClass={cabinClass}
                isMobile={false}
              />
            </div>}
        </div>

        {/* Mobile Selection Cart */}
        {hasResults && isMobile && <FlightSelectionCart
            tripType={tripType}
            selections={selectedFlights}
            onRemoveSelection={handleRemoveSelection}
            onChangeSelection={handleChangeSelection}
            onContinueToGoogle={handleContinueToGoogle}
            isComplete={isSelectionComplete}
            totalPrice={totalPrice}
            passengerCount={passengers}
            cabinClass={cabinClass}
            isMobile={true}
          />}

        {/* Price Alert Dialog */}
        <PriceAlertDialog open={priceAlertOpen} onOpenChange={setPriceAlertOpen} origin={origin} destination={destination} departureDate={departDate} returnDate={tripType === "roundtrip" ? returnDate : undefined} currentPrice={selectedFlights[0]?.flight.price || 0} passengers={passengers} />
      </div>
    </AppLayout>;
};

export default Flights;
