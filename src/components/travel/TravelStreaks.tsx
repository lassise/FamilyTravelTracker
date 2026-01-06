import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Calendar, TrendingUp, Zap, Clock, Target } from "lucide-react";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { differenceInDays, parseISO, getYear, format } from "date-fns";

const TravelStreaks = () => {
  const { visitDetails } = useVisitDetails();
  
  // Calculate streaks and time-based stats
  const stats = calculateStats();
  
  function calculateStats() {
    const visitsWithDates = visitDetails
      .filter(v => v.visit_date)
      .map(v => ({
        ...v,
        date: parseISO(v.visit_date!),
        year: getYear(parseISO(v.visit_date!))
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Days since last adventure
    const mostRecentVisit = visitsWithDates[visitsWithDates.length - 1];
    const daysSinceLastTrip = mostRecentVisit 
      ? differenceInDays(new Date(), mostRecentVisit.date)
      : null;
    
    // Get unique years with travel
    const yearsWithTravel = [...new Set(visitsWithDates.map(v => v.year))].sort();
    
    // Calculate consecutive years streak
    let currentStreak = 0;
    let maxStreak = 0;
    const currentYear = new Date().getFullYear();
    
    // Check backward from current year
    for (let year = currentYear; year >= Math.min(...yearsWithTravel, currentYear - 20); year--) {
      if (yearsWithTravel.includes(year)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        break;
      }
    }
    
    // Calculate longest streak in history
    let tempStreak = 0;
    yearsWithTravel.forEach((year, index) => {
      if (index === 0 || year === yearsWithTravel[index - 1] + 1) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
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
    
    // Total trips (visits) count
    const totalTrips = visitDetails.length;
    
    // Months until year end - motivation for goals
    const monthsLeft = 12 - new Date().getMonth();
    
    return {
      daysSinceLastTrip,
      currentStreak,
      maxStreak,
      yearsWithTravel: yearsWithTravel.length,
      bestYear,
      thisYearCountries,
      totalTrips,
      monthsLeft,
      mostRecentVisit,
    };
  }
  
  // Determine urgency level for "days since" display
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
          Travel Streaks & Timing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Days Since Last Adventure - Hero stat */}
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
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/20">
            <Zap className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold text-foreground">{stats.totalTrips}</p>
            <p className="text-xs text-muted-foreground">Total Trips</p>
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
