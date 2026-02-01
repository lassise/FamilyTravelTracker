import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown, FileText, ArrowLeft, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAllCountries, type CountryOption } from "@/lib/countriesData";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CountryFlag from "@/components/common/CountryFlag";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useTrips";
import { useTripLegs } from "@/hooks/useTripLegs";
import type { Trip } from "@/hooks/useTrips";
import { differenceInDays, parseISO } from "date-fns";

const allCountries = getAllCountries();

interface FamilyMember {
  id: string;
  name: string;
}

interface FullTripFormProps {
  familyMembers: FamilyMember[];
  /** When set, we're adding another leg to this trip (pre-fill family from here). */
  existingTripId?: string | null;
  /** Full trip object when in add-leg mode (so we can pass it back on success). */
  existingTrip?: Trip | null;
  /** Pre-selected family member IDs (e.g. from parent trip when adding a leg). */
  initialFamilyMemberIds?: string[];
  onSuccess: (trip: Trip, familyMemberIds: string[]) => void;
  onBack: () => void;
  /** Label for back/context (e.g. "Leg 2" when adding another country). */
  modeLabel?: string;
}

/**
 * Full form: country + family + dates + notes. Creates Trip + one TripLeg (or just TripLeg when existingTripId).
 * When existingTripId is set, pre-fills family from initialFamilyMemberIds and only creates a new leg.
 */
export const FullTripForm = ({
  familyMembers,
  existingTripId,
  existingTrip,
  initialFamilyMemberIds = [],
  onSuccess,
  onBack,
  modeLabel,
}: FullTripFormProps) => {
  const { user } = useAuth();
  const { createTrip, updateTrip } = useTrips();
  const { createLegs, fetchLegsForTrip, calculateTripDatesFromLegs } = useTripLegs();
  const { toast } = useToast();
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(initialFamilyMemberIds);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAddLegMode = Boolean(existingTripId);

  useEffect(() => {
    if (initialFamilyMemberIds.length > 0) {
      setSelectedMemberIds(initialFamilyMemberIds);
    } else if (familyMembers.length === 1) {
      setSelectedMemberIds(familyMembers.map((m) => m.id));
    }
  }, [familyMembers, initialFamilyMemberIds]);

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
    const legStart = startDate || new Date().toISOString().slice(0, 10);
    const legEnd = endDate || legStart;
    if (new Date(legEnd) < new Date(legStart)) {
      toast({ title: "End date must be on or after start date", variant: "destructive" });
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

      if (isAddLegMode && existingTripId) {
        const { data: legs, error: legsFetchError } = await fetchLegsForTrip(existingTripId);
        if (legsFetchError) {
          toast({ title: "Could not load trip legs", variant: "destructive" });
          setLoading(false);
          return;
        }
        const existingLegs = legs ?? [];
        const orderIndex = existingLegs.length;
        const { data: newLeg, error: legError } = await createLegs([
          {
            trip_id: existingTripId,
            country_id: countryId,
            country_name: selectedCountry.name,
            country_code: (selectedCountry.code ?? "").toString().toUpperCase(),
            start_date: legStart,
            end_date: legEnd,
            order_index: orderIndex,
            notes: notes.trim() || null,
          },
        ]);
        if (legError || !newLeg?.[0]) {
          toast({ title: "Failed to add leg", variant: "destructive" });
          setLoading(false);
          return;
        }
        const allLegs = [...existingLegs, newLeg[0]];
        const { start_date, end_date } = calculateTripDatesFromLegs(allLegs);
        const newDestination = [...new Set([...existingLegs.map((l) => l.country_name), selectedCountry.name])].join(" + ");
        const { data: updatedTrip, error: updateErr } = await updateTrip(existingTripId, {
          start_date: start_date ?? undefined,
          end_date: end_date ?? undefined,
          destination: newDestination,
        });
        if (updateErr) {
          toast({ title: "Leg added but trip update failed", variant: "destructive" });
          setLoading(false);
          return;
        }
        toast({ title: "Country added to trip!" });
        onSuccess(updatedTrip ?? existingTrip ?? ({ id: existingTripId } as Trip), selectedMemberIds);
        return;
      }

      const title = `${selectedCountry.name} Trip`;
      const { data: trip, error: tripError } = await createTrip({
        title,
        destination: selectedCountry.name,
        start_date: legStart,
        end_date: legEnd,
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
          start_date: legStart,
          end_date: legEnd,
          order_index: 0,
          notes: notes.trim() || null,
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
      console.error("FullTripForm submit:", err);
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

  const days = startDate && endDate ? differenceInDays(parseISO(endDate), parseISO(startDate)) + 1 : null;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="flex flex-row items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <CardTitle className="flex items-center gap-2">
            {isAddLegMode ? <Globe className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {modeLabel || "Add with Details"}
          </CardTitle>
          <CardDescription>
            {isAddLegMode
              ? "Add another country to this trip (same trip, different leg)."
              : "Country, who went, dates, and notes."}
          </CardDescription>
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
                    id={`fm-${m.id}`}
                    checked={selectedMemberIds.includes(m.id)}
                    onCheckedChange={() => toggleMember(m.id)}
                  />
                  <label htmlFor={`fm-${m.id}`} className="text-sm cursor-pointer">
                    {m.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {days != null && days > 0 && (
            <p className="text-sm text-muted-foreground">{days} day{days !== 1 ? "s" : ""}</p>
          )}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input
              placeholder="e.g. Highlights, accommodation"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit" disabled={loading || !selectedCountry || selectedMemberIds.length === 0}>
              {loading ? "Saving..." : isAddLegMode ? "Add Country to Trip" : "Save Trip"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
