
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Home, Check, ChevronsUpDown, Plane, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAllCountries, getEffectiveFlagCode } from "@/lib/countriesData";
import { searchAirports, type Airport } from "@/lib/airportsData";
import CountryFlag from "@/components/common/CountryFlag";

interface HomeCountryStepProps {
  onHomeCountryChange: (country: string | null) => void;
}

const HomeCountryStep = ({ onHomeCountryChange }: HomeCountryStepProps) => {
  const countries = getAllCountries();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Airport state
  const [homeAirport, setHomeAirport] = useState<Airport | null>(null);
  const [airportQuery, setAirportQuery] = useState("");
  const [airportResults, setAirportResults] = useState<Airport[]>([]);
  const [showAirportResults, setShowAirportResults] = useState(false);
  const [savingAirport, setSavingAirport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchExistingData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("home_country, home_airports")
        .eq("id", user.id)
        .single();

      if (profile?.home_country) {
        setSelectedCountry(profile.home_country);
        onHomeCountryChange(profile.home_country);
      }

      // Parse home airport
      if (profile?.home_airports) {
        try {
          // Assuming array of airports or single object
          const airports = Array.isArray(profile.home_airports)
            ? profile.home_airports
            : [profile.home_airports];

          const primary = (airports as any[]).find((a: any) => a.isPrimary) || (airports as any[])[0];
          if (primary) {
            setHomeAirport({
              code: primary.code,
              name: primary.name,
              city: primary.city || "",
              country: primary.country || ""
            } as Airport);
          }
        } catch (e) {
          console.error("Error parsing home airports", e);
        }
      }
    };

    fetchExistingData();
  }, [onHomeCountryChange]);

  const handleSelectCountry = async (countryName: string) => {
    setSelectedCountry(countryName);
    onHomeCountryChange(countryName);
    setOpen(false);

    // Save to profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ home_country: countryName })
        .eq("id", user.id);
    }
  };

  const handleAirportSearch = (value: string) => {
    setAirportQuery(value);
    if (value.length >= 2) {
      setAirportResults(searchAirports(value));
      setShowAirportResults(true);
    } else {
      setShowAirportResults(false);
    }
  };

  const handleSelectAirport = async (airport: Airport) => {
    setSavingAirport(true);
    setHomeAirport(airport);
    setAirportQuery("");
    setShowAirportResults(false);

    // Save to profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const airportJson = [{
        code: airport.code,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        isPrimary: true
      }];

      await supabase
        .from("profiles")
        .update({ home_airports: airportJson as any })
        .eq("id", user.id);

      // Also update flight_preferences if it exists
      // We do this silently as it might fail if row doesn't exist, but that's fine
      const { error } = await supabase
        .from("flight_preferences")
        .update({ home_airports: airportJson as any })
        .eq("user_id", user.id);

      if (error) {
        // If update failed (likely no row), try insert
        await supabase
          .from("flight_preferences")
          .insert({
            user_id: user.id,
            home_airports: airportJson as any
          });
      }

      toast({
        title: "Home airport saved",
        description: `${airport.code} - ${airport.city} set as your home airport`,
      });
    }
    setSavingAirport(false);
  };

  const clearAirport = async () => {
    setHomeAirport(null);
    setAirportQuery("");

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ home_airports: [] as any })
        .eq("id", user.id);
    }
  };

  const selectedCountryData = countries.find(c => c.name === selectedCountry);

  return (
    <div className="space-y-8">
      {/* Country Selection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium text-foreground">Where do you live?</span>
        </div>
        <p className="text-sm text-muted-foreground">Select your home country. It will be shown on map but excluded from 'visited' stats.</p>

        <div className="space-y-2">
          <Label htmlFor="home-country">Home Country</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-12 text-left font-normal"
              >
                {selectedCountryData ? (
                  <span className="flex items-center gap-2">
                    {(() => {
                      const { code, isSubdivision } = getEffectiveFlagCode(selectedCountryData.name, selectedCountryData.flag);
                      return isSubdivision || code ? (
                        <CountryFlag countryCode={code} countryName={selectedCountryData.name} size="md" />
                      ) : (
                        <span className="text-xl">{selectedCountryData.flag}</span>
                      );
                    })()}
                    <span>{selectedCountryData.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select a country...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search countries..." />
                <CommandList>
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto">
                    {countries.map((country) => {
                      const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                      return (
                        <CommandItem
                          key={country.code}
                          value={country.name}
                          onSelect={() => handleSelectCountry(country.name)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCountry === country.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="mr-2 text-lg inline-flex items-center">
                            {isSubdivision || code ? (
                              <CountryFlag countryCode={code} countryName={country.name} size="md" />
                            ) : (
                              country.flag
                            )}
                          </span>
                          <span>{country.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Airport Selection */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Plane className="w-4 h-4" />
          <span className="text-sm font-medium text-foreground">Nearest Major Airport</span>
        </div>
        <p className="text-sm text-muted-foreground">We'll use this to find flight deals and plan itineraries starting from home.</p>

        <div className="space-y-2 relative">
          <Label htmlFor="home-airport">Home Airport</Label>
          {homeAirport ? (
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Plane className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {homeAirport.code}
                    <span className="text-xs font-normal text-muted-foreground px-1.5 py-0.5 bg-muted rounded">Primary</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{homeAirport.city}, {homeAirport.country}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearAirport} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search by city or airport code (e.g. London, JFK)"
                value={airportQuery}
                onChange={(e) => handleAirportSearch(e.target.value)}
                className="h-12"
              />
              {showAirportResults && (
                <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-60 overflow-auto border-border">
                  {airportResults.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      <Plane className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No airports found</p>
                      <p className="text-xs mt-1">Try searching by city name or airport code</p>
                    </div>
                  ) : (
                    airportResults.map((airport) => (
                      <button
                        key={airport.code}
                        className="w-full px-4 py-3 text-left hover:bg-muted flex items-center justify-between group transition-colors"
                        onClick={() => handleSelectAirport(airport)}
                      >
                        <div>
                          <span className="font-bold mr-2">{airport.code}</span>
                          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{airport.city} ({airport.name})</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{airport.country}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedCountry && (
        <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-bottom-2">
          <Home className="w-5 h-5 text-primary" />
          <span className="text-sm">
            Home base set to: <strong>{selectedCountry}</strong>
            {homeAirport && <span> near <strong>{homeAirport.code}</strong></span>}
          </span>
        </div>
      )}
    </div>
  );
};

export default HomeCountryStep;
