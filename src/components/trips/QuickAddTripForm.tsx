import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown, Zap, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAllCountries, type CountryOption } from "@/lib/countriesData";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import CountryFlag from "@/components/common/CountryFlag";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useTrips";
import { useTripLegs } from "@/hooks/useTripLegs";
import type { Trip } from "@/hooks/useTrips";

const allCountries = getAllCountries();

interface FamilyMember {
  id: string;
  name: string;
}

interface QuickAddTripFormProps {
  familyMembers: FamilyMember[];
  onSuccess: (trip: Trip, familyMemberIds: string[]) => void;
  onBack: () => void;
}

/**
 * Quick Add: country + family members only. Creates Trip + one TripLeg + country_visits
 * so the country appears in the tracker. Uses today as placeholder leg date (required by DB).
 */
export const QuickAddTripForm = ({ familyMembers, onSuccess, onBack }: QuickAddTripFormProps) => {
  const { user } = useAuth();
  const { createTrip } = useTrips();
  const { createLegs, calculateTripDatesFromLegs } = useTripLegs();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (familyMembers.length === 1) {
      setSelectedMemberIds(familyMembers.map((m) => m.id));
    }
  }, [familyMembers]);

  const ensureCountryExists = async (): Promise<string | null> => {
    if (!user || !selectedCountry) return null;
    const { data: existing } = await supabase
      .from("countries")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", selectedCountry.name)
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id;
    const { data: inserted, error } = await supabase
      .from("countries")
      .insert({
        name: selectedCountry.name,
        flag: selectedCountry.code.toUpperCase(),
        continent: selectedCountry.continent,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (error) {
      console.error("ensureCountryExists:", error);
      return null;
    }
    return inserted?.id ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCountry || selectedMemberIds.length === 0) {
      toast({
        title: "Validation",
        description: "Select a country and at least one family member.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const countryId = await ensureCountryExists();
      if (!countryId) {
        toast({ title: "Could not save country", variant: "destructive" });
        setLoading(false);
        return;
      }
      for (const memberId of selectedMemberIds) {
        const { error: cvError } = await supabase.from("country_visits").insert({
          country_id: countryId,
          family_member_id: memberId,
          user_id: user.id,
        });
        if (cvError && cvError.code !== "23505") {
          console.error("country_visits insert:", cvError);
        }
      }
      const today = new Date().toISOString().slice(0, 10);
      const title = `${selectedCountry.name} Trip`;
      const { data: trip, error: tripError } = await createTrip({
        title,
        destination: selectedCountry.name,
        start_date: today,
        end_date: today,
        status: "completed",
      });
      if (tripError || !trip) {
        toast({ title: "Failed to create trip", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error: legsError } = await createLegs([
        {
          trip_id: trip.id,
          country_id: countryId,
          country_name: selectedCountry.name,
          country_code: selectedCountry.code.toUpperCase(),
          start_date: today,
          end_date: today,
          order_index: 0,
        },
      ]);
      if (legsError) {
        toast({ title: "Trip created but leg failed", variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "Trip saved!" });
      onSuccess(trip, selectedMemberIds);
    } catch (err) {
      console.error("QuickAddTripForm submit:", err);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="flex flex-row items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Add
          </CardTitle>
          <CardDescription>Country and who went. Add dates later from the trip page.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Country</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <CountryFlag countryCode={selectedCountry.code} countryName={selectedCountry.name} size="sm" />
                      {selectedCountry.name}
                    </span>
                  ) : (
                    "Select country..."
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
                      {allCountries.map((c) => (
                        <CommandItem
                          key={c.code}
                          value={c.name}
                          onSelect={() => {
                            setSelectedCountry(c);
                            setComboboxOpen(false);
                          }}
                        >
                          <CountryFlag countryCode={c.code} countryName={c.name} size="sm" className="mr-2" />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Who went?</Label>
            <div className="grid grid-cols-2 gap-2">
              {familyMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`qm-${m.id}`}
                    checked={selectedMemberIds.includes(m.id)}
                    onCheckedChange={() => toggleMember(m.id)}
                  />
                  <label htmlFor={`qm-${m.id}`} className="text-sm cursor-pointer">
                    {m.name}
                  </label>
                </div>
              ))}
            </div>
            {familyMembers.length === 0 && (
              <p className="text-sm text-muted-foreground">Add family members in Profile first.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={loading || !selectedCountry || selectedMemberIds.length === 0}>
              {loading ? "Saving..." : "Save Trip"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
