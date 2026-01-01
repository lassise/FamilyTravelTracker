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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, MapPin, Plus, Trash2, Clock, X, Lock, Edit3 } from "lucide-react";
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
import { differenceInDays, parseISO, isAfter } from "date-fns";

// Calculate days between two dates (inclusive)
const calculateDays = (startDate: string | null, endDate: string | null): number | null => {
  if (!startDate || !endDate) return null;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (isAfter(start, end)) return null; // Invalid: start is after end
  return differenceInDays(end, start) + 1; // +1 to make it inclusive
};

interface VisitDetail {
  id: string;
  country_id: string;
  visit_date: string | null;
  end_date: string | null;
  number_of_days: number;
  notes: string | null;
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
}

const CountryVisitDetailsDialog = ({
  countryId,
  countryName,
  countryCode,
  onUpdate,
}: CountryVisitDetailsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [visitDetails, setVisitDetails] = useState<VisitDetail[]>([]);
  const [cityVisits, setCityVisits] = useState<CityVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityComboboxOpen, setCityComboboxOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const { toast } = useToast();

  const cities = getCitiesForCountry(countryCode);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsResult, citiesResult] = await Promise.all([
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
      ]);

      if (visitsResult.error) throw visitsResult.error;
      if (citiesResult.error) throw citiesResult.error;

      setVisitDetails(visitsResult.data || []);
      setCityVisits(citiesResult.data || []);
    } catch (error) {
      console.error("Error fetching visit details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, countryId]);

  const handleAddVisit = async () => {
    const { error } = await supabase.from("country_visit_details").insert({
      country_id: countryId,
      number_of_days: 1,
    });

    if (error) {
      toast({ title: "Error adding visit", variant: "destructive" });
    } else {
      fetchData();
      onUpdate();
    }
  };

  const handleUpdateVisit = async (
    visitId: string,
    field: string,
    value: string | number | null,
    currentVisit?: VisitDetail
  ) => {
    let updateData: Record<string, string | number | null> = { [field]: value };

    // Auto-calculate days when updating dates
    if (currentVisit && (field === "visit_date" || field === "end_date")) {
      const newStartDate = field === "visit_date" ? (value as string | null) : currentVisit.visit_date;
      const newEndDate = field === "end_date" ? (value as string | null) : currentVisit.end_date;
      
      // Validate date order
      if (newStartDate && newEndDate) {
        const start = parseISO(newStartDate);
        const end = parseISO(newEndDate);
        if (isAfter(start, end)) {
          toast({ title: "End date must be after start date", variant: "destructive" });
          return;
        }
        // Auto-calculate days
        const calculatedDays = calculateDays(newStartDate, newEndDate);
        if (calculatedDays) {
          updateData.number_of_days = calculatedDays;
        }
      }
    }

    const { error } = await supabase
      .from("country_visit_details")
      .update(updateData)
      .eq("id", visitId);

    if (error) {
      toast({ title: "Error updating visit", variant: "destructive" });
    } else {
      fetchData();
      onUpdate();
    }
  };

  const handleDeleteVisit = async (visitId: string) => {
    const { error } = await supabase
      .from("country_visit_details")
      .delete()
      .eq("id", visitId);

    if (error) {
      toast({ title: "Error deleting visit", variant: "destructive" });
    } else {
      fetchData();
      onUpdate();
    }
  };

  const handleAddCity = async (cityName: string) => {
    if (!cityName.trim()) return;

    // Check if city already exists for this country
    const existingCity = cityVisits.find(
      (c) => c.city_name.toLowerCase() === cityName.toLowerCase()
    );
    if (existingCity) {
      toast({ title: "City already added", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("city_visits").insert({
      country_id: countryId,
      city_name: cityName.trim(),
    });

    if (error) {
      toast({ title: "Error adding city", variant: "destructive" });
    } else {
      setNewCityName("");
      setCityComboboxOpen(false);
      fetchData();
      onUpdate();
    }
  };

  const handleDeleteCity = async (cityId: string) => {
    const { error } = await supabase.from("city_visits").delete().eq("id", cityId);

    if (error) {
      toast({ title: "Error deleting city", variant: "destructive" });
    } else {
      fetchData();
      onUpdate();
    }
  };

  const totalDays = visitDetails.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
  const timesVisited = visitDetails.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {countryName} Visit Details
          </DialogTitle>
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
            {/* Visits Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Visits</h3>
                <Button size="sm" onClick={handleAddVisit}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Visit
                </Button>
              </div>

              {visitDetails.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No visits recorded yet. Add your first visit!
                </p>
              ) : (
                <div className="space-y-3">
                  {visitDetails.map((visit, index) => (
                    <Card key={visit.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            Visit #{visitDetails.length - index}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVisit(visit.id)}
                            className="text-destructive hover:text-destructive h-6 w-6 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {(() => {
                          const hasDateRange = visit.visit_date && visit.end_date;
                          const isAutoCalculated = hasDateRange && calculateDays(visit.visit_date, visit.end_date) !== null;
                          
                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">Start Date</Label>
                                  <Input
                                    type="date"
                                    value={visit.visit_date || ""}
                                    onChange={(e) =>
                                      handleUpdateVisit(visit.id, "visit_date", e.target.value || null, visit)
                                    }
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">End Date</Label>
                                  <Input
                                    type="date"
                                    value={visit.end_date || ""}
                                    onChange={(e) =>
                                      handleUpdateVisit(visit.id, "end_date", e.target.value || null, visit)
                                    }
                                    className="h-8 text-sm"
                                    min={visit.visit_date || undefined}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-xs">Days</Label>
                                  {isAutoCalculated ? (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Lock className="w-3 h-3" />
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
                                  value={visit.number_of_days || 1}
                                  onChange={(e) =>
                                    handleUpdateVisit(
                                      visit.id,
                                      "number_of_days",
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  disabled={isAutoCalculated}
                                  className={`h-8 text-sm ${isAutoCalculated ? "bg-muted cursor-not-allowed" : ""}`}
                                />
                                {!hasDateRange && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Add both dates to auto-calculate days
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Cities Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Cities Visited</h3>
              </div>

              <div className="mb-3">
                <Popover open={cityComboboxOpen} onOpenChange={setCityComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Plus className="w-4 h-4 mr-2" />
                      {newCityName || "Add a city..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type city name..."
                        value={newCityName}
                        onValueChange={setNewCityName}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {newCityName.trim() && (
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => handleAddCity(newCityName)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add "{newCityName}"
                            </Button>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {cities
                            .filter((city) =>
                              city.toLowerCase().includes(newCityName.toLowerCase())
                            )
                            .slice(0, 20)
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

              {cityVisits.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No cities recorded yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {cityVisits.map((city) => (
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
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CountryVisitDetailsDialog;