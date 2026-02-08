import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAllCountries, getEffectiveFlagCode, getCountryCode } from "@/lib/countriesData";
import CountryFlag from "@/components/common/CountryFlag";
import { Plus, Trash2, GripVertical, ChevronsUpDown, Check, MapPin, Calendar, ChevronUp, ChevronDown } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";

export interface TripLegDraft {
  id: string; // temporary ID for UI tracking
  country_name: string;
  country_code: string | null;
  start_date: string;
  end_date: string;
  duration_days?: number;
  cities: string[];
  notes: string;
}

interface TripLegEditorProps {
  legs: TripLegDraft[];
  onLegsChange: (legs: TripLegDraft[]) => void;
  minDate?: string;
  hasDates?: boolean;
  hideDateInputs?: boolean;
  className?: string;
}

const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const calculateDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  try {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  } catch {
    return 0;
  }
};

export const TripLegEditor = ({ legs, onLegsChange, minDate, hasDates = true, hideDateInputs = false, className }: TripLegEditorProps) => {
  const countries = getAllCountries();
  const [newlyAddedLegId, setNewlyAddedLegId] = useState<string | null>(null);

  const addLeg = useCallback(() => {
    // Default new leg starts after the last leg ends
    const lastLeg = legs[legs.length - 1];
    const newStartDate = lastLeg?.end_date || "";

    const newLegId = generateTempId();
    const newLeg: TripLegDraft = {
      id: newLegId,
      country_name: "",
      country_code: null,
      start_date: newStartDate,
      end_date: "",
      duration_days: 7,
      cities: [],
      notes: "",
    };

    // Mark this leg as newly added so it auto-opens country selector
    setNewlyAddedLegId(newLegId);
    onLegsChange([...legs, newLeg]);
  }, [legs, onLegsChange]);

  const removeLeg = useCallback((id: string) => {
    onLegsChange(legs.filter(leg => leg.id !== id));
  }, [legs, onLegsChange]);

  const updateLeg = useCallback((id: string, updates: Partial<TripLegDraft>) => {
    onLegsChange(legs.map(leg =>
      leg.id === id ? { ...leg, ...updates } : leg
    ));
  }, [legs, onLegsChange]);

  const moveLegUp = useCallback((index: number) => {
    if (index <= 0) return;
    const newLegs = [...legs];
    [newLegs[index - 1], newLegs[index]] = [newLegs[index], newLegs[index - 1]];
    onLegsChange(newLegs);
  }, [legs, onLegsChange]);

  const moveLegDown = useCallback((index: number) => {
    if (index >= legs.length - 1) return;
    const newLegs = [...legs];
    [newLegs[index], newLegs[index + 1]] = [newLegs[index + 1], newLegs[index]];
    onLegsChange(newLegs);
  }, [legs, onLegsChange]);

  // Calculate total trip duration
  const tripDates = legs.length > 0 ? {
    start: legs.reduce((min, leg) =>
      leg.start_date && (!min || leg.start_date < min) ? leg.start_date : min,
      ""
    ),
    end: legs.reduce((max, leg) =>
      leg.end_date && (!max || leg.end_date > max) ? leg.end_date : max,
      ""
    ),
  } : { start: "", end: "" };

  const totalDays = tripDates.start && tripDates.end
    ? calculateDays(tripDates.start, tripDates.end)
    : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Trip summary */}
      {legs.length > 0 && totalDays > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {tripDates.start && format(parseISO(tripDates.start), "MMM d")}
              {" – "}
              {tripDates.end && format(parseISO(tripDates.end), "MMM d, yyyy")}
            </span>
          </div>
          <Badge variant="secondary">
            {totalDays} {totalDays === 1 ? "day" : "days"} total
          </Badge>
        </div>
      )}

      {/* Leg cards */}
      <div className="space-y-3">
        {legs.map((leg, index) => (
          <LegCard
            key={leg.id}
            leg={leg}
            index={index}
            totalLegs={legs.length}
            countries={countries}
            previousLegEndDate={index > 0 ? legs[index - 1].end_date : minDate}
            onUpdate={(updates) => updateLeg(leg.id, updates)}
            onRemove={() => removeLeg(leg.id)}
            onMoveUp={() => moveLegUp(index)}
            onMoveDown={() => moveLegDown(index)}
            autoOpenCountry={leg.id === newlyAddedLegId}
            onCountryOpened={() => setNewlyAddedLegId(null)}
            hasDates={hasDates}
            hideDateInputs={hideDateInputs}
          />
        ))}
      </div>

      {/* Add leg button */}
      <Button
        type="button"
        variant="outline"
        onClick={addLeg}
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add {legs.length === 0 ? "Country" : "Another Country"}
      </Button>

      {legs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Add at least one country to your trip
        </p>
      )}
    </div>
  );
};

// Individual leg card component
interface LegCardProps {
  leg: TripLegDraft;
  index: number;
  totalLegs: number;
  countries: { name: string; flag: string; continent: string; code: string }[];
  previousLegEndDate?: string;
  onUpdate: (updates: Partial<TripLegDraft>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  autoOpenCountry?: boolean;
  onCountryOpened?: () => void;
  hasDates?: boolean;
  hideDateInputs?: boolean;
}

const LegCard = ({
  leg,
  index,
  totalLegs,
  countries,
  previousLegEndDate,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  autoOpenCountry,
  onCountryOpened,
  hasDates = true,
  hideDateInputs = false,
}: LegCardProps) => {
  const [countryOpen, setCountryOpen] = useState(false);
  const [cityInput, setCityInput] = useState("");

  // Auto-open country selector for newly added legs
  useEffect(() => {
    if (autoOpenCountry && !leg.country_name) {
      setCountryOpen(true);
      onCountryOpened?.();
    }
  }, [autoOpenCountry, leg.country_name, onCountryOpened]);

  const selectedCountry = countries.find(c => c.name === leg.country_name);
  const days = calculateDays(leg.start_date, leg.end_date);

  const handleSelectCountry = (countryName: string) => {
    const country = countries.find(c => c.name === countryName);
    onUpdate({
      country_name: countryName,
      country_code: country?.code || getCountryCode(countryName) || null,
    });
    setCountryOpen(false);
  };

  const addCity = () => {
    if (cityInput.trim() && !leg.cities.includes(cityInput.trim())) {
      onUpdate({ cities: [...leg.cities, cityInput.trim()] });
      setCityInput("");
    }
  };

  const removeCity = (city: string) => {
    onUpdate({ cities: leg.cities.filter(c => c !== city) });
  };

  // Color palette for different legs
  const legColors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-amber-500",
    "bg-rose-500",
  ];
  const legColor = legColors[index % legColors.length];

  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", legColor)} />

      <CardContent className="p-4">
        {/* Leg header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded text-white", legColor)}>
              {index + 1}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {index === 0 ? "First Country" : `Country ${index + 1}`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === 0}
              onClick={onMoveUp}
              title="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={index === totalLegs - 1}
              onClick={onMoveDown}
              title="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Country selector */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={countryOpen}
                  className="w-full justify-between h-10"
                >
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      {(() => {
                        const { code } = getEffectiveFlagCode(selectedCountry.name, selectedCountry.flag);
                        return code ? (
                          <CountryFlag countryCode={code} countryName={selectedCountry.name} size="sm" />
                        ) : (
                          <span>{selectedCountry.flag}</span>
                        );
                      })()}
                      <span>{selectedCountry.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Select country...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search countries..." />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {countries.map((country) => {
                        const { code } = getEffectiveFlagCode(country.name, country.flag);
                        return (
                          <CommandItem
                            key={country.code}
                            value={country.name}
                            onSelect={() => handleSelectCountry(country.name)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                leg.country_name === country.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {code ? (
                              <CountryFlag countryCode={code} countryName={country.name} size="sm" className="mr-2" />
                            ) : (
                              <span className="mr-2">{country.flag}</span>
                            )}
                            <span>{country.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{country.continent}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {!hideDateInputs && (
            <>
              {/* Date range or Duration */}
              {hasDates ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`start-${leg.id}`} className="text-xs text-muted-foreground">
                      Arrive
                    </Label>
                    <Input
                      id={`start-${leg.id}`}
                      type="date"
                      value={leg.start_date}
                      min={previousLegEndDate || undefined}
                      onChange={(e) => onUpdate({ start_date: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`end-${leg.id}`} className="text-xs text-muted-foreground">
                      Depart
                    </Label>
                    <Input
                      id={`end-${leg.id}`}
                      type="date"
                      value={leg.end_date}
                      min={leg.start_date || undefined}
                      onChange={(e) => onUpdate({ end_date: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor={`duration-${leg.id}`} className="text-xs text-muted-foreground">
                    Approximate Duration (Days)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`duration-${leg.id}`}
                      type="number"
                      min="1"
                      max="90"
                      value={leg.duration_days || 0}
                      onChange={(e) => onUpdate({ duration_days: parseInt(e.target.value) || 0 })}
                      className="h-10 w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
              )}

              {hasDates && days > 0 && (
                <div className="text-xs text-muted-foreground">
                  {days} {days === 1 ? "day" : "days"} in {leg.country_name || "this country"}
                </div>
              )}

              {/* Cities */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cities (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a city..."
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCity();
                      }
                    }}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCity}
                    disabled={!cityInput.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {leg.cities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {leg.cities.map((city: any) => (
                      <Badge key={city} variant="secondary" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {city}
                        <button
                          type="button"
                          onClick={() => removeCity(city)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Remove button */}
        <div className="flex justify-end pt-2 border-t mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card >
  );
};

export default TripLegEditor;
