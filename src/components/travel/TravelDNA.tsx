import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Compass, MapPin, Calendar, Plane, Globe, 
  Thermometer, Mountain, Waves, ArrowRight, Sparkles
} from "lucide-react";
import { Country } from "@/hooks/useFamilyData";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { 
  countryMetadata, 
  calculateDistance, 
  getCountryMetadataByName 
} from "@/lib/countryMetadata";
import { format, differenceInDays, parseISO } from "date-fns";
import GeographicDetailsDialog, { GeographicType } from "./GeographicDetailsDialog";

interface TravelDNAProps {
  countries: Country[];
  homeCountryCode?: string;
}

const TravelDNA = ({ countries, homeCountryCode = 'US' }: TravelDNAProps) => {
  const { visitDetails } = useVisitDetails();
  
  const visitedCountries = countries.filter(c => c.visitedBy.length > 0);
  
  // Get home country metadata
  const homeCountry = countryMetadata[homeCountryCode] || countryMetadata['US'];
  
  // Calculate various insights
  const insights = calculateInsights();
  
  function calculateInsights() {
    // First and most recent visits
    const sortedVisits = [...visitDetails]
      .filter(v => v.visit_date)
      .sort((a, b) => new Date(a.visit_date!).getTime() - new Date(b.visit_date!).getTime());
    
    const firstVisit = sortedVisits[0];
    const lastVisit = sortedVisits[sortedVisits.length - 1];
    
    // Longest and shortest trips
    const tripsWithDuration = visitDetails.filter(v => v.number_of_days && v.number_of_days > 0);
    const longestTrip = tripsWithDuration.length > 0
      ? tripsWithDuration.reduce((max, v) => (v.number_of_days || 0) > (max.number_of_days || 0) ? v : max)
      : null;
    const shortestTrip = tripsWithDuration.length > 0
      ? tripsWithDuration.reduce((min, v) => (v.number_of_days || 0) < (min.number_of_days || 0) ? v : min)
      : null;
    
    // Furthest point from home
    let furthestCountry: { name: string; distance: number } | null = null;
    visitedCountries.forEach(country => {
      const metadata = getCountryMetadataByName(country.name);
      if (metadata && homeCountry) {
        const distance = calculateDistance(
          homeCountry.lat, homeCountry.lng,
          metadata.lat, metadata.lng
        );
        if (!furthestCountry || distance > furthestCountry.distance) {
          furthestCountry = { name: country.name, distance };
        }
      }
    });
    
    // Hemispheres visited
    const hemispheres = {
      north: false,
      south: false,
      east: false,
      west: false
    };
    visitedCountries.forEach(country => {
      const metadata = getCountryMetadataByName(country.name);
      if (metadata) {
        if (metadata.hemisphere.northSouth === 'north' || metadata.hemisphere.northSouth === 'both') hemispheres.north = true;
        if (metadata.hemisphere.northSouth === 'south' || metadata.hemisphere.northSouth === 'both') hemispheres.south = true;
        if (metadata.hemisphere.eastWest === 'east' || metadata.hemisphere.eastWest === 'both') hemispheres.east = true;
        if (metadata.hemisphere.eastWest === 'west' || metadata.hemisphere.eastWest === 'both') hemispheres.west = true;
      }
    });
    const hemisphereCount = Object.values(hemispheres).filter(Boolean).length;
    
    // Island nations count
    const islandCount = visitedCountries.filter(country => {
      const metadata = getCountryMetadataByName(country.name);
      return metadata?.isIsland;
    }).length;
    
    // Landlocked countries count
    const landlockedCount = visitedCountries.filter(country => {
      const metadata = getCountryMetadataByName(country.name);
      return metadata?.isLandlocked;
    }).length;
    
    // G7/G20 countries
    const g7Count = visitedCountries.filter(country => {
      const metadata = getCountryMetadataByName(country.name);
      return metadata?.g7;
    }).length;
    const g20Count = visitedCountries.filter(country => {
      const metadata = getCountryMetadataByName(country.name);
      return metadata?.g20;
    }).length;
    
    // Total distance traveled (sum of distances from home to each country)
    let totalDistance = 0;
    visitedCountries.forEach(country => {
      const metadata = getCountryMetadataByName(country.name);
      if (metadata && homeCountry) {
        totalDistance += calculateDistance(
          homeCountry.lat, homeCountry.lng,
          metadata.lat, metadata.lng
        );
      }
    });
    
    // Average trip length
    const avgTripLength = tripsWithDuration.length > 0
      ? tripsWithDuration.reduce((sum, v) => sum + (v.number_of_days || 0), 0) / tripsWithDuration.length
      : 0;
    
    // Countries by population extremes
    let smallestPop: { name: string; pop: number } | null = null;
    let largestPop: { name: string; pop: number } | null = null;
    let smallestArea: { name: string; area: number } | null = null;
    let largestArea: { name: string; area: number } | null = null;
    
    visitedCountries.forEach(country => {
      const metadata = getCountryMetadataByName(country.name);
      if (metadata) {
        if (!smallestPop || metadata.population < smallestPop.pop) {
          smallestPop = { name: country.name, pop: metadata.population };
        }
        if (!largestPop || metadata.population > largestPop.pop) {
          largestPop = { name: country.name, pop: metadata.population };
        }
        if (!smallestArea || metadata.area < smallestArea.area) {
          smallestArea = { name: country.name, area: metadata.area };
        }
        if (!largestArea || metadata.area > largestArea.area) {
          largestArea = { name: country.name, area: metadata.area };
        }
      }
    });
    
    return {
      firstVisit,
      lastVisit,
      longestTrip,
      shortestTrip,
      furthestCountry,
      hemispheres,
      hemisphereCount,
      islandCount,
      landlockedCount,
      g7Count,
      g20Count,
      totalDistance,
      avgTripLength,
      smallestPop,
      largestPop,
      smallestArea,
      largestArea,
    };
  }
  
  const getCountryName = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    return country?.name || 'Unknown';
  };
  
  const dnaCards = [
    {
      icon: MapPin,
      label: "First Adventure",
      value: insights.firstVisit 
        ? `${getCountryName(insights.firstVisit.country_id)}`
        : "Not recorded",
      sublabel: insights.firstVisit?.visit_date 
        ? format(parseISO(insights.firstVisit.visit_date), 'MMM yyyy')
        : undefined,
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      icon: Calendar,
      label: "Most Recent",
      value: insights.lastVisit 
        ? `${getCountryName(insights.lastVisit.country_id)}`
        : "Not recorded",
      sublabel: insights.lastVisit?.visit_date 
        ? format(parseISO(insights.lastVisit.visit_date), 'MMM yyyy')
        : undefined,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Compass,
      label: "Furthest From Home",
      value: insights.furthestCountry 
        ? `${insights.furthestCountry.name}`
        : "Calculate more",
      sublabel: insights.furthestCountry 
        ? `${Math.round(insights.furthestCountry.distance).toLocaleString()} km away`
        : undefined,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: Plane,
      label: "Total Distance",
      value: `${Math.round(insights.totalDistance).toLocaleString()} km`,
      sublabel: `~${Math.round(insights.totalDistance / 40075)} trips around Earth`,
      gradient: "from-orange-500 to-red-500",
    },
    {
      icon: Globe,
      label: "Hemispheres",
      value: `${insights.hemisphereCount}/4`,
      sublabel: [
        insights.hemispheres.north && 'N',
        insights.hemispheres.south && 'S',
        insights.hemispheres.east && 'E',
        insights.hemispheres.west && 'W'
      ].filter(Boolean).join(' • ') || 'None yet',
      gradient: "from-indigo-500 to-violet-500",
    },
    {
      icon: Thermometer,
      label: "Longest Trip",
      value: insights.longestTrip 
        ? `${insights.longestTrip.number_of_days} days`
        : "Not recorded",
      sublabel: insights.longestTrip 
        ? getCountryName(insights.longestTrip.country_id)
        : undefined,
      gradient: "from-amber-500 to-yellow-500",
    },
  ];
  
  const geographicBadges: { 
    label: string; 
    count: number; 
    icon: typeof Waves; 
    color: string; 
    type: GeographicType;
    max?: number;
  }[] = [
    { label: "Island Nations", count: insights.islandCount, icon: Waves, color: "bg-cyan-500/20 text-cyan-600 hover:bg-cyan-500/30 cursor-pointer", type: "islands" },
    { label: "Landlocked", count: insights.landlockedCount, icon: Mountain, color: "bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 cursor-pointer", type: "landlocked" },
    { label: "G7 Countries", count: insights.g7Count, max: 7, icon: Sparkles, color: "bg-purple-500/20 text-purple-600 hover:bg-purple-500/30 cursor-pointer", type: "g7" },
    { label: "G20 Countries", count: insights.g20Count, max: 20, icon: Globe, color: "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 cursor-pointer", type: "g20" },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Travel DNA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {dnaCards.map((card, index) => (
            <div 
              key={index}
              className="relative p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity`} />
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-2`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-sm font-semibold text-foreground truncate">{card.value}</p>
              {card.sublabel && (
                <p className="text-xs text-muted-foreground truncate">{card.sublabel}</p>
              )}
            </div>
          ))}
        </div>
        
        {/* Geographic Badges */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Geographic Diversity</h4>
          <div className="flex flex-wrap gap-2">
            {geographicBadges.map((badge, index) => (
              <GeographicDetailsDialog 
                key={index}
                type={badge.type}
                countries={countries}
              >
                <Badge 
                  variant="secondary"
                  className={`${badge.color} flex items-center gap-1.5 px-3 py-1.5 transition-colors`}
                >
                  <badge.icon className="w-3.5 h-3.5" />
                  {badge.label}: {badge.count}{badge.max ? `/${badge.max}` : ''}
                </Badge>
              </GeographicDetailsDialog>
            ))}
          </div>
        </div>
        
        {/* Size Extremes */}
        {(insights.smallestArea || insights.largestArea) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Country Extremes</h4>
            <div className="grid grid-cols-2 gap-3">
              {insights.smallestArea && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Smallest Country</p>
                  <p className="text-sm font-medium text-foreground">{insights.smallestArea.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {insights.smallestArea.area.toLocaleString()} km²
                  </p>
                </div>
              )}
              {insights.largestArea && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Largest Country</p>
                  <p className="text-sm font-medium text-foreground">{insights.largestArea.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {insights.largestArea.area.toLocaleString()} km²
                  </p>
                </div>
              )}
              {insights.smallestPop && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Least Populated</p>
                  <p className="text-sm font-medium text-foreground">{insights.smallestPop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {insights.smallestPop.pop < 1 ? `${Math.round(insights.smallestPop.pop * 1000)}K` : `${insights.smallestPop.pop}M`} people
                  </p>
                </div>
              )}
              {insights.largestPop && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Most Populated</p>
                  <p className="text-sm font-medium text-foreground">{insights.largestPop.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {insights.largestPop.pop >= 1000 ? `${(insights.largestPop.pop / 1000).toFixed(1)}B` : `${insights.largestPop.pop}M`} people
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Average Trip Stats */}
        {insights.avgTripLength > 0 && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Average Trip Length</p>
                <p className="text-lg font-bold text-foreground">
                  {Math.round(insights.avgTripLength)} days
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Shortest Trip</p>
                <p className="text-sm font-medium text-foreground">
                  {insights.shortestTrip?.number_of_days || '?'} days
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TravelDNA;
