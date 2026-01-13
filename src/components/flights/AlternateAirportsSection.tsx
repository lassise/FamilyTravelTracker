import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Car, Plus, X, DollarSign, Plane } from "lucide-react";
import { searchAirports, type Airport } from "@/lib/airportsData";
import type { AlternateAirport } from "@/hooks/useFlightPreferences";

interface AlternateAirportsSectionProps {
  alternateAirports: AlternateAirport[];
  onUpdate: (airports: AlternateAirport[]) => void;
}

export const AlternateAirportsSection = ({
  alternateAirports,
  onUpdate,
}: AlternateAirportsSectionProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Airport[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [minSavings, setMinSavings] = useState<number | "">(100);

  const handleSearch = (value: string) => {
    setSearchQuery(value.toUpperCase());
    if (value.length >= 2) {
      setSearchResults(searchAirports(value));
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setSearchQuery(`${airport.code} - ${airport.city}`);
    setShowResults(false);
  };

  const handleAddAirport = () => {
    if (!selectedAirport) return;
    
    // Check if already exists
    if (alternateAirports.some(a => a.code === selectedAirport.code)) {
      return;
    }

    const newAirport: AlternateAirport = {
      code: selectedAirport.code,
      name: `${selectedAirport.city} (${selectedAirport.name})`,
      minSavings: minSavings === "" ? 0 : minSavings,
    };

    onUpdate([...alternateAirports, newAirport]);
    setIsAdding(false);
    setSearchQuery("");
    setSelectedAirport(null);
    setMinSavings(100);
  };

  const handleRemoveAirport = (code: string) => {
    onUpdate(alternateAirports.filter(a => a.code !== code));
  };

  const handleUpdateSavings = (code: string, newMinSavings: number) => {
    onUpdate(
      alternateAirports.map(a =>
        a.code === code ? { ...a, minSavings: newMinSavings } : a
      )
    );
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Car className="h-4 w-4 text-muted-foreground" />
        <Label className="font-medium">Alternate Airports for Savings</Label>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Add airports you're willing to drive to if the savings are worth it. We'll search these alongside your primary airport.
      </p>

      {/* Current alternate airports */}
      {alternateAirports.length > 0 && (
        <div className="space-y-2 mb-4">
          {alternateAirports.map((airport) => (
            <div
              key={airport.code}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                <span className="font-medium">{airport.code}</span>
                <span className="text-sm text-muted-foreground">{airport.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <Input
                    type="number"
                    value={airport.minSavings ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleUpdateSavings(airport.code, val === "" ? 0 : Number(val));
                    }}
                    className="w-20 h-8 text-sm"
                    min={0}
                    step={25}
                  />
                  <span className="text-xs text-muted-foreground">min savings</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAirport(airport.code)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new alternate airport */}
      {isAdding ? (
        <div className="p-4 border rounded-lg space-y-4 bg-background">
          <div className="relative">
            <Label className="text-sm mb-1 block">Search Airport</Label>
            <Input
              placeholder="Enter city or airport code..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                {searchResults.map((a) => (
                  <button
                    key={a.code}
                    className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                    onClick={() => handleSelectAirport(a)}
                  >
                    <span className="font-medium">{a.code}</span> - {a.city} ({a.name})
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedAirport && (
            <>
              <div>
                <Label className="text-sm mb-1 block">Minimum Savings Required ($)</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={minSavings}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMinSavings(val === "" ? "" : Number(val));
                    }}
                    min={0}
                    step={25}
                    className="w-32"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Only show flights from {selectedAirport.code} if they save at least ${minSavings}
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddAirport} size="sm">
                  Add Airport
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setSearchQuery("");
                    setSelectedAirport(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Alternate Airport
        </Button>
      )}

      {alternateAirports.length > 0 && (
        <p className="text-xs text-muted-foreground mt-3">
          <Badge variant="secondary" className="text-xs mr-1">Tip</Badge>
          When searching flights, we'll check {alternateAirports.length} alternate airport{alternateAirports.length > 1 ? 's' : ''} for better deals.
        </p>
      )}
    </div>
  );
};
