import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Globe2 } from "lucide-react";
import type { Country, FamilyMember } from "@/hooks/useFamilyData";

interface ContinentFilterProps {
  countries: Country[];
  familyMembers: FamilyMember[];
}

const ContinentFilter = ({ countries, familyMembers }: ContinentFilterProps) => {
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);

  // Group countries by continent
  const continentGroups = countries.reduce((acc, country) => {
    if (!acc[country.continent]) {
      acc[country.continent] = [];
    }
    acc[country.continent].push(country);
    return acc;
  }, {} as Record<string, Country[]>);

  const continents = Object.keys(continentGroups).sort();

  const isVisitedByAnyone = (country: Country) => country.visitedBy.length > 0;
  const isVisitedByAll = (country: Country) => 
    country.visitedBy.length === familyMembers.length;

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-foreground">
            Explore by Continent
          </h2>
          <p className="text-muted-foreground">
            View countries visited across all continents
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {continents.map((continent) => {
            const continentCountries = continentGroups[continent];
            const anyoneVisited = continentCountries.filter(isVisitedByAnyone).length;
            const allVisited = continentCountries.filter(isVisitedByAll).length;

            return (
              <DropdownMenu key={continent} modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between h-auto py-3 hover:bg-muted/50 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-2">
                      <Globe2 className="w-4 h-4 text-primary" />
                      <div className="text-left">
                        <div className="font-medium text-sm text-foreground">{continent}</div>
                        <div className="text-xs text-muted-foreground">
                          {continentCountries.length} countries
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {anyoneVisited}/{continentCountries.length}
                      </Badge>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-80 max-h-80 overflow-y-auto bg-background z-50"
                  align="start"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>{continent}</span>
                    <Badge variant="outline">
                      {continentCountries.length} countries
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary" />
                      <span>Anyone visited: {anyoneVisited}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500" />
                      <span>Whole family: {allVisited}</span>
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  {continentCountries
                    .sort((a, b) => {
                      const aVisited = isVisitedByAnyone(a);
                      const bVisited = isVisitedByAnyone(b);
                      
                      // Visited countries first, then unvisited
                      if (aVisited && !bVisited) return -1;
                      if (!aVisited && bVisited) return 1;
                      
                      // Within each group, sort alphabetically
                      return a.name.localeCompare(b.name);
                    })
                    .map((country) => {
                      const visitedByAnyone = isVisitedByAnyone(country);
                      const visitedByAll = isVisitedByAll(country);
                      
                      return (
                        <DropdownMenuCheckboxItem
                          key={country.id}
                          checked={visitedByAnyone}
                          onSelect={(e) => e.preventDefault()}
                          className="gap-2"
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-lg">{country.flag}</span>
                              <span className={`text-sm truncate ${!visitedByAnyone ? 'text-muted-foreground' : ''}`}>
                                {country.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {visitedByAll ? (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-1.5 py-0 h-5 bg-green-500/10 border-green-500"
                                >
                                  ✓
                                </Badge>
                              ) : visitedByAnyone ? (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-1.5 py-0 h-5 bg-primary/10 border-primary"
                                >
                                  {country.visitedBy.length}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ContinentFilter;
