import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Trash2, Calendar, MapPin, Clock, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CountryDialog from "./CountryDialog";
import CountryVisitDetailsDialog from "./CountryVisitDetailsDialog";
import { Country } from "@/hooks/useFamilyData";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { getAllCountries, getRegionCode } from "@/lib/countriesData";
import { cn } from "@/lib/utils";
import CountryFlag from "./common/CountryFlag";
import CountryFilters from "./travel/CountryFilters";
import DeleteConfirmDialog from "./common/DeleteConfirmDialog";

interface CountryTrackerProps {
  countries: Country[];
  familyMembers: Array<{ id: string; name: string }>;
  onUpdate: () => void;
}

const CountryTracker = ({ countries, familyMembers, onUpdate }: CountryTrackerProps) => {
  const { toast } = useToast();
  const { visitDetails, getCountrySummary, refetch: refetchVisitDetails } = useVisitDetails();
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

  // Get unique continents and years from countries
  const { continents, years } = useMemo(() => {
    const continentSet = new Set<string>();
    const yearSet = new Set<number>();
    
    countries.forEach(c => continentSet.add(c.continent));
    
    visitDetails.forEach(v => {
      if (v.visit_date) {
        yearSet.add(new Date(v.visit_date).getFullYear());
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
    
    if (selectedContinent !== 'all') {
      result = result.filter(c => c.continent === selectedContinent);
    }
    
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear);
      const countryIdsForYear = new Set(
        visitDetails
          .filter(v => {
            if (v.visit_date) {
              return new Date(v.visit_date).getFullYear() === year;
            }
            return v.approximate_year === year;
          })
          .map(v => v.country_id)
      );
      result = result.filter(c => countryIdsForYear.has(c.id));
    }
    
    return result;
  }, [countries, selectedContinent, selectedYear, visitDetails]);

  const clearFilters = () => {
    setSelectedContinent('all');
    setSelectedYear('all');
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
      }
    }
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
        toast({ title: "Error deleting country", variant: "destructive" });
      } else {
        toast({ title: `${deleteDialog.countryName} deleted successfully` });
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
          <CountryDialog familyMembers={familyMembers} onSuccess={handleUpdate} />
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
            />
            {(selectedContinent !== 'all' || selectedYear !== 'all') && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing {filteredCountries.length} of {countries.length} countries
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {filteredCountries.map((country) => {
            const summary = getCountrySummary(country.id);

            // Parse country name in case it has ISO2 prefix (legacy data: "AT Austria")
            const parsed = (country.name || "").match(/^([A-Z]{2})\s+(.+)$/);
            const codeFromName = parsed?.[1] || "";
            const displayName = parsed?.[2] || country.name;

            // Derive ISO2 code: check stored flag if it's a code, then name prefix, then lookup
            // Also check for region codes like GB-SCT for Scotland
            const storedFlag = (country.flag || "").trim().toUpperCase();
            const isStoredFlagACode = /^[A-Z]{2}(-[A-Z]{3})?$/.test(storedFlag);
            const regionCode = getRegionCode(displayName) || getRegionCode(country.name);
            const countryCode = (
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
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
                      {summary.cities.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Cities visited ({summary.cities.length}):
                          </p>
                          <div className="max-h-32 overflow-y-auto pr-1">
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
                          buttonLabel="View / Add Trips"
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
                          Delete
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
          title="Delete Country"
          description={`Are you sure you want to delete this country? This action cannot be undone.`}
          itemName={deleteDialog.countryName}
          loading={isDeleting}
        />
      </div>
    </section>
  );
};

export default CountryTracker;