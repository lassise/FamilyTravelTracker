import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe2, MapPin } from "lucide-react";
import { Country } from "@/hooks/useFamilyData";

interface ContinentBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countries: Country[];
  homeCountryName?: string;
}

const CONTINENTS = [
  { name: "Africa", icon: "🌍" },
  { name: "Asia", icon: "🌏" },
  { name: "Europe", icon: "🌍" },
  { name: "North America", icon: "🌎" },
  { name: "South America", icon: "🌎" },
  { name: "Oceania", icon: "🌏" },
  { name: "Antarctica", icon: "🧊" },
];

const ContinentBreakdownDialog = memo(({
  open,
  onOpenChange,
  countries,
  homeCountryName,
}: ContinentBreakdownDialogProps) => {
  // Get visited countries excluding home country
  const visitedCountries = countries.filter(
    c => c.visitedBy.length > 0 && c.name !== homeCountryName
  );

  // Group by continent
  const continentData = CONTINENTS.map(continent => {
    const countriesInContinent = visitedCountries.filter(
      c => c.continent === continent.name
    );
    return {
      ...continent,
      count: countriesInContinent.length,
      countries: countriesInContinent.map(c => c.name).sort(),
    };
  }).filter(c => c.count > 0);

  const totalContinents = continentData.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            Continent Breakdown
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            You've explored {totalContinents} of 7 continents
          </p>

          <div className="space-y-3">
            {continentData.map((continent) => (
              <div
                key={continent.name}
                className="p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{continent.icon}</span>
                    <span className="font-medium">{continent.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {continent.count} {continent.count === 1 ? 'country' : 'countries'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {continent.countries.map((country) => (
                    <span
                      key={country}
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-background border border-border"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                      {country}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {totalContinents === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No continents explored yet</p>
              <p className="text-sm">Start adding countries to track your journey!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

ContinentBreakdownDialog.displayName = "ContinentBreakdownDialog";

export default ContinentBreakdownDialog;
