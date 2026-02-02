import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Trash2, Calendar, MapPin, Clock, ChevronDown, Plane, ExternalLink, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CountryDialog from "./CountryDialog";
import AddCountryWithDetailsDialog from "./AddCountryWithDetailsDialog";
import AIFindOnMyPhoneDialog from "./travel/AIFindOnMyPhoneDialog";
import CountryVisitDetailsDialog from "./CountryVisitDetailsDialog";
import { Country, FamilyMember } from "@/hooks/useFamilyData";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { getAllCountries, getRegionCode } from "@/lib/countriesData";
import { cn } from "@/lib/utils";
import CountryFlag from "./common/CountryFlag";
import CountryFilters from "./travel/CountryFilters";
import DeleteConfirmDialog from "./common/DeleteConfirmDialog";
import { format, parseISO, differenceInDays } from "date-fns";
import { useTripLegs, type TripLeg } from "@/hooks/useTripLegs";
import { Link } from "react-router-dom";

interface CountryTrackerProps {
  countries: Country[];
  familyMembers: FamilyMember[];
  onUpdate: () => void;
  selectedMemberId?: string | null;
  onMemberChange?: (memberId: string | null) => void;
  homeCountry?: string | null;
}

const CountryTracker = ({ countries, familyMembers, onUpdate, selectedMemberId, onMemberChange, homeCountry }: CountryTrackerProps) => {
  const { toast } = useToast();
  const { visitDetails, getCountrySummary, refetch: refetchVisitDetails } = useVisitDetails();
  const { fetchLegsForCountry } = useTripLegs();
  const allCountriesData = getAllCountries();
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [selectedContinent, setSelectedContinent] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; countryId: string; countryName: string }>({
    open: false,
    countryId: '',
    countryName: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [visitDetailsDialogOpen, setVisitDetailsDialogOpen] = useState<Record<string, boolean>>({});
  const [tripLegsByCountry, setTripLegsByCountry] = useState<Record<string, TripLeg[]>>({});
  const [aiFindDialogOpen, setAiFindDialogOpen] = useState(false);

  // Fetch trip legs for all countries on mount
  useEffect(() => {
    const fetchAllTripLegs = async () => {
      const legsByCountry: Record<string, TripLeg[]> = {};
      
      for (const country of countries) {
        const { data } = await fetchLegsForCountry(country.id, country.name);
        if (data && data.length > 0) {
          legsByCountry[country.id] = data;
        }
      }
      
      setTripLegsByCountry(legsByCountry);
    };
    
    if (countries.length > 0) {
      fetchAllTripLegs();
    }
  }, [countries, fetchLegsForCountry]);

  // Get unique continents and years from countries
  const { continents, years } = useMemo(() => {
    const continentSet = new Set<string>();
    const yearSet = new Set<number>();
    
    countries.forEach(c => continentSet.add(c.continent));
    
    visitDetails.forEach(v => {
      if (v.visit_date) {
        try {
          const date = new Date(v.visit_date);
          if (!isNaN(date.getTime())) {
            yearSet.add(date.getFullYear());
          }
        } catch {
          // Ignore invalid dates
        }
      } else if (v.approximate_year) {
        yearSet.add(v.approximate_year);
      }
    });
    
    return {
      continents: Array.from(continentSet).sort(),
      years: Array.from(yearSet).sort((a, b) => b - a)
    };
  }, [countries, visitDetails]);

  // Filter countries based on selected filters
  const filteredCountries = useMemo(() => {
    let result = countries;
    
    // Filter by selected member
    if (selectedMemberId) {
      const selectedMember = familyMembers.find(m => m.id === selectedMemberId);
      if (selectedMember) {
        result = result.filter(c => c.visitedBy.includes(selectedMember.name));
      }
    }
    
    if (selectedContinent !== 'all') {
      result = result.filter(c => c.continent === selectedContinent);
    }
    
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear);
      const countryIdsForYear = new Set(
        visitDetails
          .filter(v => {
            if (v.visit_date) {
              try {
                const date = new Date(v.visit_date);
                return !isNaN(date.getTime()) && date.getFullYear() === year;
              } catch {
                return false;
              }
            }
            return v.approximate_year === year;
          })
          .map(v => v.country_id)
      );
      result = result.filter(c => countryIdsForYear.has(c.id));
    }
    
    return result;
  }, [countries, selectedContinent, selectedYear, selectedMemberId, familyMembers, visitDetails]);

  const clearFilters = () => {
    setSelectedContinent('all');
    setSelectedYear('all');
    if (onMemberChange) {
      onMemberChange(null);
    }
  };

  const toggleCountry = (countryId: string) => {
    setExpandedCountries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(countryId)) {
        newSet.delete(countryId);
      } else {
        newSet.add(countryId);
      }
      return newSet;
    });
  };

  const getCountryCode = (countryName: string): string => {
    // Scotland should always use its own flag, not the GB Union Jack
    if (countryName?.toLowerCase().includes("scotland")) {
      return "GB-SCT";
    }
    const found = allCountriesData.find((c) => c.name === countryName);
    return found?.code || "";
  };

  const handleUpdate = () => {
    onUpdate();
    refetchVisitDetails();
  };

  const handleToggleVisit = async (countryId: string, memberId: string, isVisited: boolean) => {
    if (isVisited) {
      const { error } = await supabase
        .from("country_visits")
        .delete()
        .eq("country_id", countryId)
        .eq("family_member_id", memberId);

      if (error) {
        toast({ title: "Error updating visit", variant: "destructive" });
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        return;
      }
      const { error } = await supabase
        .from("country_visits")
        .insert([{ country_id: countryId, family_member_id: memberId, user_id: user.id }]);

      if (error) {
        toast({ title: "Error updating visit", variant: "destructive" });
        return;
      }
    }
    
    // Update the UI after successful toggle
    handleUpdate();
  };

  const handleDeleteClick = (countryId: string, countryName: string) => {
    setDeleteDialog({ open: true, countryId, countryName });
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("countries")
        .delete()
        .eq("id", deleteDialog.countryId);

      if (error) {
        toast({ title: "Error removing country", variant: "destructive" });
      } else {
        toast({ title: `${deleteDialog.countryName} removed successfully` });
        onUpdate();
      }
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ open: false, countryId: '', countryName: '' });
    }
  };

  return (
    <section id="countries-explored" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Countries We've Explored
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
            Our family's travel journey across the world
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CountryDialog
              familyMembers={familyMembers}
              triggerLabel="Quick Add Country"
              onSuccess={(newCountryId) => {
                handleUpdate();
                if (newCountryId) {
                  setExpandedCountries((prev) => new Set([...prev, newCountryId]));
                  setVisitDetailsDialogOpen((prev) => ({ ...prev, [newCountryId]: true }));
                }
              }}
            />
            <AddCountryWithDetailsDialog
              familyMembers={familyMembers}
              onSuccess={(newCountryId) => {
                handleUpdate();
                if (newCountryId) {
                  setExpandedCountries((prev) => new Set([...prev, newCountryId]));
                  setVisitDetailsDialogOpen((prev) => ({ ...prev, [newCountryId]: true }));
                }
              }}
            />
            <Button variant="outline" onClick={() => setAiFindDialogOpen(true)}>
              <Smartphone className="w-4 h-4 mr-2" />
              AI Find On My Phone
            </Button>
          </div>
          <AIFindOnMyPhoneDialog
            open={aiFindDialogOpen}
            onOpenChange={setAiFindDialogOpen}
            familyMembers={familyMembers}
            countries={countries}
            homeCountry={homeCountry}
            onSuccess={handleUpdate}
          />
        </div>

        {/* Filters */}
        {countries.length > 0 && (
          <div className="mb-6">
            <CountryFilters
              continents={continents}
              years={years}
              selectedContinent={selectedContinent}
              selectedYear={selectedYear}
              onContinentChange={setSelectedContinent}
              onYearChange={setSelectedYear}
              onClear={clearFilters}
              familyMembers={familyMembers}
              selectedMemberId={selectedMemberId}
              onMemberChange={onMemberChange}
            />
            {(selectedContinent !== 'all' || selectedYear !== 'all' || selectedMemberId) && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing {filteredCountries.length} of {countries.length} countries
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filteredCountries.map((country) => {
            const summary = getCountrySummary(country.id);
            const hasVisitDetails = visitDetails.filter((v) => v.country_id === country.id).length > 0;
            const hasTripLegs = (tripLegsByCountry[country.id]?.length ?? 0) > 0;
            const hasAtLeastOneTrip = hasVisitDetails || hasTripLegs;

            // Parse country name in case it has ISO2 prefix (legacy data: "AT Austria")
            const parsed = (country.name || "").match(/^([A-Z]{2})\s+(.+)$/);
            const codeFromName = parsed?.[1] || "";
            const displayName = parsed?.[2] || country.name;

            // Derive ISO2 code: check stored flag if it's a code, then name prefix, then lookup
            // Also check for region codes like GB-SCT for Scotland
            const rawFlag = (country.flag || "").trim();
            const storedFlag = rawFlag.toUpperCase();
            const isStoredFlagACode = /^[A-Z]{2}(-[A-Z]{3})?$/.test(storedFlag);

            // Scotland safeguard: if the stored emoji itself is the Scotland flag, always use GB-SCT
            const isScotlandEmoji = rawFlag.includes("🏴");

            const regionCode = getRegionCode(displayName) || getRegionCode(country.name);
            const countryCode = (
              (isScotlandEmoji ? "GB-SCT" : "") ||
              (isStoredFlagACode ? storedFlag : "") || 
              regionCode ||
              codeFromName || 
              getCountryCode(displayName) || 
              getCountryCode(country.name) || 
              ""
            ).toUpperCase();

            const isExpanded = expandedCountries.has(country.id);

            return (
              <Collapsible
                key={country.id}
                open={isExpanded}
                onOpenChange={() => toggleCountry(country.id)}
              >
                <div className="border rounded-lg bg-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <CountryFlag countryCode={countryCode} countryName={displayName} size="xl" />
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {displayName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {country.continent}
                            </Badge>
                            {summary.timesVisited > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {summary.timesVisited}x
                              </Badge>
                            )}
                            {summary.totalDays > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {summary.totalDays}d
                              </Badge>
                            )}
                            {summary.citiesCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {summary.citiesCount}
                              </Badge>
                            )}
                            {!hasAtLeastOneTrip && (
                              <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                No trips yet
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!hasAtLeastOneTrip && (
                          <Button
                            variant="default"
                            size="sm"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVisitDetailsDialogOpen((prev) => ({ ...prev, [country.id]: true }));
                            }}
                          >
                            Add Details
                          </Button>
                        )}
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <ChevronDown 
                          className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} 
                        />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4 bg-muted/20">
                      {/* Logged Trips Section */}
                      {(() => {
                        const countryTrips = visitDetails
                          .filter(v => v.country_id === country.id)
                          .sort((a, b) => {
                            // Sort by visit_date (most recent first), then by approximate_year
                            if (a.visit_date && b.visit_date) {
                              try {
                                const dateA = new Date(a.visit_date);
                                const dateB = new Date(b.visit_date);
                                if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                                  return dateB.getTime() - dateA.getTime();
                                }
                              } catch {
                                // Fall through to approximate_year comparison
                              }
                            }
                            if (a.visit_date) {
                              try {
                                const dateA = new Date(a.visit_date);
                                if (!isNaN(dateA.getTime())) return -1;
                              } catch {
                                // Fall through
                              }
                            }
                            if (b.visit_date) {
                              try {
                                const dateB = new Date(b.visit_date);
                                if (!isNaN(dateB.getTime())) return 1;
                              } catch {
                                // Fall through
                              }
                            }
                            if (a.approximate_year && b.approximate_year) {
                              return b.approximate_year - a.approximate_year;
                            }
                            return 0;
                          });

                        return countryTrips.length > 0 ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Logged Trips ({countryTrips.length})
                            </p>
                            <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                              {countryTrips.map((trip) => {
                                // Build date display - prioritize exact dates
                                let dateDisplay = "";
                                let hasExactDate = false;
                                
                                if (trip.visit_date) {
                                  try {
                                    const startDate = format(parseISO(trip.visit_date), "MMM d, yyyy");
                                    if (trip.end_date) {
                                      try {
                                        const endDate = format(parseISO(trip.end_date), "MMM d, yyyy");
                                        dateDisplay = `${startDate} - ${endDate}`;
                                        hasExactDate = true;
                                      } catch {
                                        dateDisplay = startDate;
                                        hasExactDate = true;
                                      }
                                    } else {
                                      dateDisplay = startDate;
                                      hasExactDate = true;
                                    }
                                  } catch {
                                    dateDisplay = trip.visit_date || "";
                                  }
                                } else if (trip.approximate_year) {
                                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                  const monthName = trip.approximate_month && trip.approximate_month >= 1 && trip.approximate_month <= 12
                                    ? months[trip.approximate_month - 1]
                                    : "";
                                  dateDisplay = [monthName, trip.approximate_year].filter(Boolean).join(" ") || `${trip.approximate_year}`;
                                }
                                
                                const daysText = trip.number_of_days ? `${trip.number_of_days} day${trip.number_of_days !== 1 ? "s" : ""}` : "";
                                const tripTitle = trip.trip_name?.trim() || null;
                                
                                return (
                                  <button
                                    key={trip.id}
                                    type="button"
                                    className="w-full text-left rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setVisitDetailsDialogOpen(prev => ({ ...prev, [country.id]: true }));
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <Calendar className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1 space-y-0.5">
                                        {tripTitle && (
                                          <p className="text-sm font-medium text-foreground leading-tight">
                                            {tripTitle}
                                          </p>
                                        )}
                                        {!tripTitle && dateDisplay && (
                                          <p className="text-sm font-medium text-foreground leading-tight">
                                            {dateDisplay}
                                          </p>
                                        )}
                                        {!tripTitle && !dateDisplay && (
                                          <p className="text-sm text-muted-foreground">Date unknown</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                          {dateDisplay && tripTitle && <span>{dateDisplay}</span>}
                                          {daysText && (
                                            <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                              <Clock className="h-3 w-3 mr-0.5 inline" />
                                              {daysText}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Trip Legs from Multi-Country Trips */}
                      {tripLegsByCountry[country.id]?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            <Plane className="inline w-3 h-3 mr-1" />
                            From Multi-Country Trips ({tripLegsByCountry[country.id].length})
                          </p>
                          <div className="max-h-40 overflow-y-auto pr-1 space-y-2">
                            {tripLegsByCountry[country.id]
                              .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                              .map((leg) => {
                                const legDays = leg.start_date && leg.end_date
                                  ? differenceInDays(parseISO(leg.end_date), parseISO(leg.start_date)) + 1
                                  : leg.number_of_days;
                                
                                const dateDisplay = leg.start_date && leg.end_date
                                  ? `${format(parseISO(leg.start_date), "MMM d")} - ${format(parseISO(leg.end_date), "MMM d, yyyy")}`
                                  : leg.start_date
                                    ? format(parseISO(leg.start_date), "MMM d, yyyy")
                                    : "";
                                
                                return (
                                  <Link
                                    key={leg.id}
                                    to={`/trips/${leg.trip_id}`}
                                    className="flex items-start gap-3 w-full rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm transition-all hover:border-secondary/40 hover:bg-secondary/5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:ring-offset-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
                                      <Plane className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                        <span>{dateDisplay}</span>
                                        {legDays > 0 && (
                                          <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                            <Clock className="h-3 w-3 mr-0.5 inline" />
                                            {legDays} day{legDays !== 1 ? "s" : ""}
                                          </span>
                                        )}
                                      </div>
                                      {leg.cities && leg.cities.length > 0 && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {leg.cities.join(", ")}
                                        </p>
                                      )}
                                    </div>
                                    <ExternalLink className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                  </Link>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {summary.cities.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Cities visited ({summary.cities.length}):
                          </p>
                          <div className="max-h-64 overflow-y-auto pr-1">
                            <div className="flex flex-wrap gap-1">
                              {summary.cities.sort().map((city) => (
                                <Badge key={city} variant="outline" className="text-xs bg-background">
                                  {city}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Visited by:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {familyMembers.map((member) => {
                            const isVisited = country.visitedBy.includes(member.name);
                            return (
                              <div key={member.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${country.id}-${member.id}`}
                                  checked={isVisited}
                                  onCheckedChange={() => handleToggleVisit(country.id, member.id, isVisited)}
                                />
                                <label
                                  htmlFor={`${country.id}-${member.id}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {member.name}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 flex-wrap">
                        <CountryVisitDetailsDialog
                          countryId={country.id}
                          countryName={country.name}
                          countryCode={countryCode}
                          onUpdate={handleUpdate}
                          buttonLabel={hasAtLeastOneTrip ? "View / Add Trips" : "Add Details"}
                          initialFamilyMemberIds={
                            // Pre-select family members who already visited this country (from quick add)
                            familyMembers
                              .filter((m) => country.visitedBy.includes(m.name))
                              .map((m) => m.id)
                          }
                          open={visitDetailsDialogOpen[country.id]}
                          onOpenChange={(open) => {
                            setVisitDetailsDialogOpen(prev => ({ ...prev, [country.id]: open }));
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(country.id, displayName);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove Country
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        <DeleteConfirmDialog
          open={deleteDialog.open}
          onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
          onConfirm={handleDeleteConfirm}
          title="Remove Country"
          description={`Are you sure you want to remove this country from your list of places visited? This action cannot be undone.`}
          itemName={deleteDialog.countryName}
          loading={isDeleting}
        />
      </div>
    </section>
  );
};

export default CountryTracker;