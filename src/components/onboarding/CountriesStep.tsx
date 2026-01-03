import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Plus, X, Globe, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAllCountries, type CountryOption } from "@/lib/countriesData";
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
import { cn } from "@/lib/utils";

interface CountriesStepProps {
  familyMembers: Array<{ id: string; name: string }>;
}

interface AddedCountry {
  id: string;
  name: string;
  flag: string;
  continent: string;
  visitedBy: string[];
}

const allCountries = getAllCountries();

const CountriesStep = ({ familyMembers }: CountriesStepProps) => {
  const [countries, setCountries] = useState<AddedCountry[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    const { data: countriesData } = await supabase
      .from("countries")
      .select("*")
      .order("name");

    if (countriesData) {
      const { data: visitsData } = await supabase
        .from("country_visits")
        .select("country_id, family_member_id");

      const countriesWithVisits = countriesData.map((country) => {
        const visits = visitsData?.filter((v) => v.country_id === country.id) || [];
        return {
          ...country,
          visitedBy: visits.map((v) => v.family_member_id).filter(Boolean) as string[],
        };
      });

      setCountries(countriesWithVisits);
    }
  };

  const handleAddCountry = async () => {
    if (!selectedCountry) return;

    // Check if already added
    if (countries.some((c) => c.name === selectedCountry.name)) {
      toast({ title: "Country already added", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: newCountry, error } = await supabase
        .from("countries")
        .insert([{
          name: selectedCountry.name,
          flag: selectedCountry.flag,
          continent: selectedCountry.continent,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add visits for selected members
      if (newCountry && selectedMembers.length > 0) {
        const visits = selectedMembers.map((memberId) => ({
          country_id: newCountry.id,
          family_member_id: memberId,
          user_id: user.id,
        }));

        await supabase.from("country_visits").insert(visits);
      }

      setCountries([...countries, { ...newCountry, visitedBy: selectedMembers }]);
      setSelectedCountry(null);
      setSelectedMembers([]);
      setComboboxOpen(false);
      toast({ title: `${selectedCountry.name} added!` });
    } catch (error) {
      toast({ title: "Failed to add country", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCountry = async (countryId: string) => {
    // Delete visits first, then country
    await supabase.from("country_visits").delete().eq("country_id", countryId);
    await supabase.from("country_visit_details").delete().eq("country_id", countryId);
    await supabase.from("city_visits").delete().eq("country_id", countryId);
    const { error } = await supabase.from("countries").delete().eq("id", countryId);
    
    if (!error) {
      setCountries(countries.filter((c) => c.id !== countryId));
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between"
            >
              {selectedCountry ? (
                <span className="flex items-center gap-2">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.name}</span>
                </span>
              ) : (
                "Select a country..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {allCountries
                    .filter((c) => !countries.some((added) => added.name === c.name))
                    .map((country) => (
                      <CommandItem
                        key={country.code}
                        value={country.name}
                        onSelect={() => {
                          setSelectedCountry(country);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCountry?.name === country.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="mr-2">{country.flag}</span>
                        <span>{country.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {country.continent}
                        </span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedCountry && familyMembers.length > 0 && (
          <div className="p-3 border rounded-lg space-y-2">
            <Label className="text-sm text-muted-foreground">Who visited?</Label>
            <div className="flex flex-wrap gap-2">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleMember(member.id)}
                  />
                  <label htmlFor={`member-${member.id}`} className="text-sm cursor-pointer">
                    {member.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleAddCountry}
          disabled={loading || !selectedCountry}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Country
        </Button>
      </div>

      {countries.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">
            Added Countries ({countries.length})
          </Label>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2 pr-4">
              {countries.map((country) => (
                <Card key={country.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{country.flag}</span>
                      <div>
                        <p className="font-medium">{country.name}</p>
                        <p className="text-xs text-muted-foreground">{country.continent}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {country.visitedBy.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {country.visitedBy.length} {country.visitedBy.length === 1 ? "visitor" : "visitors"}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCountry(country.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {countries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Add countries you've visited</p>
          <p className="text-sm">You can fill in details later</p>
        </div>
      )}
    </div>
  );
};

export default CountriesStep;
