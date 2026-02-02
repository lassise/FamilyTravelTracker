import { useState, useCallback, useEffect, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Smartphone, Search, X, Pencil, PlusCircle, Loader2, Check, ChevronsUpDown, CheckCircle2, AlertCircle, Sparkles, Image, Mail, CheckSquare, ShieldCheck, RefreshCw, FolderOpen, Inbox, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHomeCountry } from "@/hooks/useHomeCountry";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { parsePastedText, markDuplicateSuggestions, type TripSuggestion, type ExistingTrip } from "@/lib/tripSuggestionsParser";
import { parseEmailContent, mergeNearbyTrips } from "@/lib/emailTripParser";
import { getSuggestionsFromPhotos } from "@/lib/photoTripSuggestions";
import { getDemoScanSources, runFindOnMyPhoneDemoScan } from "@/lib/findOnMyPhoneEngine";
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
  const { visitDetails } = useVisitDetails();
  const [pasteValue, setPasteValue] = useState("");
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoProgress, setPhotoProgress] = useState({ current: 0, total: 0 });
  const [addingId, setAddingId] = useState<string | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComboboxOpen, setEditComboboxOpen] = useState(false);
  const [editCountry, setEditCountry] = useState<CountryOption | null>(null);
  const [editVisitDate, setEditVisitDate] = useState<string | null>(null);
  const [editEndDate, setEditEndDate] = useState<string | null>(null);
  const [editApproximateMonth, setEditApproximateMonth] = useState<number | null>(null);
  const [editApproximateYear, setEditApproximateYear] = useState<number | null>(null);
  const [editIsApproximate, setEditIsApproximate] = useState(false);
  const [editTripName, setEditTripName] = useState("");
  const [showDuplicates, setShowDuplicates] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [autoScanStatus, setAutoScanStatus] = useState<"idle" | "scanning" | "completed" | "error">("idle");
  const [autoScanProgress, setAutoScanProgress] = useState({ percent: 0, message: "" });
  const [autoScanError, setAutoScanError] = useState<string | null>(null);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeEmails, setIncludeEmails] = useState(true);
  const [excludedAlbums, setExcludedAlbums] = useState<string[]>([]);
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);

  const demoSources = useMemo(() => getDemoScanSources(), []);

  // Convert existing visit details to ExistingTrip format for duplicate detection
  const existingTrips: ExistingTrip[] = useMemo(() => {
    return visitDetails.map(v => {
      // Find country info from the countries prop
      const country = countries.find(c => c.id === v.country_id);
      return {
        countryId: v.country_id,
        countryName: country?.name ?? "",
        countryCode: country?.flag,
        visitDate: v.visit_date,
        endDate: v.end_date,
        approximateMonth: v.approximate_month,
        approximateYear: v.approximate_year,
        tripName: v.trip_name,
      };
    }).filter(t => t.countryName); // Filter out any with missing country data
  }, [visitDetails, countries]);

  const editingSuggestion = suggestions.find((s) => s.id === editingId);

  // Filter suggestions based on showDuplicates toggle
  const displayedSuggestions = useMemo(() => {
    if (showDuplicates) return suggestions;
    return suggestions.filter(s => !s.alreadyExists);
  }, [suggestions, showDuplicates]);

  // Count duplicates for display
  const duplicateCount = useMemo(() => 
    suggestions.filter(s => s.alreadyExists).length
  , [suggestions]);

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
    const trimmed = pasteValue.trim();
    if (!trimmed) {
      toast({ title: "Enter some text first", description: "Paste text that mentions a country and dates.", variant: "destructive" });
      return;
    }
    const parsed = parsePastedText(trimmed);
    if (parsed.length === 0) {
      toast({ title: "No trips found in that text", description: "Try pasting text that mentions a country and dates (e.g. Iceland from 3/25/13 to 3/30/13).", variant: "destructive" });
      return;
    }
    // Mark duplicates before adding
    const withDuplicates = markDuplicateSuggestions(parsed, existingTrips);
    const duplicates = withDuplicates.filter(s => s.alreadyExists);
    const newTrips = withDuplicates.filter(s => !s.alreadyExists);
    
    setSuggestions((prev) => [...prev, ...withDuplicates]);
    setPasteValue("");
    
    if (duplicates.length > 0 && newTrips.length === 0) {
      toast({ 
        title: "Trip already logged", 
        description: duplicates[0].duplicateReason || "This trip appears to already be in your travels.",
      });
    } else if (duplicates.length > 0) {
      toast({
        title: `Found ${parsed.length} trip${parsed.length > 1 ? 's' : ''}`,
        description: `${duplicates.length} already logged, ${newTrips.length} new.`,
      });
    }
  }, [pasteValue, toast, existingTrips]);

  const handleAutoScan = useCallback(async () => {
    if (!includeEmails && !includePhotos) {
      toast({ title: "Select a data source", description: "Enable photo or email scanning to continue.", variant: "destructive" });
      return;
    }
    setAutoScanStatus("scanning");
    setAutoScanError(null);
    setAutoScanProgress({ percent: 0, message: "Preparing scan…" });
    try {
      const result = await runFindOnMyPhoneDemoScan({
        includePhotos,
        includeEmails,
        excludeAlbums: excludedAlbums,
        excludeEmailFolders: excludedFolders,
        homeCountryIso2: homeCountryIso2 ?? null,
        onProgress: (progress) => {
          setAutoScanProgress({ percent: progress.percent, message: progress.message });
        },
      });
      const withDuplicates = markDuplicateSuggestions(result.suggestions, existingTrips);
      setSuggestions(withDuplicates);
      setDemoMode(true);
      setAutoScanStatus("completed");
      toast({
        title: "Scan complete",
        description: `Suggested ${result.summary.tripsSuggested} trip${result.summary.tripsSuggested === 1 ? "" : "s"} from your device data.`,
      });
    } catch (error) {
      console.error("Auto scan failed", error);
      setAutoScanStatus("error");
      setAutoScanError("Unable to scan this device in web mode. Try uploading photos instead.");
    }
  }, [
    includeEmails,
    includePhotos,
    excludedAlbums,
    excludedFolders,
    homeCountryIso2,
    existingTrips,
    toast,
  ]);

  const toggleExcludedAlbum = useCallback((album: string) => {
    setExcludedAlbums((prev) => (prev.includes(album) ? prev.filter((item) => item !== album) : [...prev, album]));
  }, []);

  const toggleExcludedFolder = useCallback((folder: string) => {
    setExcludedFolders((prev) => (prev.includes(folder) ? prev.filter((item) => item !== folder) : [...prev, folder]));
  }, []);

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
        let countryId: string | null = (countries ?? []).find(
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

  // Toggle selection for bulk action
  const handleToggleSelect = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s))
    );
  }, []);

  // Select all non-duplicate suggestions
  const handleSelectAll = useCallback(() => {
    setSuggestions((prev) =>
      prev.map((s) => ({ ...s, selected: !s.alreadyExists }))
    );
  }, []);

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    setSuggestions((prev) =>
      prev.map((s) => ({ ...s, selected: false }))
    );
  }, []);

  // Bulk add selected suggestions
  const handleBulkAdd = useCallback(async () => {
    const selectedTrips = suggestions.filter((s) => s.selected && !s.alreadyExists);
    if (selectedTrips.length === 0) {
      toast({ title: "No trips selected", variant: "destructive" });
      return;
    }

    setBulkAdding(true);
    let successCount = 0;
    let failCount = 0;

    for (const trip of selectedTrips) {
      try {
        await handleAddToTravels(trip);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkAdding(false);
    if (failCount === 0) {
      toast({ title: `Added ${successCount} trips!` });
    } else {
      toast({
        title: `Added ${successCount} trips`,
        description: `${failCount} failed to add.`,
        variant: "destructive",
      });
    }
  }, [suggestions, handleAddToTravels, toast]);

  // Count of selected non-duplicate suggestions
  const selectedCount = useMemo(
    () => suggestions.filter((s) => s.selected && !s.alreadyExists).length,
    [suggestions]
  );

  // Count of selectable (non-duplicate) suggestions
  const selectableCount = useMemo(
    () => suggestions.filter((s) => !s.alreadyExists).length,
    [suggestions]
  );

  // Get confidence badge color
  const getConfidenceBadge = (confidence?: number) => {
    if (confidence === undefined) return null;
    if (confidence >= 0.85) {
      return (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
          High
        </Badge>
      );
    }
    if (confidence >= 0.6) {
      return (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700">
          Medium
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">
        Low
      </Badge>
    );
  };

  const content = (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: homeCopy.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Find On My Phone
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              This demo simulates scanning your photos and email inbox locally. Nothing leaves your device.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2">
                <Checkbox checked={includePhotos} onCheckedChange={(value) => setIncludePhotos(!!value)} />
                Scan photos (EXIF + location)
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={includeEmails} onCheckedChange={(value) => setIncludeEmails(!!value)} />
                Scan travel emails
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FolderOpen className="h-3 w-3" />
                  Exclude albums
                </div>
                <div className="flex flex-wrap gap-2">
                  {demoSources.albums.map((album) => (
                    <label key={album} className="flex items-center gap-1">
                      <Checkbox
                        checked={excludedAlbums.includes(album)}
                        onCheckedChange={() => toggleExcludedAlbum(album)}
                      />
                      {album}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Inbox className="h-3 w-3" />
                  Exclude email folders
                </div>
                <div className="flex flex-wrap gap-2">
                  {demoSources.folders.map((folder) => (
                    <label key={folder} className="flex items-center gap-1">
                      <Checkbox
                        checked={excludedFolders.includes(folder)}
                        onCheckedChange={() => toggleExcludedFolder(folder)}
                      />
                      {folder}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button type="button" onClick={handleAutoScan} disabled={autoScanStatus === "scanning"}>
                {autoScanStatus === "scanning" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Allow access & scan
                  </>
                )}
              </Button>
              {autoScanStatus === "completed" && (
                <Button type="button" variant="ghost" size="sm" onClick={handleAutoScan}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Rescan
                </Button>
              )}
            </div>
            {autoScanStatus === "scanning" && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">{autoScanProgress.message}</div>
                <Progress value={autoScanProgress.percent} className="h-2" />
              </div>
            )}
            {autoScanStatus === "error" && (
              <p className="text-xs text-destructive">{autoScanError}</p>
            )}
          </CardContent>
        </Card>
        
        <Collapsible open={manualOpen} onOpenChange={setManualOpen}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Manual import (optional)
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", manualOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Paste Text Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="ai-find-paste">Paste email or text (OOO, boarding pass, hotel confirmation)</Label>
              </div>
              <Textarea
                id="ai-find-paste"
                placeholder="Paste flight confirmation, hotel booking, OOO message, or any travel-related text..."
                value={pasteValue}
                onChange={(e) => setPasteValue(e.target.value)}
                className="min-h-[80px]"
                aria-label="Paste text to find trips"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleFindTrips}>
                <Search className="w-4 h-4 mr-2" />
                Find trips in text
              </Button>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="ai-find-photos">Upload photos with location data</Label>
              </div>
              <input
                id="ai-find-photos"
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground file:cursor-pointer cursor-pointer"
                aria-label="Add photos with location"
                disabled={photoLoading}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  setPhotoLoading(true);
                  setPhotoProgress({ current: 0, total: files.length });
                  try {
                    const result = await getSuggestionsFromPhotos(Array.from(files), homeCountryIso2 ?? null);
                    if (result.length === 0) {
                      toast({ title: "No photos with location/date found", description: "Photos need GPS and date in EXIF. Set your home country in Settings to filter by trips abroad.", variant: "destructive" });
                    } else {
                      // Merge nearby trips and mark duplicates
                      const merged = mergeNearbyTrips(result);
                      const withDuplicates = markDuplicateSuggestions(merged, existingTrips);
                      const duplicates = withDuplicates.filter(s => s.alreadyExists);
                      const newTrips = withDuplicates.filter(s => !s.alreadyExists);
                      
                      setSuggestions((prev) => [...prev, ...withDuplicates]);
                      
                      if (duplicates.length > 0 && newTrips.length === 0) {
                        toast({ 
                          title: "Trips already logged", 
                          description: `All ${duplicates.length} photo trip${duplicates.length > 1 ? 's' : ''} found are already in your travels.`,
                        });
                      } else if (duplicates.length > 0) {
                        toast({
                          title: `Found ${merged.length} trip${merged.length > 1 ? 's' : ''} from photos`,
                          description: `${duplicates.length} already logged, ${newTrips.length} new.`,
                        });
                      } else {
                        toast({
                          title: `Found ${merged.length} trip${merged.length > 1 ? 's' : ''} from photos`,
                        });
                      }
                    }
                  } catch {
                    toast({ title: "Error reading photos", variant: "destructive" });
                  } finally {
                    setPhotoLoading(false);
                    setPhotoProgress({ current: 0, total: 0 });
                    e.target.value = "";
                  }
                }}
              />
              {photoLoading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing photos... (this may take a moment due to rate limits)</span>
                  </div>
                  {photoProgress.total > 0 && (
                    <Progress value={(photoProgress.current / photoProgress.total) * 100} className="h-2" />
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium">
              Suggested trips
              <span className="ml-2 text-muted-foreground font-normal">
                ({displayedSuggestions.length}{duplicateCount > 0 && !showDuplicates ? ` of ${suggestions.length}` : ''})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {duplicateCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setShowDuplicates(!showDuplicates)}
                >
                  {showDuplicates ? `Hide ${duplicateCount} logged` : `Show ${duplicateCount} logged`}
                </Button>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectableCount > 1 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Checkbox
                id="select-all"
                checked={selectedCount === selectableCount && selectableCount > 0}
                onCheckedChange={(checked) => checked ? handleSelectAll() : handleDeselectAll()}
              />
              <Label htmlFor="select-all" className="text-xs cursor-pointer flex-1">
                {selectedCount > 0 ? `${selectedCount} selected` : "Select all new trips"}
              </Label>
              {selectedCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-3 text-xs"
                  disabled={bulkAdding}
                  onClick={handleBulkAdd}
                >
                  {bulkAdding ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <CheckSquare className="w-3 h-3 mr-1" />
                  )}
                  Add {selectedCount} trips
                </Button>
              )}
            </div>
          )}
          
          {displayedSuggestions.length === 0 && duplicateCount > 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>All {duplicateCount} trip{duplicateCount > 1 ? 's' : ''} already logged!</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1"
                onClick={() => setShowDuplicates(true)}
              >
                Show anyway
              </Button>
            </div>
          )}
          
          <ul className="space-y-2 max-h-[280px] overflow-y-auto">
            {displayedSuggestions.map((s) => (
              <li
                key={s.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 shadow-sm transition-colors",
                  s.alreadyExists
                    ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                    : s.selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                {/* Selection checkbox for non-duplicates */}
                {!s.alreadyExists && selectableCount > 1 && (
                  <Checkbox
                    checked={s.selected || false}
                    onCheckedChange={() => handleToggleSelect(s.id)}
                    className="shrink-0"
                  />
                )}
                
                <CountryFlag countryCode={s.countryCode} countryName={s.countryName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{s.countryName}</p>
                    {s.alreadyExists && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        Logged
                      </Badge>
                    )}
                    {getConfidenceBadge(s.confidence)}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatSuggestionDate(s)}</p>
                  {s.tripName && (
                    <p className="text-xs text-muted-foreground truncate">{s.tripName}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {s.sourceLabel}
                    </Badge>
                    {s.photoCount && s.photoCount > 1 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {s.photoCount} photos
                      </Badge>
                    )}
                    {s.emailCount && s.emailCount > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {s.emailCount} emails
                      </Badge>
                    )}
                    {s.relatedCountries && s.relatedCountries.length > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        Multi-country
                      </Badge>
                    )}
                  </div>
                  {(s.evidence?.photos?.length || s.evidence?.emails?.length) && (
                    <div className="mt-2 space-y-1">
                      {s.evidence.photos && s.evidence.photos.length > 0 && (
                        <div className="flex items-center gap-1">
                          {s.evidence.photos.slice(0, 3).map((photo) => (
                            <img
                              key={photo.id}
                              src={photo.thumbnailUrl}
                              alt={`Photo evidence from ${photo.countryName}`}
                              className="h-8 w-8 rounded-md object-cover border"
                            />
                          ))}
                          {s.evidence.photos.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              +{s.evidence.photos.length - 3} more photos
                            </span>
                          )}
                        </div>
                      )}
                      {s.evidence.emails && s.evidence.emails.length > 0 && (
                        <div className="text-[10px] text-muted-foreground line-clamp-2">
                          “{s.evidence.emails[0].snippet}”
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(s.id)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!s.alreadyExists ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary"
                      aria-label="Add to travels"
                      title="Add to travels"
                      disabled={addingId === s.id || bulkAdding}
                      onClick={() => handleAddToTravels(s)}
                    >
                      {addingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground"
                      aria-label="Already added"
                      title={s.duplicateReason || "Already in your travels"}
                      disabled
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDismiss(s.id)} aria-label="Dismiss">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          
          {/* Demo mode indicator */}
          {demoMode && (
            <p className="text-xs text-center text-muted-foreground">
              <Sparkles className="w-3 h-3 inline mr-1" />
              Demo mode - these are sample trips
            </p>
          )}
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
            <SheetDescription>Allow access to scan device data, or paste text and photos manually. {homeCopy.replace(/\*\*/g, "")}</SheetDescription>
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
            Allow access to scan device data, or paste text (OOO, boarding pass) and photos manually.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">{content}</div>
      </DialogContent>
    </Dialog>
  );
}
