import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, Users, Maximize, Minimize, Globe, MapPin,
  Building, TreePine, Waves, Mountain
} from "lucide-react";
import { Country } from "@/hooks/useFamilyData";
import { 
  countryMetadata, 
  getCountryMetadataByName,
  CountryMetadata 
} from "@/lib/countryMetadata";

interface CountryComparisonProps {
  countries: Country[];
}

interface RegionData {
  name: string;
  count: number;
  color: string;
}

const CountryComparison = ({ countries }: CountryComparisonProps) => {
  const visitedCountries = countries.filter(c => c.visitedBy.length > 0);
  
  // Get metadata for all visited countries
  const visitedWithMetadata = visitedCountries
    .map(c => ({ country: c, metadata: getCountryMetadataByName(c.name) }))
    .filter((item): item is { country: Country; metadata: CountryMetadata } => 
      item.metadata !== undefined
    );
  
  // Calculate regional distribution
  const regionCounts: Record<string, number> = {};
  visitedWithMetadata.forEach(({ metadata }) => {
    regionCounts[metadata.region] = (regionCounts[metadata.region] || 0) + 1;
  });
  
  const regionColors: Record<string, string> = {
    'Europe': 'bg-blue-500',
    'Asia': 'bg-red-500',
    'North America': 'bg-green-500',
    'South America': 'bg-yellow-500',
    'Africa': 'bg-orange-500',
    'Oceania': 'bg-cyan-500',
    'Central America': 'bg-lime-500',
    'Caribbean': 'bg-pink-500',
    'Middle East': 'bg-amber-500',
    'Europe/Asia': 'bg-purple-500',
  };
  
  const regions: RegionData[] = Object.entries(regionCounts)
    .map(([name, count]) => ({ 
      name, 
      count,
      color: regionColors[name] || 'bg-gray-500'
    }))
    .sort((a, b) => b.count - a.count);
  
  // Population statistics
  const populationStats = visitedWithMetadata.map(({ country, metadata }) => ({
    name: country.name,
    population: metadata.population,
  })).sort((a, b) => b.population - a.population);
  
  const totalPopulation = populationStats.reduce((sum, c) => sum + c.population, 0);
  
  // Area statistics
  const areaStats = visitedWithMetadata.map(({ country, metadata }) => ({
    name: country.name,
    area: metadata.area,
  })).sort((a, b) => b.area - a.area);
  
  const totalArea = areaStats.reduce((sum, c) => sum + c.area, 0);
  
  // Geographic type breakdown
  const geographicTypes = {
    islands: visitedWithMetadata.filter(({ metadata }) => metadata.isIsland).length,
    landlocked: visitedWithMetadata.filter(({ metadata }) => metadata.isLandlocked).length,
    coastal: visitedWithMetadata.filter(({ metadata }) => !metadata.isIsland && !metadata.isLandlocked).length,
  };
  
  // Population density ranking
  const densityStats = visitedWithMetadata.map(({ country, metadata }) => ({
    name: country.name,
    density: (metadata.population * 1000000) / metadata.area,
  })).sort((a, b) => b.density - a.density);

  const maxRegionCount = Math.max(...regions.map(r => r.count));

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <BarChart3 className="h-5 w-5 text-primary" />
          Country Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Regional Distribution */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Regional Distribution
          </h4>
          <div className="space-y-2">
            {regions.slice(0, 6).map((region) => (
              <div key={region.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${region.color}`} />
                <span className="text-sm text-foreground flex-1">{region.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${region.color}`}
                      style={{ width: `${(region.count / maxRegionCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground w-6 text-right">
                    {region.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Types */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Geographic Types
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-cyan-500/10 text-center">
              <Waves className="w-5 h-5 mx-auto mb-1 text-cyan-500" />
              <p className="text-lg font-bold text-foreground">{geographicTypes.islands}</p>
              <p className="text-xs text-muted-foreground">Islands</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 text-center">
              <Mountain className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-lg font-bold text-foreground">{geographicTypes.landlocked}</p>
              <p className="text-xs text-muted-foreground">Landlocked</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10 text-center">
              <TreePine className="w-5 h-5 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold text-foreground">{geographicTypes.coastal}</p>
              <p className="text-xs text-muted-foreground">Coastal</p>
            </div>
          </div>
        </div>

        {/* Population & Area Stats */}
        <div className="grid grid-cols-2 gap-4">
          {/* Population */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Population Reached
            </h4>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-foreground">
                {totalPopulation >= 1000 
                  ? `${(totalPopulation / 1000).toFixed(1)}B`
                  : `${Math.round(totalPopulation)}M`}
              </p>
              <p className="text-xs text-muted-foreground">
                Total population
              </p>
            </div>
            {populationStats.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Maximize className="w-3 h-3" /> Largest
                  </span>
                  <span className="text-foreground">{populationStats[0].name}</span>
                </div>
                {populationStats.length > 1 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Minimize className="w-3 h-3" /> Smallest
                    </span>
                    <span className="text-foreground">
                      {populationStats[populationStats.length - 1].name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Area */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Area Explored
            </h4>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xl font-bold text-foreground">
                {totalArea >= 1000000 
                  ? `${(totalArea / 1000000).toFixed(1)}M`
                  : `${Math.round(totalArea / 1000)}K`} km²
              </p>
              <p className="text-xs text-muted-foreground">
                Total land area
              </p>
            </div>
            {areaStats.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Maximize className="w-3 h-3" /> Largest
                  </span>
                  <span className="text-foreground">{areaStats[0].name}</span>
                </div>
                {areaStats.length > 1 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Minimize className="w-3 h-3" /> Smallest
                    </span>
                    <span className="text-foreground">
                      {areaStats[areaStats.length - 1].name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Density Extremes */}
        {densityStats.length >= 2 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Building className="w-4 h-4" />
              Population Density Extremes
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <p className="text-xs text-red-500 font-medium">Most Dense</p>
                <p className="text-sm font-medium text-foreground">{densityStats[0].name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(densityStats[0].density).toLocaleString()} /km²
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <p className="text-xs text-green-500 font-medium">Least Dense</p>
                <p className="text-sm font-medium text-foreground">
                  {densityStats[densityStats.length - 1].name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(densityStats[densityStats.length - 1].density).toLocaleString()} /km²
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CountryComparison;
