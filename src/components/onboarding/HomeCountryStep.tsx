import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Home, Search, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { cn } from "@/lib/utils";

interface HomeCountryStepProps {
  onHomeCountryChange: (country: string | null) => void;
}

const HomeCountryStep = ({ onHomeCountryChange }: HomeCountryStepProps) => {
  const [countries, setCountries] = useState<{ id: string; name: string; flag: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      const { data } = await supabase
        .from("countries")
        .select("id, name, flag")
        .order("name", { ascending: true });
      
      if (data) {
        setCountries(data);
      }
    };

    const fetchExistingHomeCountry = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("home_country")
        .eq("id", user.id)
        .single();

      if (profile?.home_country) {
        setSelectedCountry(profile.home_country);
        onHomeCountryChange(profile.home_country);
      }
    };

    fetchCountries();
    fetchExistingHomeCountry();
  }, []);

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

  const selectedCountryData = countries.find(c => c.name === selectedCountry);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Home className="w-4 h-4" />
        <span className="text-sm">Select your home country - it will be shown on the map but won't count towards your travel stats.</span>
      </div>

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
                  <span className="text-xl">{selectedCountryData.flag}</span>
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
                  {countries.map((country) => (
                    <CommandItem
                      key={country.id}
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
                      <span className="mr-2 text-lg">{country.flag}</span>
                      <span>{country.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedCountry && (
        <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <Home className="w-5 h-5 text-primary" />
          <span className="text-sm">
            Home country set to: <strong>{selectedCountry}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default HomeCountryStep;
