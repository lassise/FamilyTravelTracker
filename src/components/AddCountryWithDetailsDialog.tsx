import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ChevronsUpDown, Check, CalendarDays, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllCountries, type CountryOption } from "@/lib/countriesData";
import { cn } from "@/lib/utils";
import CountryFlag from "./common/CountryFlag";
import { TravelDatePicker } from "./TravelDatePicker";
import { differenceInDays, parseISO, isAfter } from "date-fns";

const countrySchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().min(2).max(2),
  continent: z.string().min(1),
});

function calculateDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isAfter(start, end)) return null;
  return differenceInDays(end, start) + 1;
}

interface PrefillData {
  countryName?: string;
  countryCode?: string;
  visitDate?: string;
  endDate?: string;
  tripName?: string;
}

interface AddCountryWithDetailsDialogProps {
  familyMembers: Array<{ id: string; name: string }>;
  onSuccess: (newCountryId?: string) => void;
  prefillData?: PrefillData | null;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const allCountries = getAllCountries();
const months = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

const AddCountryWithDetailsDialog = ({ familyMembers, onSuccess, prefillData, externalOpen, onOpenChange }: AddCountryWithDetailsDialogProps) => {
  // Use external open state if provided, otherwise internal
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [tripName, setTripName] = useState("");
  const [isApproximate, setIsApproximate] = useState(false);
  const [approximateMonth, setApproximateMonth] = useState<number | null>(null);
  const [approximateYear, setApproximateYear] = useState<number | null>(null);
  const [visitDate, setVisitDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [numberOfDays, setNumberOfDays] = useState<number | null>(null);
  const [tripMemberIds, setTripMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Handle prefill data when dialog opens
  useEffect(() => {
    if (open && prefillData) {
      // Find matching country from prefillData
      if (prefillData.countryName) {
        const matchedCountry = allCountries.find(
          c => c.name.toLowerCase() === prefillData.countryName?.toLowerCase() ||
            c.code.toLowerCase() === prefillData.countryCode?.toLowerCase()
        );
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
        }
      }

      // Set visit date if provided
      if (prefillData.visitDate) {
        setVisitDate(prefillData.visitDate);
        setIsApproximate(false);
      }

      // Set end date if provided
      if (prefillData.endDate) {
        setEndDate(prefillData.endDate);
      }

      // Set trip name if provided
      if (prefillData.tripName) {
        setTripName(prefillData.tripName);
      }
    }
  }, [open, prefillData]);

  useEffect(() => {
    if (open) {
      setSelectedMembers(familyMembers.length === 1 ? familyMembers.map((m) => m.id) : []);
      setTripMemberIds(familyMembers.length === 1 ? familyMembers.map((m) => m.id) : []);
    }
  }, [open, familyMembers]);

  useEffect(() => {
    if (visitDate && endDate && !isApproximate) {
      const days = calculateDays(visitDate, endDate);
      if (days != null) setNumberOfDays(days);
    }
  }, [visitDate, endDate, isApproximate]);

  const handleCountrySelect = (option: CountryOption) => {
    setSelectedCountry(option);
    setComboboxOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedCountry) {
      toast({ title: "Please select a country", variant: "destructive" });
      setLoading(false);
      return;
    }
    if (familyMembers.length > 0 && selectedMembers.length === 0) {
      toast({ title: "Select who has been here", description: "At least one family member required.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const validated = countrySchema.parse({
        name: selectedCountry.name,
        code: selectedCountry.code.toUpperCase(),
        continent: selectedCountry.continent,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from("countries")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", validated.name)
        .maybeSingle();

      if (existing?.id) {
        toast({ title: "Country already in your list", description: `"${validated.name}" is already added.`, variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: newCountry, error } = await supabase
        .from("countries")
        .insert([{
          name: validated.name,
          flag: validated.code,
          continent: validated.continent,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      const membersToAdd = familyMembers.length === 1 ? familyMembers.map((m) => m.id) : selectedMembers;
      if (membersToAdd.length > 0) {
        const visits = membersToAdd.map((memberId) => ({
          country_id: newCountry.id,
          family_member_id: memberId,
          user_id: user.id,
        }));
        const { error: visitsError } = await supabase.from("country_visits").insert(visits);
        if (visitsError) throw visitsError;
      }

      const hasVisitDetails =
        (tripName?.trim()) ||
        (visitDate && endDate) ||
        (isApproximate && (approximateMonth != null || approximateYear != null)) ||
        (numberOfDays != null && numberOfDays > 0);

      if (hasVisitDetails) {
        const membersForVisit = tripMemberIds.length > 0 ? tripMemberIds : membersToAdd;
        const { error: visitError } = await supabase.rpc("insert_country_visit_detail", {
          p_country_id: newCountry.id,
          p_trip_name: tripName?.trim() || null,
          p_is_approximate: isApproximate,
          p_approximate_month: isApproximate ? approximateMonth : null,
          p_approximate_year: isApproximate ? approximateYear : null,
          p_visit_date: !isApproximate ? visitDate : null,
          p_end_date: !isApproximate ? endDate : null,
          p_number_of_days: numberOfDays ?? undefined,
          p_family_member_ids: membersForVisit.length > 0 ? membersForVisit : null,
          p_cities: null,
        });
        if (visitError) throw visitError;
      }

      toast({ title: "Country and trip details added!" });
      setOpen(false);
      resetForm();
      onSuccess(newCountry.id);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: "Validation error", description: err.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCountry(null);
    setSelectedMembers([]);
    setTripName("");
    setIsApproximate(false);
    setApproximateMonth(null);
    setApproximateYear(null);
    setVisitDate(null);
    setEndDate(null);
    setNumberOfDays(null);
    setTripMemberIds(familyMembers.length === 1 ? familyMembers.map((m) => m.id) : []);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add Country with Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Country with Trip Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Country</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" type="button" className="w-full justify-between">
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <CountryFlag countryCode={selectedCountry.code} countryName={selectedCountry.name} size="sm" />
                      <span>{selectedCountry.name}</span>
                      <span className="text-muted-foreground text-xs">({selectedCountry.continent})</span>
                    </span>
                  ) : (
                    "Select country..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {allCountries.map((opt) => (
                        <CommandItem key={opt.code} value={opt.name} onSelect={() => handleCountrySelect(opt)}>
                          <Check className={cn("mr-2 h-4 w-4", selectedCountry?.name === opt.name ? "opacity-100" : "opacity-0")} />
                          <CountryFlag countryCode={opt.code} countryName={opt.name} size="sm" className="mr-2" />
                          <span>{opt.name}</span>
                          <span className="ml-auto text-muted-foreground text-xs">{opt.continent}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {familyMembers.length > 0 && (
            <div>
              <Label>Who has been here? (Required)</Label>
              <div className="space-y-2 mt-2">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedMembers([...selectedMembers, member.id]);
                        else setSelectedMembers(selectedMembers.filter((id) => id !== member.id));
                      }}
                    />
                    <label className="text-sm cursor-pointer">{member.name}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium text-foreground">Trip details (optional)</h4>

            <div>
              <Label className="text-xs">Trip name</Label>
              <Input
                placeholder="e.g., Summer 2025"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="h-8 text-sm mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs cursor-pointer">Approximate dates</Label>
              <Checkbox checked={isApproximate} onCheckedChange={(c) => setIsApproximate(!!c)} />
            </div>

            {isApproximate ? (
              <div className="flex gap-2">
                <Select value={approximateMonth?.toString() ?? ""} onValueChange={(v) => setApproximateMonth(v ? parseInt(v) : null)}>
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={approximateYear?.toString() ?? ""} onValueChange={(v) => setApproximateYear(v ? parseInt(v) : null)}>
                  <SelectTrigger className="h-8 text-sm w-28">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  Travel dates
                </Label>
                <TravelDatePicker
                  startDate={visitDate}
                  endDate={endDate}
                  onSave={(start, end) => {
                    setVisitDate(start);
                    setEndDate(end);
                  }}
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Days</Label>
              <Input
                type="number"
                min={1}
                value={numberOfDays ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setNumberOfDays(v === "" ? null : parseInt(v) || null);
                }}
                disabled={!isApproximate && !!visitDate && !!endDate}
                className="h-8 text-sm mt-1"
                placeholder="Number of days"
              />
            </div>


          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (familyMembers.length > 1 && selectedMembers.length === 0)}>
              {loading ? "Saving..." : "Add Country & Details"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCountryWithDetailsDialog;
