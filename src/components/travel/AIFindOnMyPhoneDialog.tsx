import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Search, X, Pencil, PlusCircle, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHomeCountry } from "@/hooks/useHomeCountry";
import { parsePastedText, type TripSuggestion } from "@/lib/tripSuggestionsParser";
import { getSuggestionsFromPhotos } from "@/lib/photoTripSuggestions";
import { getAllCountries, type CountryOption } from "@/lib/countriesData";
import CountryFlag from "@/components/common/CountryFlag";
import { TravelDatePicker } from "@/components/TravelDatePicker";
import { format, parseISO, isValid, differenceInDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const allCountries = getAllCountries();
const months = [
  { value: 1, label: "January" }, { value: 2, label: "February" }, { value: 3, label: "March" },
  { value: 4, label: "April" }, { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" }, { value: 9, label: "September" },
  { value: 10, label: "October" }, { value: 11, label: "November" }, { value: 12, label: "December" },
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

export interface AIFindOnMyPhoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyMembers: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string; flag: string; continent: string }>;
  homeCountry: string | null | undefined;
  onSuccess: () => void;
}

function formatSuggestionDate(s: TripSuggestion): string {
  if (s.visitDate && s.endDate) {
    try {
      const start = parseISO(s.visitDate);
      const end = parseISO(s.endDate);
      if (isValid(start) && isValid(end)) {
        return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
      }
    } catch {}
  }
  if (s.approximateYear != null) {
    if (s.approximateMonth != null) {
      const d = new Date(s.approximateYear, s.approximateMonth - 1, 1);
      return `Approximate: ${format(d, "MMMM yyyy")}`;
    }
    return `Approximate: ${s.approximateYear}`;
  }
  return "No dates";
}

function calculateDays(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null;
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (isAfter(start, end)) return null;
    return differenceInDays(end, start) + 1;
  } catch {
    return null;
  }
}

export default function AIFindOnMyPhoneDialog({
  open,
  onOpenChange,
  familyMembers,
  countries,
  homeCountry,
  onSuccess,
}: AIFindOnMyPhoneDialogProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { iso2: homeCountryIso2, name: homeCountryName } = useHomeCountry(homeCountry);
  const [pasteValue, setPasteValue] = useState("");
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComboboxOpen, setEditComboboxOpen] = useState(false);
  const [editCountry, setEditCountry] = useState<CountryOption | null>(null);
  const [editVisitDate, setEditVisitDate] = useState<string | null>(null);
  const [editEndDate, setEditEndDate] = useState<string | null>(null);
  const [editApproximateMonth, setEditApproximateMonth] = useState<number | null>(null);
  const [editApproximateYear, setEditApproximateYear] = useState<number | null>(null);
  const [editIsApproximate, setEditIsApproximate] = useState(false);
  const [editTripName, setEditTripName] = useState("");

  const editingSuggestion = suggestions.find((s) => s.id === editingId);

  useEffect(() => {
    if (editingSuggestion) {
      setEditCountry(
        allCountries.find((c) => c.name === editingSuggestion.countryName || c.code === (editingSuggestion.countryCode ?? "")) ?? null
      );
      setEditVisitDate(editingSuggestion.visitDate);
      setEditEndDate(editingSuggestion.endDate);
      setEditApproximateMonth(editingSuggestion.approximateMonth);
      setEditApproximateYear(editingSuggestion.approximateYear);
      setEditIsApproximate(!!editingSuggestion.approximateYear);
      setEditTripName(editingSuggestion.tripName ?? "");
    }
  }, [editingSuggestion]);

  const homeCopy = homeCountryName
    ? "We only suggest photos taken **outside your home country**."
    : "Set your home country in Settings to filter photos by trips abroad.";

  const handleFindTrips = useCallback(() => {
    const parsed = parsePastedText(pasteValue);
    if (parsed.length === 0) {
      setSuggestions((prev) => prev);
      return;
    }
    setSuggestions((prev) => [...prev, ...parsed]);
  }, [pasteValue]);

  const handleDismiss = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleAddToTravels = useCallback(
    async (s: TripSuggestion) => {
      setAddingId(s.id);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({ title: "You must be logged in", variant: "destructive" });
          setAddingId(null);
          return;
        }
        const countryName = s.countryName;
        const countryCode = (s.countryCode ?? "").toUpperCase();
        const continent = allCountries.find((c) => c.code === countryCode)?.continent ?? "Unknown";
        let countryId: string | null = countries.find(
          (c) => c.name === countryName || (c.flag && c.flag.toUpperCase() === countryCode)
        )?.id ?? null;
        const memberIds = familyMembers.length > 0 ? familyMembers.map((m) => m.id) : null;
        if (!countryId) {
          const { data: newCountry, error: insertErr } = await supabase
            .from("countries")
            .insert([{ name: countryName, flag: countryCode, continent, user_id: user.id }])
            .select()
            .single();
          if (insertErr) throw insertErr;
          countryId = newCountry?.id ?? null;
          if (countryId && memberIds && memberIds.length > 0) {
            await supabase.from("country_visits").insert(
              memberIds.map((memberId) => ({
                country_id: countryId!,
                family_member_id: memberId,
                user_id: user.id,
              }))
            );
          }
        }
        if (!countryId) {
          toast({ title: "Could not create or find country", variant: "destructive" });
          setAddingId(null);
          return;
        }
        const numberOfDays = calculateDays(s.visitDate, s.endDate) ?? undefined;
        const { error: rpcErr } = await supabase.rpc("insert_country_visit_detail", {
          p_country_id: countryId,
          p_trip_name: s.tripName ?? null,
          p_is_approximate: !!(s.approximateYear ?? s.approximateMonth),
          p_approximate_month: s.approximateMonth ?? null,
          p_approximate_year: s.approximateYear ?? null,
          p_visit_date: s.visitDate ?? null,
          p_end_date: s.endDate ?? null,
          p_number_of_days: numberOfDays,
          p_family_member_ids: memberIds,
          p_cities: null,
        });
        if (rpcErr) throw rpcErr;
        setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
        onSuccess();
        toast({ title: "Trip added!" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to add trip";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setAddingId(null);
      }
    },
    [countries, familyMembers, onSuccess, toast]
  );

  const handleEditSave = useCallback(() => {
    if (!editingId || !editCountry) return;
    const updated: TripSuggestion = {
      ...editingSuggestion!,
      countryName: editCountry.name,
      countryCode: editCountry.code,
      visitDate: editIsApproximate ? null : editVisitDate,
      endDate: editIsApproximate ? null : editEndDate,
      approximateMonth: editIsApproximate ? editApproximateMonth : null,
      approximateYear: editIsApproximate ? editApproximateYear : null,
      tripName: editTripName.trim() || null,
    };
    setSuggestions((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
    setEditingId(null);
  }, [editingId, editingSuggestion, editCountry, editVisitDate, editEndDate, editIsApproximate, editApproximateMonth, editApproximateYear, editTripName]);

  const content = (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: homeCopy.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
        <div>
          <Label htmlFor="ai-find-paste">Paste text (OOO, boarding pass, etc.)</Label>
          <Textarea
            id="ai-find-paste"
            placeholder="e.g. I'll be OOO in Iceland from 3/25/13 to 3/30/13"
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            className="mt-2 min-h-[100px]"
            aria-label="Paste text to find trips"
          />
          <Button type="button" variant="secondary" className="mt-2" onClick={handleFindTrips}>
            <Search className="w-4 h-4 mr-2" />
            Find trips
          </Button>
        </div>
        <div>
          <Label htmlFor="ai-find-photos">Add photos with location</Label>
          <input
            id="ai-find-photos"
            type="file"
            accept="image/*"
            multiple
            className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
            aria-label="Add photos with location"
            onChange={async (e) => {
              const files = e.target.files;
              if (!files?.length) return;
              setPhotoLoading(true);
              try {
                const result = await getSuggestionsFromPhotos(Array.from(files), homeCountryIso2 ?? null);
                setSuggestions((prev) => [...prev, ...result]);
                if (result.length === 0) {
                  toast({ title: "No photos with location/date found", description: "Photos need GPS and date in EXIF. Set your home country in Settings to filter by trips abroad.", variant: "destructive" });
                }
              } catch {
                toast({ title: "Error reading photos", variant: "destructive" });
              } finally {
                setPhotoLoading(false);
                e.target.value = "";
              }
            }}
          />
          {photoLoading && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading photos…
            </p>
          )}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium">Suggested trips</h3>
          <ul className="space-y-2 max-h-[280px] overflow-y-auto">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm",
                  "hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <CountryFlag countryCode={s.countryCode} countryName={s.countryName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.countryName}</p>
                  <p className="text-xs text-muted-foreground">{formatSuggestionDate(s)}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {s.sourceLabel}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(s.id)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Add to travels"
                    title="Add to travels"
                    disabled={addingId === s.id}
                    onClick={() => handleAddToTravels(s)}
                  >
                    {addingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDismiss(s.id)} aria-label="Dismiss">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length === 0 && pasteValue.trim() === "" && (
        <p className="text-sm text-muted-foreground mt-4">Paste text or add photos to see suggested trips here.</p>
      )}

      {/* Edit suggestion modal */}
      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-lg" aria-describedby="edit-suggestion-desc">
          <DialogHeader>
            <DialogTitle>Edit suggestion</DialogTitle>
            <DialogDescription id="edit-suggestion-desc">Update country, dates, or trip name.</DialogDescription>
          </DialogHeader>
          {editingSuggestion && (
            <div className="space-y-4 mt-2">
              <div>
                <Label>Country</Label>
                <Popover open={editComboboxOpen} onOpenChange={setEditComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" type="button" className="w-full justify-between mt-1">
                      {editCountry ? (
                        <span className="flex items-center gap-2">
                          <CountryFlag countryCode={editCountry.code} countryName={editCountry.name} size="sm" />
                          <span>{editCountry.name}</span>
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
                            <CommandItem key={opt.code} value={opt.name} onSelect={() => { setEditCountry(opt); setEditComboboxOpen(false); }}>
                              <Check className={cn("mr-2 h-4 w-4", editCountry?.name === opt.name ? "opacity-100" : "opacity-0")} />
                              <CountryFlag countryCode={opt.code} countryName={opt.name} size="sm" className="mr-2" />
                              <span>{opt.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Trip name (optional)</Label>
                <Input
                  placeholder="e.g. Summer 2025"
                  value={editTripName}
                  onChange={(e) => setEditTripName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-approximate"
                  checked={editIsApproximate}
                  onCheckedChange={(c) => setEditIsApproximate(!!c)}
                />
                <Label htmlFor="edit-approximate" className="cursor-pointer">Approximate dates</Label>
              </div>
              {editIsApproximate ? (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Month</Label>
                    <Select value={editApproximateMonth?.toString() ?? ""} onValueChange={(v) => setEditApproximateMonth(v ? parseInt(v) : null)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Year</Label>
                    <Select value={editApproximateYear?.toString() ?? ""} onValueChange={(v) => setEditApproximateYear(v ? parseInt(v) : null)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Travel dates</Label>
                  <TravelDatePicker
                    startDate={editVisitDate}
                    endDate={editEndDate}
                    onSave={(start, end) => { setEditVisitDate(start); setEditEndDate(end); }}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button type="button" onClick={handleEditSave} disabled={!editCountry}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              AI Find On My Phone
            </SheetTitle>
            <SheetDescription>Paste text or add photos to suggest trips. {homeCopy.replace(/\*\*/g, "")}</SheetDescription>
          </SheetHeader>
          <div className="mt-4 pb-8">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg" aria-describedby="ai-find-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            AI Find On My Phone
          </DialogTitle>
          <DialogDescription id="ai-find-desc">
            Paste text (OOO, boarding pass) or add photos with location to suggest trips.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">{content}</div>
      </DialogContent>
    </Dialog>
  );
}
