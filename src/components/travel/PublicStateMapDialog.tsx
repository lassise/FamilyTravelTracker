import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MapPin, CheckCircle2, Search } from "lucide-react";
import { toast } from "sonner";

import { getSubdivisionsForCountry, getSubdivisionLabel } from "@/lib/allSubdivisionsData";
import { getAllCountries, getEffectiveFlagCode } from "@/lib/countriesData";
import CountryFlag from "@/components/common/CountryFlag";
import StateGridSelector from "@/components/travel/StateGridSelector";

import type { Country } from "@/hooks/useFamilyData";
import type { StateVisit } from "@/hooks/useStateVisits";

interface PublicStateMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null;
  stateVisits: StateVisit[];
}

const PublicStateMapDialog = ({ open, onOpenChange, country, stateVisits }: PublicStateMapDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const countryCode = useMemo(() => {
    if (!country) return null;
    const all = getAllCountries();
    return all.find((c) => c.name === country.name)?.code || null;
  }, [country]);

  const continentalUSStates = useMemo(
    () =>
      new Set([
        "US-AL",
        "US-AZ",
        "US-AR",
        "US-CA",
        "US-CO",
        "US-CT",
        "US-DE",
        "US-FL",
        "US-GA",
        "US-ID",
        "US-IL",
        "US-IN",
        "US-IA",
        "US-KS",
        "US-KY",
        "US-LA",
        "US-ME",
        "US-MD",
        "US-MA",
        "US-MI",
        "US-MN",
        "US-MS",
        "US-MO",
        "US-MT",
        "US-NE",
        "US-NV",
        "US-NH",
        "US-NJ",
        "US-NM",
        "US-NY",
        "US-NC",
        "US-ND",
        "US-OH",
        "US-OK",
        "US-OR",
        "US-PA",
        "US-RI",
        "US-SC",
        "US-SD",
        "US-TN",
        "US-TX",
        "US-UT",
        "US-VT",
        "US-VA",
        "US-WA",
        "US-WV",
        "US-WI",
        "US-WY",
        "US-AK",
        "US-HI",
      ]),
    []
  );

  const states = useMemo(() => {
    if (!countryCode) return null;
    const allStates = getSubdivisionsForCountry(countryCode);
    if (!allStates) return null;

    if (countryCode === "US") {
      const filtered: Record<string, string> = {};
      Object.entries(allStates).forEach(([code, name]) => {
        if (continentalUSStates.has(code)) filtered[code] = name;
      });
      return Object.fromEntries(Object.entries(filtered).sort(([, a], [, b]) => a.localeCompare(b)));
    }

    return Object.fromEntries(Object.entries(allStates).sort(([, a], [, b]) => a.localeCompare(b)));
  }, [countryCode, continentalUSStates]);

  const filteredStates = useMemo(() => {
    if (!states) return null;
    if (!searchQuery.trim()) return states;
    const q = searchQuery.toLowerCase();
    const filtered: Record<string, string> = {};
    Object.entries(states).forEach(([code, name]) => {
      if (name.toLowerCase().includes(q) || code.toLowerCase().includes(q)) filtered[code] = name;
    });
    return Object.fromEntries(Object.entries(filtered).sort(([, a], [, b]) => a.localeCompare(b)));
  }, [states, searchQuery]);

  const visitedStateCodes = useMemo(() => {
    if (!countryCode) return new Set<string>();
    return new Set(stateVisits.filter((sv) => sv.country_code === countryCode).map((sv) => sv.state_code));
  }, [stateVisits, countryCode]);

  useEffect(() => {
    if (!open) setSearchQuery("");
  }, [open]);

  if (!country || !countryCode || !states) return null;

  const entries = Object.entries(states);
  const visitedCount = visitedStateCodes.size;
  const totalCount = entries.length;
  const progressPercent = Math.round((visitedCount / totalCount) * 100);
  const regionLabel = getSubdivisionLabel(countryCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-full bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {(() => {
                  const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                  return isSubdivision || code ? (
                    <CountryFlag countryCode={code} countryName={country.name} size="lg" />
                  ) : (
                    <span className="text-2xl">{country.flag}</span>
                  );
                })()}
                <span>{country.name}</span>
              </div>
              <p className="text-sm text-muted-foreground font-normal mt-0.5">
                Read-only view of visited {regionLabel.toLowerCase()}.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${regionLabel.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <Badge variant="default" className="text-sm px-3 py-1 bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {visitedCount} / {totalCount}
              </Badge>
              <div className="hidden md:flex items-center gap-2 min-w-[120px]">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground w-10">{progressPercent}%</span>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(90vh-280px)] min-h-[300px]">
            <div className="pr-4">
              {filteredStates && Object.keys(filteredStates).length > 0 ? (
                <StateGridSelector
                  states={filteredStates}
                  selectedStates={visitedStateCodes}
                  onStateClick={() => toast.info("Read-only: sign in to edit region visits")}
                  countryCode={countryCode}
                />
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  No {regionLabel.toLowerCase()} found matching "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublicStateMapDialog;
