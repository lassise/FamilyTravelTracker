import React, { useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Country } from '@/hooks/useFamilyData';
import { MapPin, ChevronDown, TrendingUp, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy load the chart component
const ContinentProgressRings = lazy(() => import('./ContinentProgressRings'));

interface AnalyticsInsightCardProps {
  countries: Country[];
}

const CONTINENT_TOTALS: Record<string, number> = {
  'Africa': 54,
  'Asia': 48,
  'Europe': 44,
  'North America': 23,
  'South America': 12,
  'Oceania': 14,
  'Antarctica': 1,
};

const AnalyticsInsightCard = ({ countries }: AnalyticsInsightCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const visitedByContinent = countries
    .filter(c => c.visitedBy.length > 0)
    .reduce((acc, country) => {
      acc[country.continent] = (acc[country.continent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  // Find the most explored continent
  const continentData = Object.entries(CONTINENT_TOTALS)
    .filter(([name]) => name !== 'Antarctica')
    .map(([name, total]) => ({
      name,
      visited: visitedByContinent[name] || 0,
      total,
      percentage: Math.round(((visitedByContinent[name] || 0) / total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const topContinent = continentData[0];
  const totalVisited = countries.filter(c => c.visitedBy.length > 0).length;
  const totalWorldPercentage = Math.round((totalVisited / 195) * 100);

  // Key insight message
  const getInsightMessage = () => {
    if (totalVisited === 0) return "Start your journey! Add your first country to see insights.";
    if (topContinent.percentage >= 50) {
      return `You've explored over half of ${topContinent.name}! Consider branching out to ${continentData[continentData.length - 1].name}.`;
    }
    if (totalVisited >= 10) {
      return `Great progress! ${topContinent.name} is your most explored continent at ${topContinent.percentage}%.`;
    }
    return `${topContinent.name} is your focus area. Keep exploring!`;
  };

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              Continent Progress
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                {isExpanded ? 'Collapse' : 'Expand'}
                <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Key insight - always visible */}
          <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/10 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {getInsightMessage()}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {totalVisited} countries ({totalWorldPercentage}% of world)
                  </span>
                  {topContinent && (
                    <span>
                      Top: {topContinent.name} ({topContinent.percentage}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mini progress bars - always visible */}
          <div className="grid grid-cols-3 gap-3">
            {continentData.slice(0, 6).map((continent) => (
              <div key={continent.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">{continent.name}</span>
                  <span className="font-medium text-foreground">{continent.percentage}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${continent.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Expanded content - detailed view */}
          <CollapsibleContent className="mt-4">
            <Suspense fallback={
              <div className="h-40 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {continentData.map((continent) => (
                    <div key={continent.name} className="flex flex-col items-center">
                      <div className="relative w-16 h-16">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            className="text-muted/30"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="hsl(var(--primary))"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${(continent.percentage / 100) * 175.9} 175.9`}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-foreground">
                            {continent.percentage}%
                          </span>
                        </div>
                      </div>
                      <h4 className="mt-2 font-medium text-foreground text-center text-xs">
                        {continent.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {continent.visited}/{continent.total}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Suspense>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

export default AnalyticsInsightCard;
