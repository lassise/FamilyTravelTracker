import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Country } from '@/hooks/useFamilyData';
import { useVisitDetails } from '@/hooks/useVisitDetails';
import { MapPin, ChevronDown, TrendingUp, Globe, Calendar, Clock, Repeat, Zap, Target, Route, Plane, CalendarDays, Flag, Moon, Percent, Hash, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYear, getMonth, parseISO, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { TripLeg } from '@/hooks/useTripLegs';

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
  const [isExpanded, setIsExpanded] = useState(true);
  const { visitDetails } = useVisitDetails();
  const [tripLegs, setTripLegs] = useState<TripLeg[]>([]);

  // Fetch all trip legs for analytics
  useEffect(() => {
    const fetchTripLegs = async () => {
      const { data, error } = await supabase
        .from('trip_legs')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (!error && data) {
        setTripLegs(data as TripLeg[]);
      }
    };
    
    fetchTripLegs();
  }, []);

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

  // 10 Interesting Analytics Insights (includes trip legs data)
  const analyticsInsights = useMemo(() => {
    const visitedCountries = countries.filter(c => c.visitedBy.length > 0);
    const validVisits = visitDetails.filter(v => v.visit_date || v.approximate_year);
    
    // Combine data from trip legs
    const legsWithDates = tripLegs.filter(leg => leg.start_date && leg.end_date);
    
    // Calculate multi-country trip count
    const multiCountryTripIds = new Set<string>();
    const tripLegCounts: Record<string, number> = {};
    tripLegs.forEach(leg => {
      tripLegCounts[leg.trip_id] = (tripLegCounts[leg.trip_id] || 0) + 1;
    });
    Object.entries(tripLegCounts).forEach(([tripId, count]) => {
      if (count > 1) multiCountryTripIds.add(tripId);
    });
    const multiCountryTripCount = multiCountryTripIds.size;
    
    // Additional days from trip legs (for countries not already counted in visitDetails)
    const tripLegDays = legsWithDates.reduce((sum, leg) => {
      return sum + (leg.number_of_days || differenceInDays(parseISO(leg.end_date), parseISO(leg.start_date)) + 1);
    }, 0);
    
    // Countries from trip legs that might not be in visitDetails
    const legCountryNames = new Set(tripLegs.map(leg => leg.country_name.toLowerCase()));
    
    // Countries visited via multi-country trips
    const countriesFromLegs = new Set(tripLegs.map(leg => leg.country_name));
    
    // 1. Travel Frequency Over Time
    const visitsByYear = validVisits.reduce((acc, visit) => {
      const year = visit.visit_date ? getYear(parseISO(visit.visit_date)) : (visit.approximate_year || 0);
      if (year > 0) acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const mostActiveYear = Object.entries(visitsByYear).sort((a, b) => b[1] - a[1])[0];
    
    // 2. Average Trip Duration
    const tripsWithDuration = validVisits.filter(v => v.number_of_days && v.number_of_days > 0);
    const avgDuration = tripsWithDuration.length > 0
      ? Math.round(tripsWithDuration.reduce((sum, v) => sum + (v.number_of_days || 0), 0) / tripsWithDuration.length)
      : 0;
    
    // 3. Most Visited Country
    const countryVisitCounts = validVisits.reduce((acc, visit) => {
      const country = visitedCountries.find(c => c.id === visit.country_id);
      if (country) acc[country.name] = (acc[country.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostVisited = Object.entries(countryVisitCounts).sort((a, b) => b[1] - a[1])[0];
    
    // 4. Longest Single Trip
    const longestTrip = tripsWithDuration.sort((a, b) => (b.number_of_days || 0) - (a.number_of_days || 0))[0];
    const longestTripCountry = longestTrip ? visitedCountries.find(c => c.id === longestTrip.country_id) : null;
    
    // 5. Travel Seasonality
    const visitsByMonth = validVisits.reduce((acc, visit) => {
      if (visit.visit_date) {
        const month = getMonth(parseISO(visit.visit_date));
        acc[month] = (acc[month] || 0) + 1;
      } else if (visit.approximate_month) {
        acc[visit.approximate_month - 1] = (acc[visit.approximate_month - 1] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);
    const favoriteMonth = Object.entries(visitsByMonth).sort((a, b) => b[1] - a[1])[0];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 6. Countries Visited Multiple Times
    const repeatVisits = Object.entries(countryVisitCounts).filter(([_, count]) => count > 1);
    
    // 7. Travel Velocity (countries per year)
    const years = Object.keys(visitsByYear).map(Number).sort();
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const yearsActive = lastYear && firstYear ? lastYear - firstYear + 1 : 1;
    const velocity = yearsActive > 0 ? (totalVisited / yearsActive).toFixed(1) : '0';
    
    // 8. Trip Diversity
    const uniqueTrips = new Set(validVisits.filter(v => v.trip_name).map(v => v.trip_name));
    
    // 9. Geographic Spread (continents visited)
    const continentsVisited = new Set(visitedCountries.map(c => c.continent)).size;
    
    // 10. Travel Streak (consecutive years)
    let maxStreak = 0;
    let currentStreak = 0;
    if (years.length > 0) {
      for (let i = 0; i < years.length; i++) {
        if (i === 0 || years[i] === years[i - 1] + 1) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }
    }

    // 11. Total days abroad (from visits + trip legs, deduplicated by using trips table)
    // For multi-country trips, we count the trip duration once (not per-leg)
    const visitDays = validVisits.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
    // Add trip leg days for trips that don't overlap with visit details
    // This is a simplified calculation - in practice, we'd want to deduplicate by trip_id
    const totalDaysAbroad = visitDays; // Trip legs days are part of the same trips, so we don't double-count

    // 12. First & last trip years
    const firstTripYear = firstYear || null;
    const lastTripYear = lastYear || null;

    // 13. Shortest trip (with duration)
    const shortestTripWithDuration = [...tripsWithDuration].sort((a, b) => (a.number_of_days || 999) - (b.number_of_days || 999))[0];
    const shortestTripCountry = shortestTripWithDuration ? visitedCountries.find(c => c.id === shortestTripWithDuration.country_id) : null;

    // 14. Quietest month (fewest visits)
    const quietestMonthEntry = Object.entries(visitsByMonth).sort((a, b) => a[1] - b[1])[0];

    // 15. Countries left to visit (195 total)
    const countriesLeft = 195 - totalVisited;

    // 16. Years with no travel (gaps in range)
    const yearRange = firstYear && lastYear ? lastYear - firstYear + 1 : 0;
    const yearsWithNoTravel = yearRange > 0 ? yearRange - years.length : 0;

    // 17. Percent of life abroad (days / 365)
    const percentOfYearAbroad = totalDaysAbroad > 0 ? ((totalDaysAbroad / 365) * 100).toFixed(1) : '0';

    // 18. First & last country by visit date (earliest/latest visit)
    const visitsWithDate = validVisits.filter(v => v.visit_date).sort((a, b) => 
      new Date(a.visit_date!).getTime() - new Date(b.visit_date!).getTime()
    );
    const firstVisitByDate = visitsWithDate[0];
    const lastVisitByDate = visitsWithDate[visitsWithDate.length - 1];
    const firstCountryByDate = firstVisitByDate ? visitedCountries.find(c => c.id === firstVisitByDate.country_id) : null;
    const lastCountryByDate = lastVisitByDate ? visitedCountries.find(c => c.id === lastVisitByDate.country_id) : null;

    // 19. Trip count by decade
    const tripsByDecade = validVisits.reduce((acc, visit) => {
      const year = visit.visit_date ? getYear(parseISO(visit.visit_date)) : (visit.approximate_year || 0);
      if (year > 0) {
        const decade = Math.floor(year / 10) * 10;
        acc[decade] = (acc[decade] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);
    const busiestDecade = Object.entries(tripsByDecade).sort((a, b) => b[1] - a[1])[0];

    // 20. Average days per country (total days / countries with at least one visit with duration)
    const countriesWithDays = new Set(tripsWithDuration.map(v => v.country_id)).size;
    const avgDaysPerCountry = countriesWithDays > 0 ? Math.round(totalDaysAbroad / countriesWithDays) : 0;

    return {
      mostActiveYear: mostActiveYear ? { year: mostActiveYear[0], count: mostActiveYear[1] } : null,
      avgDuration,
      mostVisited: mostVisited ? { country: mostVisited[0], count: mostVisited[1] } : null,
      longestTrip: longestTrip && longestTripCountry ? { country: longestTripCountry.name, days: longestTrip.number_of_days || 0 } : null,
      favoriteMonth: favoriteMonth ? { month: monthNames[parseInt(favoriteMonth[0])], count: favoriteMonth[1] } : null,
      repeatVisits: repeatVisits.length,
      velocity,
      uniqueTrips: uniqueTrips.size,
      continentsVisited,
      maxStreak,
      totalDaysAbroad,
      firstTripYear,
      lastTripYear,
      shortestTrip: shortestTripWithDuration && shortestTripCountry ? { country: shortestTripCountry.name, days: shortestTripWithDuration.number_of_days || 0 } : null,
      quietestMonth: quietestMonthEntry ? { month: monthNames[parseInt(quietestMonthEntry[0])], count: quietestMonthEntry[1] } : null,
      countriesLeft,
      yearsWithNoTravel,
      percentOfYearAbroad,
      firstCountryByDate: firstCountryByDate?.name || null,
      lastCountryByDate: lastCountryByDate?.name || null,
      busiestDecade: busiestDecade ? { decade: `${busiestDecade[0]}s`, count: busiestDecade[1] } : null,
      multiCountryTripCount,
      countriesFromMultiCountryTrips: countriesFromLegs.size,
      tripLegCount: tripLegs.length,
      avgDaysPerCountry,
    };
  }, [countries, visitDetails, tripLegs]);

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
              <div className="pt-4 border-t border-border space-y-6">
                {/* Continent Progress Rings */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 text-foreground">Continent Progress</h3>
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

                {/* 10 Analytics Insights */}
                <div>
                  <h3 className="text-sm font-semibold mb-4 text-foreground">Travel Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyticsInsights.mostActiveYear && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Most Active Year</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.mostActiveYear.year}: {analyticsInsights.mostActiveYear.count} visits
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.avgDuration > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-secondary/10">
                            <Clock className="h-4 w-4 text-secondary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Average Trip Duration</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.avgDuration} days per trip
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.mostVisited && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-accent/10">
                            <Repeat className="h-4 w-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Most Visited Country</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.mostVisited.country} ({analyticsInsights.mostVisited.count} times)
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.longestTrip && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-purple-500/10">
                            <Route className="h-4 w-4 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Longest Trip</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.longestTrip.country}: {analyticsInsights.longestTrip.days} days
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.favoriteMonth && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-orange-500/10">
                            <Calendar className="h-4 w-4 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Favorite Travel Month</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.favoriteMonth.month} ({analyticsInsights.favoriteMonth.count} visits)
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.repeatVisits > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-cyan-500/10">
                            <Repeat className="h-4 w-4 text-cyan-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Return Visits</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.repeatVisits} countries visited multiple times
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.velocity !== '0' && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-emerald-500/10">
                            <Zap className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Travel Velocity</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.velocity} countries per year
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.uniqueTrips > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-pink-500/10">
                            <Plane className="h-4 w-4 text-pink-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Trip Diversity</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.uniqueTrips} unique trips recorded
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.continentsVisited > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-indigo-500/10">
                            <Globe className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Continental Coverage</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.continentsVisited} of 7 continents explored
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.maxStreak > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-amber-500/10">
                            <Target className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Travel Streak</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.maxStreak} consecutive years of travel
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.totalDaysAbroad > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-sky-500/10">
                            <CalendarDays className="h-4 w-4 text-sky-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Total Days Abroad</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.totalDaysAbroad} days exploring the world
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.firstTripYear && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-violet-500/10">
                            <Flag className="h-4 w-4 text-violet-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Travel Span</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.firstTripYear}
                              {analyticsInsights.lastTripYear && analyticsInsights.lastTripYear !== analyticsInsights.firstTripYear
                                ? ` – ${analyticsInsights.lastTripYear}`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.shortestTrip && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-slate-500/10">
                            <Clock className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Shortest Trip</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.shortestTrip.country}: {analyticsInsights.shortestTrip.days} days
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.quietestMonth && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-slate-400/10">
                            <Moon className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Quietest Month</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.quietestMonth.month} ({analyticsInsights.quietestMonth.count} {analyticsInsights.quietestMonth.count === 1 ? 'visit' : 'visits'})
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.countriesLeft >= 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-rose-500/10">
                            <Target className="h-4 w-4 text-rose-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Countries Left</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.countriesLeft} of 195 still to explore
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.yearsWithNoTravel > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-amber-600/10">
                            <Calendar className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Travel Gaps</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.yearsWithNoTravel} {analyticsInsights.yearsWithNoTravel === 1 ? 'year' : 'years'} with no recorded trips
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.totalDaysAbroad > 0 && parseFloat(analyticsInsights.percentOfYearAbroad) > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-teal-500/10">
                            <Percent className="h-4 w-4 text-teal-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">% of Year Abroad</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.percentOfYearAbroad}% of a year spent traveling
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.firstCountryByDate && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-emerald-600/10">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">First Country (by date)</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.firstCountryByDate}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.lastCountryByDate && analyticsInsights.lastCountryByDate !== analyticsInsights.firstCountryByDate && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-blue-600/10">
                            <MapPin className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Most Recent Country</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.lastCountryByDate}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.busiestDecade && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-fuchsia-500/10">
                            <Hash className="h-4 w-4 text-fuchsia-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Busiest Decade</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.busiestDecade.decade}: {analyticsInsights.busiestDecade.count} visits
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.avgDaysPerCountry > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-lime-500/10">
                            <Globe className="h-4 w-4 text-lime-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Avg Days per Country</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.avgDaysPerCountry} days average per country visited
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {analyticsInsights.multiCountryTripCount > 0 && (
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
                            <Navigation className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Multi-Country Trips</p>
                            <p className="text-xs text-muted-foreground">
                              {analyticsInsights.multiCountryTripCount} trip{analyticsInsights.multiCountryTripCount !== 1 ? 's' : ''} spanning multiple countries
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
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
