import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Calendar, TrendingUp, Zap, Clock, Target, Globe, Plane, Trophy } from "lucide-react";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { differenceInDays, parseISO, getYear, format, isWithinInterval, addDays } from "date-fns";

const TravelStreaks = () => {
  const { visitDetails } = useVisitDetails();
  
  const stats = calculateStats();
  
  function calculateStats() {
    const today = new Date();
    
    // Filter out future trips for streak calculations
    const visitsWithDates = visitDetails
      .filter(v => v.visit_date)
      .map(v => ({
        ...v,
        date: parseISO(v.visit_date!),
        endDate: v.end_date ? parseISO(v.end_date) : parseISO(v.visit_date!),
        year: getYear(parseISO(v.visit_date!))
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Only past trips for "days since last adventure" - exclude future trips
    const pastVisits = visitsWithDates.filter(v => v.endDate <= today);
    
    // Days since last adventure - only consider past trips
    const mostRecentPastVisit = pastVisits[pastVisits.length - 1];
    const daysSinceLastTrip = mostRecentPastVisit 
      ? differenceInDays(today, mostRecentPastVisit.endDate)
      : null;
    
    // Get unique years with travel
    const yearsWithTravel = [...new Set(visitsWithDates.map(v => v.year))].sort();
    
    // Calculate consecutive years streak
    let currentStreak = 0;
    let maxStreak = 0;
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear; year >= Math.min(...yearsWithTravel, currentYear - 20); year--) {
      if (yearsWithTravel.includes(year)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        break;
      }
    }
    
    let tempStreak = 0;
    yearsWithTravel.forEach((year, index) => {
      if (index === 0 || year === yearsWithTravel[index - 1] + 1) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    });
    
    // Calculate consecutive days abroad (longest streak)
    let maxConsecutiveDaysAbroad = 0;
    let currentConsecutiveDays = 0;
    
    // Merge overlapping/adjacent trips to calculate consecutive days
    const sortedVisits = [...visitsWithDates].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (sortedVisits.length > 0) {
      let mergedPeriods: { start: Date; end: Date }[] = [];
      let currentPeriod = { start: sortedVisits[0].date, end: sortedVisits[0].endDate };
      
      for (let i = 1; i < sortedVisits.length; i++) {
        const visit = sortedVisits[i];
        // If this visit starts within 1 day of current period end, extend it
        if (differenceInDays(visit.date, currentPeriod.end) <= 1) {
          currentPeriod.end = visit.endDate > currentPeriod.end ? visit.endDate : currentPeriod.end;
        } else {
          mergedPeriods.push(currentPeriod);
          currentPeriod = { start: visit.date, end: visit.endDate };
        }
      }
      mergedPeriods.push(currentPeriod);
      
      // Find the longest continuous period
      mergedPeriods.forEach(period => {
        const days = differenceInDays(period.end, period.start) + 1;
        if (days > maxConsecutiveDaysAbroad) {
          maxConsecutiveDaysAbroad = days;
        }
      });

      // Check if currently abroad - find period that contains today
      for (const period of mergedPeriods) {
        if (today >= period.start && today <= period.end) {
          currentConsecutiveDays = differenceInDays(today, period.start) + 1;
          break;
        }
      }
    }

    // Most countries visited in one trip (by trip_group_id or trip_name)
    const tripGroups: Map<string, Set<string>> = new Map();
    visitsWithDates.forEach(visit => {
      const tripKey = visit.trip_group_id || visit.trip_name || visit.visit_date;
      if (tripKey) {
        if (!tripGroups.has(tripKey)) {
          tripGroups.set(tripKey, new Set());
        }
        tripGroups.get(tripKey)!.add(visit.country_id);
      }
    });
    
    let maxCountriesInOneTrip = 0;
    let bestMultiCountryTrip = "";
    tripGroups.forEach((countries, tripName) => {
      if (countries.size > maxCountriesInOneTrip) {
        maxCountriesInOneTrip = countries.size;
        bestMultiCountryTrip = tripName;
      }
    });
    
    // Countries per year
    const countriesPerYear: Record<number, Set<string>> = {};
    visitsWithDates.forEach(visit => {
      if (!countriesPerYear[visit.year]) {
        countriesPerYear[visit.year] = new Set();
      }
      countriesPerYear[visit.year].add(visit.country_id);
    });
    
    const bestYear = Object.entries(countriesPerYear)
      .map(([year, countries]) => ({ year: parseInt(year), count: countries.size }))
      .sort((a, b) => b.count - a.count)[0];
    
    const thisYearCountries = countriesPerYear[currentYear]?.size || 0;
    
    // Total trips count
    const totalTrips = visitDetails.length;
    
    // Unique trips (by trip_name or trip_group_id)
    const uniqueTrips = new Set(
      visitDetails
        .filter(v => v.trip_name || v.trip_group_id)
        .map(v => v.trip_group_id || v.trip_name)
    ).size;
    
    // Months until year end
    const monthsLeft = 12 - new Date().getMonth();
    
    // Total days abroad
    const totalDaysAbroad = visitDetails.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
    
    return {
      daysSinceLastTrip,
      currentStreak,
      maxStreak,
      yearsWithTravel: yearsWithTravel.length,
      bestYear,
      thisYearCountries,
      totalTrips,
      uniqueTrips,
      monthsLeft,
      mostRecentVisit: mostRecentPastVisit,
      maxConsecutiveDaysAbroad,
      currentConsecutiveDays,
      maxCountriesInOneTrip,
      bestMultiCountryTrip,
      totalDaysAbroad,
    };
  }
  
  const getUrgencyColor = (days: number | null) => {
    if (days === null) return "text-muted-foreground";
    if (days <= 30) return "text-emerald-500";
    if (days <= 90) return "text-yellow-500";
    if (days <= 180) return "text-orange-500";
    return "text-red-500";
  };
  
  const getUrgencyMessage = (days: number | null) => {
    if (days === null) return "Start your journey!";
    if (days <= 7) return "Just returned! 🎉";
    if (days <= 30) return "Recently traveled";
    if (days <= 90) return "Time for another trip?";
    if (days <= 180) return "Adventure awaits...";
    return "Wanderlust calling! ✈️";
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Flame className="h-5 w-5 text-orange-500" />
          Travel Streaks & Records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Days Since Last Adventure */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Days Since Last Adventure</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${getUrgencyColor(stats.daysSinceLastTrip)}`}>
              {stats.daysSinceLastTrip ?? '—'}
            </span>
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getUrgencyMessage(stats.daysSinceLastTrip)}
          </p>
        </div>

        {/* Records Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Longest Trip */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Longest Trip</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{stats.maxConsecutiveDaysAbroad}</span>
              <span className="text-xs text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Consecutive days abroad
            </p>
          </div>

          {/* Most Countries One Trip */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Multi-Country Record</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{stats.maxCountriesInOneTrip}</span>
              <span className="text-xs text-muted-foreground">countries</span>
            </div>
            <p className="text-xs text-muted-foreground">
              In one trip
            </p>
          </div>
        </div>

        {/* Currently Abroad Indicator */}
        {stats.currentConsecutiveDays > 0 && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <Plane className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Currently Abroad: Day {stats.currentConsecutiveDays}
              </span>
            </div>
          </div>
        )}

        {/* Streaks Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Current Streak */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Current Streak</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{stats.currentStreak}</span>
              <span className="text-xs text-muted-foreground">years</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.currentStreak > 0 ? 'Consecutive travel years' : 'Travel this year to start!'}
            </p>
          </div>

          {/* Best Streak */}
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Best Streak</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{stats.maxStreak}</span>
              <span className="text-xs text-muted-foreground">years</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your longest run
            </p>
          </div>
        </div>

        {/* This Year Progress */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {new Date().getFullYear()} Progress
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {stats.monthsLeft} months left
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress 
                value={Math.min((stats.thisYearCountries / 5) * 100, 100)} 
                className="h-2"
              />
            </div>
            <span className="text-sm font-medium text-foreground">
              {stats.thisYearCountries} countries
            </span>
          </div>
          {stats.bestYear && stats.bestYear.year !== new Date().getFullYear() && (
            <p className="text-xs text-muted-foreground mt-2">
              Best year: {stats.bestYear.year} with {stats.bestYear.count} countries
            </p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <Plane className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-foreground">{stats.totalDaysAbroad}</p>
            <p className="text-xs text-muted-foreground">Days Abroad</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <Zap className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold text-foreground">{stats.totalTrips}</p>
            <p className="text-xs text-muted-foreground">Visits</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-foreground">{stats.yearsWithTravel}</p>
            <p className="text-xs text-muted-foreground">Years Active</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <Target className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-bold text-foreground">
              {stats.yearsWithTravel > 0 
                ? Math.round(stats.totalTrips / stats.yearsWithTravel * 10) / 10
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">Trips/Year</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TravelStreaks;
