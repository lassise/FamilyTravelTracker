import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Home, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HomeCountryStepProps {
  onHomeCountryChange: (country: string | null) => void;
}

const HomeCountryStep = ({ onHomeCountryChange }: HomeCountryStepProps) => {
  const [countries, setCountries] = useState<{ id: string; name: string; flag: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

    // Save to profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ home_country: countryName })
        .eq("id", user.id);
    }
  };

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Home className="w-4 h-4" />
        <span className="text-sm">Select your home country - it will be shown on the map but won't count towards your travel stats.</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search countries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[240px] rounded-md border p-2">
        <div className="grid grid-cols-2 gap-2">
          {filteredCountries.map((country) => (
            <Button
              key={country.id}
              variant={selectedCountry === country.name ? "default" : "outline"}
              className="justify-start h-auto py-2 px-3"
              onClick={() => handleSelectCountry(country.name)}
            >
              <span className="mr-2 text-lg">{country.flag}</span>
              <span className="truncate text-sm">{country.name}</span>
              {selectedCountry === country.name && (
                <Check className="ml-auto h-4 w-4 flex-shrink-0" />
              )}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {selectedCountry && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Home className="w-4 h-4 text-primary" />
          <span className="text-sm">
            Home country: <strong>{selectedCountry}</strong>
          </span>
        </div>
      )}
    </div>
  );
};

export default HomeCountryStep;
