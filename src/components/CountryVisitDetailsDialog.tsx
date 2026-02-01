import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Plus, Trash2, Clock, X, Edit3, Hash, CalendarDays, ChevronDown, ChevronUp, Users } from "lucide-react";
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
import { getCitiesForCountry } from "@/lib/citiesData";
import { differenceInDays, parseISO, isAfter, format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TravelDatePicker } from "@/components/TravelDatePicker";

// Calculate days between two dates (inclusive)
const calculateDays = (startDate: string | null, endDate: string | null): number | null => {
  if (!startDate || !endDate) return null;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isAfter(start, end)) return null;
  return differenceInDays(end, start) + 1;
};

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
}

// Local state interface for new visits being created
interface NewVisitDraft {
  id: string;
  tripName: string;
  isApproximate: boolean;
  approximateMonth: number | null;
  approximateYear: number | null;
  visitDate: string | null;
  endDate: string | null;
  numberOfDays: number;
  cities: string[];
  familyMemberIds: string[];
}

// Debounced input component for trip name
const TripNameInput = ({ 
  initialValue, 
  onSave 
}: { 
  initialValue: string; 
  onSave: (value: string) => void;
}) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      type="text"
      placeholder="e.g., Trip with In-laws"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialValue) {
          onSave(value);
        }
      }}
      className="h-8 text-sm"
    />
  );
};

// Debounced input component for days
const DaysInput = ({ 
  initialValue, 
  disabled,
  onSave 
}: { 
  initialValue: number; 
  disabled: boolean;
  onSave: (value: number) => void;
}) => {
  const [value, setValue] = useState(initialValue.toString());
  
  useEffect(() => {
    setValue(initialValue.toString());
  }, [initialValue]);

  return (
    <Input
      type="number"
      min={1}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 1 && numValue !== initialValue) {
          onSave(numValue);
        } else if (isNaN(numValue) || numValue < 1) {
          setValue(initialValue.toString());
        }
      }}
      disabled={disabled}
      className={`h-8 text-sm ${disabled ? "bg-muted cursor-not-allowed" : ""}`}
      placeholder="Enter days"
    />
  );
};

interface VisitDetail {
  id: string;
  country_id: string;
  visit_date: string | null;
  end_date: string | null;
  number_of_days: number;
  notes: string | null;
  trip_name: string | null;
  approximate_month?: number | null;
  approximate_year?: number | null;
  is_approximate?: boolean;
}

interface CityVisit {
  id: string;
  country_id: string;
  city_name: string;
  visit_date: string | null;
  notes: string | null;
}

interface CountryVisitDetailsDialogProps {
  countryId: string;
  countryName: string;
  countryCode: string;
  onUpdate: () => void;
  buttonLabel?: string;
  /** Pre-select these family member IDs for new visits (e.g. from quick-add country_visits). */
  initialFamilyMemberIds?: string[];
  // Optional controlled props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// City picker component
const CityPicker = ({
  countryCode,
  selectedCities,
  onAddCity,
  onRemoveCity,
}: {
  countryCode: string;
  selectedCities: string[];
  onAddCity: (city: string) => void;
  onRemoveCity: (city: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const cities = getCitiesForCountry(countryCode);

  const filteredCities = cities.filter(
    (city) =>
      city.toLowerCase().includes(searchValue.toLowerCase()) &&
      !selectedCities.includes(city)
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
            <Plus className="w-3 h-3 mr-1" />
            Add cities visited...
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or type city..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              <CommandEmpty>
                {searchValue.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => {
                      onAddCity(searchValue.trim());
                      setSearchValue("");
                      setOpen(false);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add "{searchValue}"
                  </Button>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredCities.map((city) => (
                  <CommandItem
                    key={city}
                    value={city}
                    onSelect={() => {
                      onAddCity(city);
                      setSearchValue("");
                      setOpen(false);
                    }}
                  >
                    <MapPin className="w-3 h-3 mr-2 text-muted-foreground" />
                    {city}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCities.map((city) => (
            <Badge key={city} variant="secondary" className="text-xs py-0.5 px-2">
              <MapPin className="w-2.5 h-2.5 mr-1" />
              {city}
              <button
                onClick={() => onRemoveCity(city)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// New visit draft card component
const NewVisitCard = ({
  draft,
  index,
  countryCode,
  familyMembers,
  onUpdate,
  onRemove,
}: {
  draft: NewVisitDraft;
  index: number;
  countryCode: string;
  familyMembers: FamilyMember[];
  onUpdate: (id: string, updates: Partial<NewVisitDraft>) => void;
  onRemove: (id: string) => void;
}) => {
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const handleDateChange = (startDate: string | null, endDate: string | null) => {
    let numberOfDays = draft.numberOfDays;
    if (startDate && endDate) {
      const calculated = calculateDays(startDate, endDate);
      if (calculated) numberOfDays = calculated;
    }

    onUpdate(draft.id, {
      visitDate: startDate,
      endDate: endDate,
      numberOfDays,
      isApproximate: false,
      approximateMonth: null,
      approximateYear: null,
    });
  };

  const toggleFamilyMember = (memberId: string) => {
    const newIds = draft.familyMemberIds.includes(memberId)
      ? draft.familyMemberIds.filter((id) => id !== memberId)
      : [...draft.familyMemberIds, memberId];
    onUpdate(draft.id, { familyMemberIds: newIds });
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">New Visit #{index + 1}</Badge>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground cursor-pointer">
                Approximate dates
              </Label>
              <Switch
                checked={draft.isApproximate}
                onCheckedChange={(checked) => {
                  onUpdate(draft.id, {
                    isApproximate: checked,
                    visitDate: checked ? null : draft.visitDate,
                    endDate: checked ? null : draft.endDate,
                    approximateMonth: checked ? draft.approximateMonth : null,
                    approximateYear: checked ? draft.approximateYear : null,
                  });
                }}
                className="scale-75"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(draft.id)}
            className="text-destructive hover:text-destructive h-6 w-6 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Trip Name */}
        <div className="mb-3">
          <Label className="text-xs mb-1 block">Trip Name (optional)</Label>
          <Input
            type="text"
            placeholder="e.g., Trip with In-laws"
            value={draft.tripName}
            onChange={(e) => onUpdate(draft.id, { tripName: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-3">
          {draft.isApproximate ? (
            <div>
              <Label className="text-xs mb-1 block flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                Approximate Time
              </Label>
              <div className="flex gap-2">
                <Select
                  value={draft.approximateMonth?.toString() || ""}
                  onValueChange={(value) =>
                    onUpdate(draft.id, { approximateMonth: value ? parseInt(value) : null })
                  }
                >
                  <SelectTrigger className="h-8 text-sm flex-1">
                    <SelectValue placeholder="Month (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={draft.approximateYear?.toString() || ""}
                  onValueChange={(value) =>
                    onUpdate(draft.id, { approximateYear: value ? parseInt(value) : null })
                  }
                >
                  <SelectTrigger className="h-8 text-sm w-28">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs mb-1 block">Travel Dates</Label>
              <TravelDatePicker
                startDate={draft.visitDate}
                endDate={draft.endDate}
                onSave={handleDateChange}
              />
            </div>
          )}

          {/* Days */}
          <div>
            <Label className="text-xs mb-1 block">Days</Label>
            <Input
              type="number"
              min={1}
              value={draft.numberOfDays ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                const numValue = parseInt(value);
                onUpdate(draft.id, {
                  numberOfDays: value === "" ? null : (isNaN(numValue) ? null : numValue),
                });
              }}
              disabled={!draft.isApproximate && !!draft.visitDate && !!draft.endDate}
              className="h-8 text-sm"
              placeholder="Enter days"
            />
          </div>

          {/* Cities */}
          <div>
            <Label className="text-xs mb-1 block flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Cities Visited
            </Label>
            <CityPicker
              countryCode={countryCode}
              selectedCities={draft.cities}
              onAddCity={(city) =>
                onUpdate(draft.id, { cities: [...draft.cities, city] })
              }
              onRemoveCity={(city) =>
                onUpdate(draft.id, { cities: draft.cities.filter((c) => c !== city) })
              }
            />
          </div>

          {/* Family Members */}
          {familyMembers.length > 0 && (
            <div>
              <Label className="text-xs mb-2 block flex items-center gap-1">
                <Users className="w-3 h-3" />
                Who went on this trip? (optional)
              </Label>
              <div className="flex flex-wrap gap-2">
                {familyMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Checkbox
                      checked={draft.familyMemberIds.includes(member.id)}
                      onCheckedChange={() => toggleFamilyMember(member.id)}
                    />
                    <span>{member.avatar}</span>
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const CountryVisitDetailsDialog = ({
  countryId,
  countryName,
  countryCode,
  onUpdate,
  buttonLabel = "Details",
  initialFamilyMemberIds = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CountryVisitDetailsDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled usage
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };

  const [visitDetails, setVisitDetails] = useState<VisitDetail[]>([]);
  const [cityVisits, setCityVisits] = useState<CityVisit[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [visitFamilyMembers, setVisitFamilyMembers] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [newVisits, setNewVisits] = useState<NewVisitDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Record<string, Partial<VisitDetail>>>({});
  const [pendingCityAdditions, setPendingCityAdditions] = useState<string[]>([]);
  const [pendingCityDeletions, setPendingCityDeletions] = useState<string[]>([]);
  const [pendingFamilyMemberChanges, setPendingFamilyMemberChanges] = useState<Record<string, string[]>>({});
  const { toast } = useToast();

  const cities = getCitiesForCountry(countryCode);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [visitsResult, citiesResult, familyResult] = await Promise.all([
        supabase
          .from("country_visit_details")
          .select("*")
          .eq("country_id", countryId)
          .order("visit_date", { ascending: false }),
        supabase
          .from("city_visits")
          .select("*")
          .eq("country_id", countryId)
          .order("city_name", { ascending: true }),
        supabase
          .from("family_members")
          .select("id, name, avatar")
          .order("name", { ascending: true }),
      ]);

      if (visitsResult.error) throw visitsResult.error;
      if (citiesResult.error) throw citiesResult.error;
      if (familyResult.error) throw familyResult.error;

      setVisitDetails(visitsResult.data || []);
      setCityVisits(citiesResult.data || []);
      setFamilyMembers(familyResult.data || []);

      // Fetch visit family member associations
      if (visitsResult.data && visitsResult.data.length > 0) {
        const visitIds = visitsResult.data.map((v) => v.id);
        const { data: vfmData } = await supabase
          .from("visit_family_members")
          .select("visit_id, family_member_id")
          .in("visit_id", visitIds);

        if (vfmData) {
          const mapping: Record<string, string[]> = {};
          vfmData.forEach((item) => {
            if (!mapping[item.visit_id]) mapping[item.visit_id] = [];
            mapping[item.visit_id].push(item.family_member_id);
          });
          setVisitFamilyMembers(mapping);
        }
      }
    } catch (error) {
      console.error("Error fetching visit details:", error);
    } finally {
      setLoading(false);
    }
  }, [countryId]);

  useEffect(() => {
    if (open) {
      fetchData();
      setNewVisits([]);
      setPendingChanges({});
      setPendingCityAdditions([]);
      setPendingCityDeletions([]);
      setPendingFamilyMemberChanges({});
    }
  }, [open, fetchData]);

  /**
   * Creates a new visit draft. Pre-fills familyMemberIds from initialFamilyMemberIds
   * (who already visited this country via quick add) so trip details form has smart defaults.
   */
  const createNewVisitDraft = (preSelectedMemberIds: string[] = []): NewVisitDraft => ({
    id: crypto.randomUUID(),
    tripName: "",
    isApproximate: false,
    approximateMonth: null,
    approximateYear: null,
    visitDate: null,
    endDate: null,
    numberOfDays: 1,
    cities: [],
    familyMemberIds: [...preSelectedMemberIds],
  });

  const handleAddNewVisitDraft = () => {
    setNewVisits((prev) => [...prev, createNewVisitDraft(initialFamilyMemberIds)]);
  };

  const handleUpdateNewVisitDraft = (id: string, updates: Partial<NewVisitDraft>) => {
    setNewVisits((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...updates } : draft))
    );
  };

  const handleRemoveNewVisitDraft = (id: string) => {
    setNewVisits((prev) => prev.filter((draft) => draft.id !== id));
  };

  const handleSaveNewVisits = async () => {
    if (newVisits.length === 0) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Use RPC exclusively (SECURITY DEFINER bypasses RLS)
      // RPC also handles visit_family_members, city_visits, and country_visits
      const knownCities = new Set(cityVisits.map((c) => c.city_name.toLowerCase()));

      for (const draft of newVisits) {
        const newCities = draft.cities.filter(
          (city) => !knownCities.has(city.toLowerCase())
        );
        newCities.forEach((c) => knownCities.add(c.toLowerCase()));

        const membersForVisit =
          draft.familyMemberIds.length > 0 ? draft.familyMemberIds : familyMembers.map((m) => m.id);

        const { data: insertedVisit, error: visitError } = await supabase.rpc(
          "insert_country_visit_detail",
          {
            p_country_id: countryId,
            p_trip_name: draft.tripName || null,
            p_is_approximate: draft.isApproximate,
            p_approximate_month: draft.approximateMonth,
            p_approximate_year: draft.approximateYear,
            p_visit_date: draft.visitDate,
            p_end_date: draft.endDate,
            p_number_of_days: draft.numberOfDays,
            p_family_member_ids: membersForVisit.length > 0 ? membersForVisit : null,
            p_cities: newCities.length > 0 ? newCities : null,
          }
        );

        if (visitError) throw visitError;
        if (!insertedVisit?.id) {
          throw new Error("Insert succeeded but no visit returned");
        }
      }

      toast({ title: `Added ${newVisits.length} visit${newVisits.length > 1 ? "s" : ""}` });
      setNewVisits([]);
      await fetchData();
      onUpdate();
    } catch (error: unknown) {
      console.error("Error saving visits:", error);
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message?: string }).message) : "Error saving visits";
      const hint = error && typeof error === "object" && "hint" in error ? String((error as { hint?: string }).hint) : "";
      toast({
        title: "Error saving visits",
        description: msg + (hint ? ` (${hint})` : ""),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisitFamilyMember = (visitId: string, memberId: string) => {
    const originalMembers = visitFamilyMembers[visitId] || [];
    const pendingMembers = pendingFamilyMemberChanges[visitId];
    
    // Get the current state (original + pending changes)
    const currentMembers = pendingMembers !== undefined 
      ? pendingMembers 
      : originalMembers;
    
    const isCurrentlySelected = currentMembers.includes(memberId);

    // Update pending changes
    setPendingFamilyMemberChanges((prev) => {
      const currentPending = prev[visitId] !== undefined 
        ? prev[visitId] 
        : originalMembers;
      
      const newMembers = isCurrentlySelected
        ? currentPending.filter((id) => id !== memberId)
        : [...currentPending, memberId];
      
      return {
        ...prev,
        [visitId]: newMembers,
      };
    });
  };

  const handleUpdateVisit = async (
    visitId: string,
    field: string,
    value: string | number | null,
    currentVisit?: VisitDetail
  ) => {
    // Store in pending changes instead of saving immediately
    setPendingChanges(prev => {
      const current = prev[visitId] || {};
      const updated = { ...current, [field]: value };

      // Handle date calculations for pending changes
      if (field === "visit_date" || field === "end_date") {
        const visit = visitDetails.find(v => v.id === visitId) || currentVisit;
        if (visit) {
          const newStartDate = field === "visit_date" ? (value as string | null) : (current[field] as string | null) || visit.visit_date;
          const newEndDate = field === "end_date" ? (value as string | null) : (current[field] as string | null) || visit.end_date;

          if (newStartDate && newEndDate) {
            const start = parseISO(newStartDate);
            const end = parseISO(newEndDate);
            if (isAfter(start, end)) {
              toast({ title: "End date must be after start date", variant: "destructive" });
              return prev;
            }
            const calculatedDays = calculateDays(newStartDate, newEndDate);
            if (calculatedDays) {
              updated.number_of_days = calculatedDays;
            }
          }
        }
      }

      return { ...prev, [visitId]: updated };
    });
  };

  const handleSaveVisitChanges = async (visitId: string) => {
    const changes = pendingChanges[visitId];
    if (!changes || Object.keys(changes).length === 0) return;

    const { error } = await supabase
      .from("country_visit_details")
      .update(changes)
      .eq("id", visitId);

    if (error) {
      toast({ title: "Error updating visit", variant: "destructive" });
    } else {
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[visitId];
        return updated;
      });
      fetchData();
      toast({ title: "Visit updated successfully" });
    }
  };

  const handleCancelVisitChanges = (visitId: string) => {
    setPendingChanges(prev => {
      const updated = { ...prev };
      delete updated[visitId];
      return updated;
    });
  };

  const handleSaveAllChanges = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Save new visits first (use RPC - includes country_visits)
      if (newVisits.length > 0) {
        const knownCities = new Set(cityVisits.map((c) => c.city_name.toLowerCase()));
        for (const draft of newVisits) {
          const newCities = draft.cities.filter(
            (city) => !knownCities.has(city.toLowerCase())
          );
          newCities.forEach((c) => knownCities.add(c.toLowerCase()));
          const membersForVisit =
            draft.familyMemberIds.length > 0 ? draft.familyMemberIds : familyMembers.map((m) => m.id);
          const { data: insertedVisit, error: visitError } = await supabase.rpc(
            "insert_country_visit_detail",
            {
              p_country_id: countryId,
              p_trip_name: draft.tripName || null,
              p_is_approximate: draft.isApproximate,
              p_approximate_month: draft.approximateMonth,
              p_approximate_year: draft.approximateYear,
              p_visit_date: draft.visitDate,
              p_end_date: draft.endDate,
              p_number_of_days: draft.numberOfDays,
              p_family_member_ids: membersForVisit.length > 0 ? membersForVisit : null,
              p_cities: newCities.length > 0 ? newCities : null,
            }
          );
          if (visitError) throw visitError;
          if (!insertedVisit?.id) throw new Error("Insert succeeded but no visit returned");
        }
        setNewVisits([]);
      }

      // Save all visit changes
      for (const [visitId, changes] of Object.entries(pendingChanges)) {
        if (Object.keys(changes).length > 0) {
          const { error } = await supabase
            .from("country_visit_details")
            .update(changes)
            .eq("id", visitId);

          if (error) {
            toast({ title: "Error updating visit", variant: "destructive" });
            setSaving(false);
            return;
          }
        }
      }

      // Save city additions
      if (pendingCityAdditions.length > 0) {
        const cityInserts = pendingCityAdditions.map((cityName) => ({
          country_id: countryId,
          city_name: cityName,
          user_id: user.id,
        }));

        const { error: cityError } = await supabase
          .from("city_visits")
          .insert(cityInserts);

        if (cityError) {
          toast({ title: "Error adding cities", variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      // Save city deletions
      if (pendingCityDeletions.length > 0) {
        const { error: deleteError } = await supabase
          .from("city_visits")
          .delete()
          .in("id", pendingCityDeletions);

        if (deleteError) {
          toast({ title: "Error deleting cities", variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      // Save family member changes
      for (const [visitId, pendingMembers] of Object.entries(pendingFamilyMemberChanges)) {
        const originalMembers = visitFamilyMembers[visitId] || [];
        
        // Find members to add and remove
        const membersToAdd = pendingMembers.filter(id => !originalMembers.includes(id));
        const membersToRemove = originalMembers.filter(id => !pendingMembers.includes(id));

        // Remove members
        if (membersToRemove.length > 0) {
          const { error: removeError } = await supabase
            .from("visit_family_members")
            .delete()
            .eq("visit_id", visitId)
            .in("family_member_id", membersToRemove);

          if (removeError) {
            toast({ title: "Error updating family members", variant: "destructive" });
            setSaving(false);
            return;
          }
        }

        // Add members
        if (membersToAdd.length > 0) {
          const familyInserts = membersToAdd.map((memberId) => ({
            visit_id: visitId,
            family_member_id: memberId,
            user_id: user.id,
          }));

          const { error: addError } = await supabase
            .from("visit_family_members")
            .insert(familyInserts);

          if (addError) {
            toast({ title: "Error updating family members", variant: "destructive" });
            setSaving(false);
            return;
          }
        }
      }

      // Clear all pending changes
      setPendingChanges({});
      setPendingCityAdditions([]);
      setPendingCityDeletions([]);
      setPendingFamilyMemberChanges({});
      
      await fetchData();
      onUpdate();
      toast({ title: "All changes saved successfully" });
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({ title: "Error saving changes", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAllChanges = () => {
    setNewVisits([]);
    setPendingChanges({});
    setPendingCityAdditions([]);
    setPendingCityDeletions([]);
    setPendingFamilyMemberChanges({});
  };

  const hasAnyPendingChanges = () => {
    if (newVisits.length > 0) return true;
    const hasVisitChanges = Object.values(pendingChanges).some(
      changes => changes && Object.keys(changes).length > 0
    );
    const hasCityChanges = pendingCityAdditions.length > 0 || pendingCityDeletions.length > 0;
    const hasFamilyMemberChanges = Object.keys(pendingFamilyMemberChanges).some(visitId => {
      const originalMembers = visitFamilyMembers[visitId] || [];
      const pendingMembers = pendingFamilyMemberChanges[visitId] || [];
      if (originalMembers.length !== pendingMembers.length) return true;
      return !originalMembers.every(id => pendingMembers.includes(id)) ||
             !pendingMembers.every(id => originalMembers.includes(id));
    });
    return hasVisitChanges || hasCityChanges || hasFamilyMemberChanges;
  };

  const handleDeleteVisit = async (visitId: string) => {
    const { error } = await supabase
      .from("country_visit_details")
      .delete()
      .eq("id", visitId);

    if (error) {
      toast({ title: "Error deleting visit", variant: "destructive" });
    } else {
      await fetchData();
      onUpdate();
    }
  };

  const handleAddCity = (cityName: string) => {
    if (!cityName.trim()) return;

    const trimmedCity = cityName.trim();
    const cityLower = trimmedCity.toLowerCase();

    // Check if already in existing cities
    const existingCity = cityVisits.find(
      (c) => c.city_name.toLowerCase() === cityLower
    );
    if (existingCity) {
      toast({ title: "City already added", variant: "destructive" });
      return;
    }

    // Check if already in pending additions
    if (pendingCityAdditions.some(c => c.toLowerCase() === cityLower)) {
      toast({ title: "City already queued to be added", variant: "destructive" });
      return;
    }

    // Remove from pending deletions if it was there
    setPendingCityDeletions(prev => prev.filter(id => {
      const city = cityVisits.find(c => c.id === id);
      return !city || city.city_name.toLowerCase() !== cityLower;
    }));

    // Add to pending additions
    setPendingCityAdditions(prev => [...prev, trimmedCity]);
  };

  const handleDeleteCity = (cityId: string) => {
    const city = cityVisits.find(c => c.id === cityId);
    if (!city) return;

    // Remove from pending additions if it was there
    setPendingCityAdditions(prev => prev.filter(c => c.toLowerCase() !== city.city_name.toLowerCase()));

    // Add to pending deletions
    setPendingCityDeletions(prev => [...prev, cityId]);
  };

  const totalDays = visitDetails.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
  const timesVisited = visitDetails.length;

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      onUpdate();
    }
  };

  const toggleVisitExpanded = (visitId: string) => {
    setExpandedVisits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(visitId)) {
        newSet.delete(visitId);
      } else {
        newSet.add(visitId);
      }
      return newSet;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]" aria-describedby="country-visit-dialog-description">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {countryName} Visit Details
          </DialogTitle>
          <DialogDescription id="country-visit-dialog-description" className="sr-only">
            View and edit visits to {countryName}. Add new visits, add another country to a trip, or manage existing visit details.
          </DialogDescription>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              {timesVisited} {timesVisited === 1 ? "visit" : "visits"}
            </Badge>
            <Badge variant="secondary">
              <Calendar className="w-3 h-3 mr-1" />
              {totalDays} {totalDays === 1 ? "day" : "days"} total
            </Badge>
            <Badge variant="secondary">
              <MapPin className="w-3 h-3 mr-1" />
              {cityVisits.length} {cityVisits.length === 1 ? "city" : "cities"}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {/* Add Multiple Visits Section */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <Label className="font-medium">Add Visits</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Add one or more visits at once. Include cities you visited on each trip.
              </p>
              
              {newVisits.length > 0 && (
                <div className="space-y-3 mb-3">
                  {newVisits.map((draft, index) => (
                    <NewVisitCard
                      key={draft.id}
                      draft={draft}
                      index={index}
                      countryCode={countryCode}
                      familyMembers={familyMembers}
                      onUpdate={handleUpdateNewVisitDraft}
                      onRemove={handleRemoveNewVisitDraft}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleAddNewVisitDraft}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Another Visit
                </Button>
                {newVisits.length > 0 && (
                  <Button size="sm" onClick={handleSaveNewVisits} disabled={saving}>
                    {saving ? "Saving..." : `Save ${newVisits.length} Visit${newVisits.length > 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>
            </div>

            {/* Existing Visits Section */}
            {visitDetails.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Saved Visits ({visitDetails.length})</h3>
                </div>

                <div className="space-y-2">
                  {visitDetails.map((visit, index) => {
                    const isExpanded = expandedVisits.has(visit.id);

                    // Get pending changes for this visit
                    const pending = pendingChanges[visit.id] || {};
                    const displayVisit = { ...visit, ...pending };
                    
                    const hasDateRange = (displayVisit.visit_date as string | null) && (displayVisit.end_date as string | null);
                    const isAutoCalculated = hasDateRange && calculateDays(displayVisit.visit_date as string | null, displayVisit.end_date as string | null) !== null;
                    const isApproximate = (displayVisit.is_approximate as boolean | undefined) ?? (visit.is_approximate || false);

                    const handleVisitDateSave = (startDate: string | null, endDate: string | null) => {
                      let updateData: Record<string, string | number | null | boolean> = {
                        visit_date: startDate,
                        end_date: endDate,
                        is_approximate: false,
                        approximate_month: null,
                        approximate_year: null,
                      };

                      if (startDate && endDate) {
                        const calculatedDays = calculateDays(startDate, endDate);
                        if (calculatedDays) {
                          updateData.number_of_days = calculatedDays;
                        }
                      }

                      // Store in pending changes instead of saving immediately
                      setPendingChanges(prev => ({
                        ...prev,
                        [visit.id]: { ...prev[visit.id], ...updateData }
                      }));
                    };

                    const handleApproximateToggle = (checked: boolean) => {
                      const updateData: Record<string, string | number | null | boolean> = {
                        is_approximate: checked,
                      };

                      if (checked) {
                        updateData.visit_date = null;
                        updateData.end_date = null;
                      } else {
                        updateData.approximate_month = null;
                        updateData.approximate_year = null;
                      }

                      // Store in pending changes instead of saving immediately
                      setPendingChanges(prev => ({
                        ...prev,
                        [visit.id]: { ...prev[visit.id], ...updateData }
                      }));
                    };

                    const handleApproximateUpdate = (field: string, value: number | string | null) => {
                      // Store in pending changes instead of saving immediately
                      setPendingChanges(prev => ({
                        ...prev,
                        [visit.id]: { ...prev[visit.id], [field]: value }
                      }));
                    };

                    const months = [
                      { value: 1, label: "January" },
                      { value: 2, label: "February" },
                      { value: 3, label: "March" },
                      { value: 4, label: "April" },
                      { value: 5, label: "May" },
                      { value: 6, label: "June" },
                      { value: 7, label: "July" },
                      { value: 8, label: "August" },
                      { value: 9, label: "September" },
                      { value: 10, label: "October" },
                      { value: 11, label: "November" },
                      { value: 12, label: "December" },
                    ];

                    const currentYear = new Date().getFullYear();
                    const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

                    // Build a display title for the visit
                    let visitTitle = (displayVisit.trip_name as string | null) || `Visit #${visitDetails.length - index}`;
                    let visitSubtitle = "";
                    const displayIsApproximate = (displayVisit.is_approximate as boolean | undefined) ?? isApproximate;
                    if (displayIsApproximate) {
                      const monthName = months.find((m) => m.value === (displayVisit.approximate_month as number | null | undefined))?.label;
                      visitSubtitle = [monthName, displayVisit.approximate_year].filter(Boolean).join(" ") || "Date unknown";
                    } else if (displayVisit.visit_date) {
                      visitSubtitle = displayVisit.end_date
                        ? `${format(parseISO(displayVisit.visit_date as string), "MMM d")} - ${format(parseISO(displayVisit.end_date as string), "MMM d, yyyy")}`
                        : format(parseISO(displayVisit.visit_date as string), "MMM d, yyyy");
                    }
                    const displayDays = (displayVisit.number_of_days as number | null | undefined) ?? visit.number_of_days;
                    visitSubtitle += ` • ${displayDays} day${displayDays !== 1 ? "s" : ""}`;

                    return (
                      <Collapsible key={visit.id} open={isExpanded} onOpenChange={() => toggleVisitExpanded(visit.id)}>
                        <Card>
                          <CollapsibleTrigger asChild>
                            <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="font-medium text-sm">{visitTitle}</div>
                                  <div className="text-xs text-muted-foreground">{visitSubtitle}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVisit(visit.id);
                                  }}
                                  className="text-destructive hover:text-destructive h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-4 px-4 border-t">
                              <div className="pt-3 space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <Label className="text-xs text-muted-foreground cursor-pointer">
                                    Approximate dates
                                  </Label>
                                  <Switch
                                    checked={(pendingChanges[visit.id]?.is_approximate as boolean | undefined) ?? displayIsApproximate}
                                    onCheckedChange={handleApproximateToggle}
                                    className="scale-75"
                                  />
                                </div>

                                {/* Trip Name */}
                                <div>
                                  <Label className="text-xs mb-1 block">Trip Name</Label>
                                  <Input
                                    type="text"
                                    placeholder="e.g., Trip with In-laws"
                                    value={(pendingChanges[visit.id]?.trip_name as string | undefined) ?? visit.trip_name ?? ""}
                                    onChange={(e) => {
                                      setPendingChanges(prev => ({
                                        ...prev,
                                        [visit.id]: { ...prev[visit.id], trip_name: e.target.value || null }
                                      }));
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>

                                {displayIsApproximate ? (
                                  <div>
                                    <Label className="text-xs mb-1 block flex items-center gap-1">
                                      <CalendarDays className="w-3 h-3" />
                                      Approximate Time
                                    </Label>
                                    <div className="flex gap-2">
                                      <Select
                                        value={((pendingChanges[visit.id]?.approximate_month as number | null | undefined) ?? visit.approximate_month)?.toString() || ""}
                                        onValueChange={(value) =>
                                          handleApproximateUpdate("approximate_month", value ? parseInt(value) : null)
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-sm flex-1">
                                          <SelectValue placeholder="Month (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {months.map((month) => (
                                            <SelectItem key={month.value} value={month.value.toString()}>
                                              {month.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Select
                                        value={((pendingChanges[visit.id]?.approximate_year as number | null | undefined) ?? visit.approximate_year)?.toString() || ""}
                                        onValueChange={(value) =>
                                          handleApproximateUpdate("approximate_year", value ? parseInt(value) : null)
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-sm w-28">
                                          <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {years.map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                              {year}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <Label className="text-xs mb-1 block">Travel Dates</Label>
                                    <TravelDatePicker
                                      startDate={(pendingChanges[visit.id]?.visit_date as string | null | undefined) ?? visit.visit_date}
                                      endDate={(pendingChanges[visit.id]?.end_date as string | null | undefined) ?? visit.end_date}
                                      onSave={handleVisitDateSave}
                                    />
                                  </div>
                                )}

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <Label className="text-xs">Days</Label>
                                    {!displayIsApproximate && isAutoCalculated ? (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Auto-calculated
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Edit3 className="w-3 h-3" />
                                        Manual entry
                                      </span>
                                    )}
                                  </div>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={(pendingChanges[visit.id]?.number_of_days as number | undefined) ?? visit.number_of_days ?? ""}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const numValue = parseInt(value);
                                      setPendingChanges(prev => ({
                                        ...prev,
                                        [visit.id]: { 
                                          ...prev[visit.id], 
                                          number_of_days: value === "" ? null : (isNaN(numValue) ? null : numValue)
                                        }
                                      }));
                                    }}
                                    disabled={!displayIsApproximate && isAutoCalculated && !pendingChanges[visit.id]?.number_of_days}
                                    className="h-8 text-sm"
                                    placeholder="Enter days"
                                  />
                                </div>

                                {/* Family Members */}
                                {familyMembers.length > 0 && (
                                  <div>
                                    <Label className="text-xs mb-2 block flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      Who went on this trip? (optional)
                                    </Label>
                                    <div className="flex flex-wrap gap-2">
                                      {familyMembers.map((member) => {
                                        const originalMembers = visitFamilyMembers[visit.id] || [];
                                        const pendingMembers = pendingFamilyMemberChanges[visit.id];
                                        const currentMembers = pendingMembers !== undefined 
                                          ? pendingMembers 
                                          : originalMembers;
                                        const isChecked = currentMembers.includes(member.id);
                                        
                                        return (
                                          <label
                                            key={member.id}
                                            className="flex items-center gap-1.5 text-xs cursor-pointer"
                                          >
                                            <Checkbox
                                              checked={isChecked}
                                              onCheckedChange={() => handleToggleVisitFamilyMember(visit.id, member.id)}
                                            />
                                            <span>{member.avatar}</span>
                                            <span>{member.name}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Cities Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">All Cities Visited</h3>
              </div>

              <div className="mb-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      Add a city...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search or type city name..." />
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={(e) => {
                              const input = (e.target as HTMLElement).closest('[cmdk-root]')?.querySelector('input');
                              if (input?.value) handleAddCity(input.value);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add custom city
                          </Button>
                        </CommandEmpty>
                        <CommandGroup>
                          {cities
                            .filter(
                              (city) =>
                                !cityVisits.some(
                                  (c) => c.city_name.toLowerCase() === city.toLowerCase()
                                )
                            )
                            .map((city) => (
                              <CommandItem
                                key={city}
                                value={city}
                                onSelect={() => handleAddCity(city)}
                              >
                                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                                {city}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {cityVisits.length === 0 && pendingCityAdditions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No cities recorded yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* Show existing cities that aren't pending deletion */}
                  {cityVisits
                    .filter(city => !pendingCityDeletions.includes(city.id))
                    .map((city) => (
                      <Badge
                        key={city.id}
                        variant="secondary"
                        className="text-sm py-1 px-3 flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        {city.city_name}
                        <button
                          onClick={() => handleDeleteCity(city.id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  {/* Show pending additions */}
                  {pendingCityAdditions.map((cityName) => (
                    <Badge
                      key={`pending-${cityName}`}
                      variant="outline"
                      className="text-sm py-1 px-3 flex items-center gap-1 border-primary text-primary"
                    >
                      <MapPin className="w-3 h-3" />
                      {cityName}
                      <button
                        onClick={() => {
                          setPendingCityAdditions(prev => prev.filter(c => c !== cityName));
                        }}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelAllChanges}
                disabled={!hasAnyPendingChanges()}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAllChanges}
                disabled={!hasAnyPendingChanges() || saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CountryVisitDetailsDialog;
