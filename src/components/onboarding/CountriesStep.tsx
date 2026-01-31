import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, Globe, Check, Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAllCountries, type CountryOption, getEffectiveFlagCode } from "@/lib/countriesData";
import { cn } from "@/lib/utils";
import CountryFlag from "@/components/common/CountryFlag";

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

const allCountriesList = getAllCountries();

const CountriesStep = ({ familyMembers }: CountriesStepProps) => {
  const [countries, setCountries] = useState<AddedCountry[]>([]);
  const [selectedCountryNames, setSelectedCountryNames] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbFamilyMembers, setDbFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  const effectiveMembers = familyMembers.length > 0 ? familyMembers : dbFamilyMembers;

  // Filter countries by search and exclude already-added
  const availableCountries = useMemo(() => {
    const addedNames = new Set(countries.map((c) => c.name));
    const query = searchQuery.trim().toLowerCase();
    return allCountriesList.filter((c) => {
      if (addedNames.has(c.name)) return false;
      if (!query) return true;
      return c.name.toLowerCase().includes(query) || c.continent.toLowerCase().includes(query);
    });
  }, [countries, searchQuery]);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from("family_members")
        .select("id, name")
        .order("created_at", { ascending: true });
      if (data) setDbFamilyMembers(data);
    };
    fetchMembers();
  }, [familyMembers]);

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

  const toggleCountry = (countryName: string) => {
    setSelectedCountryNames((prev) => {
      const next = new Set(prev);
      if (next.has(countryName)) {
        next.delete(countryName);
      } else {
        next.add(countryName);
      }
      return next;
    });
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const selectAllMembers = () => {
    if (selectedMembers.length === effectiveMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(effectiveMembers.map((m) => m.id));
    }
  };

  const handleSaveSelected = async () => {
    if (selectedCountryNames.size === 0) {
      toast({ title: "Select at least one country", variant: "destructive" });
      return;
    }

    const membersToVisit =
      effectiveMembers.length === 1 ? [effectiveMembers[0].id] : selectedMembers;
    if (membersToVisit.length === 0) {
      toast({ title: "Select who visited these countries", variant: "destructive" });
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

      const toAdd = allCountriesList.filter((c) => selectedCountryNames.has(c.name));
      const inserts = toAdd.map((c) => ({
        name: c.name,
        flag: c.flag,
        continent: c.continent,
        user_id: user.id,
      }));

      const { data: insertedCountries, error: countriesError } = await supabase
        .from("countries")
        .insert(inserts)
        .select();

      if (countriesError) throw countriesError;

      const newCountries: AddedCountry[] = (insertedCountries || []).map((c) => ({
        ...c,
        visitedBy: membersToVisit,
      }));

      if (newCountries.length > 0) {
        const visits = newCountries.flatMap((c) =>
          membersToVisit.map((memberId) => ({
            country_id: c.id,
            family_member_id: memberId,
            user_id: user.id,
          }))
        );
        await supabase.from("country_visits").insert(visits);
      }

      setCountries((prev) => [...prev, ...newCountries]);
      setSelectedCountryNames(new Set());
      setSelectedMembers([]);
      toast({ title: `${toAdd.length} countr${toAdd.length === 1 ? "y" : "ies"} added! Add trip details later for analytics and achievements.` });
    } catch (error) {
      toast({ title: "Failed to save countries", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCountry = async (countryId: string) => {
    await supabase.from("country_visits").delete().eq("country_id", countryId);
    await supabase.from("country_visit_details").delete().eq("country_id", countryId);
    await supabase.from("city_visits").delete().eq("country_id", countryId);
    const { error } = await supabase.from("countries").delete().eq("id", countryId);

    if (!error) {
      setCountries((prev) => prev.filter((c) => c.id !== countryId));
    }
  };

  if (effectiveMembers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg bg-muted/30">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Add travelers first</p>
        <p className="text-sm mt-1">Go back to the previous step and add yourself (and anyone else traveling) before adding countries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Who visited section - required: tracks which family members have been where */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Who visited the selected countries? (Required)</Label>
        <div className="flex flex-wrap gap-3 p-3 rounded-lg border bg-muted/30">
          {effectiveMembers.length === 1 ? (
            <span className="text-sm text-muted-foreground">Solo traveler — all countries will be added for you.</span>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={selectAllMembers} className="h-8 text-xs">
                {selectedMembers.length === effectiveMembers.length ? "Deselect all" : "Select all"}
              </Button>
              {effectiveMembers.map((member) => (
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
            </>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search countries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Country checkboxes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Check countries you&apos;ve visited</Label>
        <ScrollArea className="h-[220px] rounded-lg border p-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-3">
            {availableCountries.map((country) => {
              const isSelected = selectedCountryNames.has(country.name);
              const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
              return (
                <label
                  key={country.code}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleCountry(country.name)}
                  />
                  <span className="inline-flex shrink-0">
                    {isSubdivision || code ? (
                      <CountryFlag countryCode={code} countryName={country.name} size="sm" />
                    ) : (
                      <span className="text-base">{country.flag}</span>
                    )}
                  </span>
                  <span className="text-sm truncate flex-1">{country.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{country.continent}</span>
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {selectedCountryNames.size > 0 && (
        <Button
          onClick={handleSaveSelected}
          disabled={loading || (effectiveMembers.length > 1 && selectedMembers.length === 0)}
          className="w-full"
        >
          <Check className="w-4 h-4 mr-2" />
          {loading ? "Saving..." : `Save ${selectedCountryNames.size} countr${selectedCountryNames.size === 1 ? "y" : "ies"}`}
        </Button>
      )}

      {/* Already added */}
      {countries.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Added ({countries.length})</Label>
          <ScrollArea className="h-[140px]">
            <div className="space-y-1 pr-4">
              {countries.map((country) => (
                <Card key={country.id}>
                  <CardContent className="p-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex shrink-0">
                        {(() => {
                          const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                          return isSubdivision || code ? (
                            <CountryFlag countryCode={code} countryName={country.name} size="sm" />
                          ) : null;
                        })()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{country.name}</p>
                        <p className="text-xs text-muted-foreground">{country.continent}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {country.visitedBy.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {country.visitedBy.length} visited
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCountry(country.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

      {countries.length === 0 && selectedCountryNames.size === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Check countries above, select who visited, then click Save. Add trip details later for analytics and achievements.
        </p>
      )}
    </div>
  );
};

export default CountriesStep;
