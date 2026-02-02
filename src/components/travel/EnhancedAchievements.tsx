import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Country, FamilyMember } from '@/hooks/useFamilyData';
import { useVisitDetails } from '@/hooks/useVisitDetails';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy, Target, Star, Globe, Map, Plane, Award, Medal,
  Crown, Gem, Plus, Calendar, Trash2, ChevronDown, Check,
  Compass, MapPin, Footprints, Mountain, Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import FlippableAchievementCard from './FlippableAchievementCard';

// Visit has visit_date + end_date; trip spans New Year's if start <= Dec 31 and end >= Jan 1 next year
function visitSpansNewYear(visit: { visit_date: string | null; end_date: string | null }): boolean {
  const start = visit.visit_date ? parseISO(visit.visit_date) : null;
  const end = visit.end_date ? parseISO(visit.end_date) : null;
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  const startYear = start.getFullYear();
  const dec31 = new Date(startYear, 11, 31);
  const jan1Next = new Date(startYear + 1, 0, 1);
  return start <= dec31 && end >= jan1Next;
}

function getNewYearsAbroadTrips(
  visitDetails: Array<{ visit_date: string | null; end_date: string | null; trip_name: string | null }>
): string[] {
  return visitDetails
    .filter(visitSpansNewYear)
    .map((v) => {
      const start = v.visit_date ? format(parseISO(v.visit_date), 'MMM d, yyyy') : '';
      const end = v.end_date ? format(parseISO(v.end_date), 'MMM d, yyyy') : '';
      const label = v.trip_name?.trim() || `${start} – ${end}`;
      return label;
    });
}

interface EnhancedAchievementsProps {
  countries: Country[];
  familyMembers: FamilyMember[];
  totalContinents: number;
}

interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requirement: number;
  type: 'countries' | 'continents' | 'special';
  rarity: 'common' | 'rare' | 'legendary';
  hint: string;
}

interface Goal {
  id: string;
  title: string;
  target_count: number;
  goal_type: string;
  deadline: string | null;
  is_completed: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  // Country milestones
  { key: 'first_country', name: 'First Steps', description: 'Visit your first country', icon: Globe, color: 'bg-emerald-500', requirement: 1, type: 'countries', rarity: 'common', hint: 'Mark your first country as visited to unlock' },
  { key: 'five_countries', name: 'Explorer', description: 'Visit 5 countries', icon: Map, color: 'bg-blue-500', requirement: 5, type: 'countries', rarity: 'common', hint: 'Visit 5 countries to unlock' },
  { key: 'ten_countries', name: 'Wanderer', description: 'Visit 10 countries', icon: Plane, color: 'bg-cyan-500', requirement: 10, type: 'countries', rarity: 'common', hint: 'Visit 10 countries to unlock' },
  { key: 'twenty_countries', name: 'Globetrotter', description: 'Visit 20 countries', icon: Star, color: 'bg-purple-500', requirement: 20, type: 'countries', rarity: 'rare', hint: 'Visit 20 countries to unlock this rare badge' },
  { key: 'twentyfive_countries', name: 'Quarter Century', description: 'Visit 25 countries', icon: Medal, color: 'bg-amber-500', requirement: 25, type: 'countries', rarity: 'rare', hint: 'Visit 25 countries to unlock this rare badge' },
  { key: 'thirty_countries', name: 'World Traveler', description: 'Visit 30 countries', icon: Award, color: 'bg-orange-500', requirement: 30, type: 'countries', rarity: 'rare', hint: 'Visit 30 countries to unlock this rare badge' },
  { key: 'forty_countries', name: 'Elite Explorer', description: 'Visit 40 countries', icon: Crown, color: 'bg-rose-500', requirement: 40, type: 'countries', rarity: 'legendary', hint: 'Visit 40 countries to unlock this legendary badge' },
  { key: 'fifty_countries', name: 'Legendary', description: 'Visit 50 countries', icon: Gem, color: 'bg-violet-500', requirement: 50, type: 'countries', rarity: 'legendary', hint: 'Visit 50 countries to unlock this legendary badge' },
  { key: 'seventyfive_countries', name: 'Three Quarters', description: 'Visit 75 countries', icon: Compass, color: 'bg-gradient-to-r from-indigo-500 to-purple-500', requirement: 75, type: 'countries', rarity: 'legendary', hint: 'Visit 75 countries to unlock this legendary badge' },
  { key: 'hundred_countries', name: 'Century Club', description: 'Visit 100 countries', icon: Trophy, color: 'bg-gradient-to-r from-amber-500 to-yellow-500', requirement: 100, type: 'countries', rarity: 'legendary', hint: 'Join the elite Century Club by visiting 100 countries' },
  { key: 'hundredfifty_countries', name: 'Master Explorer', description: 'Visit 150 countries', icon: Mountain, color: 'bg-gradient-to-r from-rose-500 to-pink-500', requirement: 150, type: 'countries', rarity: 'legendary', hint: 'Visit 150 countries - you are a true master explorer!' },
  // Continent milestones
  { key: 'two_continents', name: 'Continental Start', description: 'Visit 2 continents', icon: MapPin, color: 'bg-teal-500', requirement: 2, type: 'continents', rarity: 'common', hint: 'Explore 2 continents to unlock' },
  { key: 'three_continents', name: 'Continental', description: 'Visit 3 continents', icon: Footprints, color: 'bg-indigo-500', requirement: 3, type: 'continents', rarity: 'common', hint: 'Explore 3 continents to unlock' },
  { key: 'five_continents', name: 'Global Citizen', description: 'Visit 5 continents', icon: Plane, color: 'bg-pink-500', requirement: 5, type: 'continents', rarity: 'rare', hint: 'Explore 5 continents to unlock this rare badge' },
  { key: 'six_continents', name: 'Almost There', description: 'Visit 6 continents', icon: Star, color: 'bg-fuchsia-500', requirement: 6, type: 'continents', rarity: 'rare', hint: 'Just one more continent after this!' },
  { key: 'all_continents', name: 'World Conqueror', description: 'Visit all 7 continents', icon: Crown, color: 'bg-gradient-to-r from-purple-500 to-pink-500', requirement: 7, type: 'continents', rarity: 'legendary', hint: 'Visit all 7 continents including Antarctica!' },
  // Special / milestone
  { key: 'new_years_abroad', name: 'New Year\'s Abroad', description: 'Spend New Year\'s Eve abroad — trip spans Dec 31 into Jan 1', icon: Sparkles, color: 'bg-gradient-to-r from-amber-500 to-yellow-500', requirement: 1, type: 'special', rarity: 'rare', hint: 'Add a visit that spans from Dec 31 of one year into Jan 1 of the next' },
  { key: 'family_fun', name: 'Family Fun', description: 'Travel with 3+ family members', icon: Award, color: 'bg-rose-500', requirement: 3, type: 'special', rarity: 'common', hint: 'Log a trip with at least 3 family members' },
  { key: 'goal_setter', name: 'Goal Setter', description: 'Create your first travel goal', icon: Target, color: 'bg-blue-400', requirement: 1, type: 'special', rarity: 'common', hint: 'Set a new travel goal to unlock' },
  { key: 'goal_getter', name: 'Goal Getter', description: 'Complete a travel goal', icon: Check, color: 'bg-green-500', requirement: 1, type: 'special', rarity: 'rare', hint: 'Complete 100% of any travel goal' },
];

const rarityStyles = {
  common: { border: 'border-emerald-500/40', badge: 'bg-emerald-500/20 text-emerald-600', glow: 'shadow-emerald-500/25 shadow-md' },
  rare: { border: 'border-blue-500/60', badge: 'bg-blue-500/20 text-blue-600', glow: 'shadow-blue-500/30 shadow-lg' },
  legendary: { border: 'border-amber-500/70', badge: 'bg-amber-500/20 text-amber-600', glow: 'shadow-amber-500/40 shadow-xl' },
};

const EnhancedAchievements = ({ countries, familyMembers, totalContinents }: EnhancedAchievementsProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [achievementsLoaded, setAchievementsLoaded] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_count: 5, goal_type: 'countries', deadline: '' });
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [newlyEarnedKey, setNewlyEarnedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const { visitDetails } = useVisitDetails();

  // Visited countries (unique)
  const visitedCountriesList = countries.filter((c) => c.visitedBy.length > 0);
  const visitedCountries = visitedCountriesList.length;

  // Earliest visit date per country (for ordering "which countries unlocked" each achievement)
  const earliestSortKeyByCountryId = React.useMemo(() => {
    const map = new globalThis.Map<string, number>();
    for (const v of visitDetails) {
      if (!v.country_id) continue;
      let key: number;
      if (v.visit_date) {
        try {
          const d = new Date(v.visit_date);
          key = isNaN(d.getTime()) ? Infinity : d.getTime();
        } catch {
          key = Infinity;
        }
      } else if (v.approximate_year != null) {
        const month = (v.approximate_month != null && v.approximate_month >= 1 && v.approximate_month <= 12)
          ? v.approximate_month - 1
          : 0;
        key = new Date(v.approximate_year, month, 1).getTime();
      } else {
        key = Infinity;
      }
      const existing = map.get(v.country_id);
      if (existing === undefined || key < existing) map.set(v.country_id, key);
    }
    return map;
  }, [visitDetails]);

  // Countries ordered by oldest visit first (so "first N" = the N that unlocked that tier)
  const countriesByOldestVisit = React.useMemo(() => {
    return [...visitedCountriesList].sort((a, b) => {
      const keyA = earliestSortKeyByCountryId.get(a.id) ?? Infinity;
      const keyB = earliestSortKeyByCountryId.get(b.id) ?? Infinity;
      return keyA - keyB;
    });
  }, [visitedCountriesList, earliestSortKeyByCountryId]);

  // For each country-type achievement: the N countries that "unlocked" it (oldest N by visit date)
  const unlockedByCountryNamesByAchievementKey = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const a of ACHIEVEMENTS) {
      if (a.type !== 'countries') continue;
      const n = Math.min(a.requirement, countriesByOldestVisit.length);
      out[a.key] = countriesByOldestVisit.slice(0, n).map((c) => c.name);
    }
    return out;
  }, [countriesByOldestVisit]);

  const hasNewYearsAbroad = React.useMemo(
    () => visitDetails.some(visitSpansNewYear),
    [visitDetails]
  );
  const newYearsAbroadTripLabels = React.useMemo(
    () => getNewYearsAbroadTrips(visitDetails),
    [visitDetails]
  );

  useEffect(() => {
    fetchGoals();
    fetchAchievements();
  }, []);

  useEffect(() => {
    if (achievementsLoaded) {
      checkAndAwardAchievements();
    }
  }, [visitedCountries, totalContinents, achievementsLoaded]);

  const fetchGoals = async () => {
    const { data } = await supabase.from('travel_goals').select('*').order('created_at', { ascending: false });
    if (data) setGoals(data as Goal[]);
  };

  const fetchAchievements = async () => {
    const { data } = await supabase.from('user_achievements').select('achievement_key');
    if (data) {
      setEarnedAchievements(data.map(a => a.achievement_key));
    }
    setAchievementsLoaded(true);
  };

  const checkAndAwardAchievements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newlyEarned: string[] = [];

    for (const achievement of ACHIEVEMENTS) {
      const isSpecialEarned = achievement.type === 'special' && achievement.key === 'new_years_abroad' && hasNewYearsAbroad;
      const current = achievement.type === 'countries' ? visitedCountries
        : achievement.type === 'continents' ? totalContinents
          : isSpecialEarned ? 1 : 0;
      if ((current >= achievement.requirement || isSpecialEarned) &&
        !earnedAchievements.includes(achievement.key) &&
        !newlyEarned.includes(achievement.key)) {

        const { error } = await supabase.from('user_achievements').insert({
          user_id: user.id,
          achievement_key: achievement.key,
        });

        if (!error) {
          newlyEarned.push(achievement.key);
          setNewlyEarnedKey(achievement.key);
          toast({
            title: '🎉 Achievement Unlocked!',
            description: `${achievement.name}: ${achievement.description}`,
          });
          // Clear animation after delay
          setTimeout(() => setNewlyEarnedKey(null), 3000);
        }
      }
    }

    if (newlyEarned.length > 0) {
      setEarnedAchievements(prev => [...prev, ...newlyEarned]);
    }
  };

  const handleAddGoal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Validate target_count
    const targetCount = newGoal.target_count < 1 ? 1 : newGoal.target_count;

    const { error } = await supabase.from('travel_goals').insert({
      user_id: user.id,
      title: newGoal.title,
      target_count: targetCount,
      goal_type: newGoal.goal_type,
      deadline: newGoal.deadline || null,
    });

    if (!error) {
      toast({ title: 'Goal added!' });
      setIsAddingGoal(false);
      setNewGoal({ title: '', target_count: 5, goal_type: 'countries', deadline: '' });
      fetchGoals();
    } else {
      toast({ title: 'Error adding goal', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    await supabase.from('travel_goals').delete().eq('id', id);
    fetchGoals();
  };

  const getGoalProgress = (goal: Goal) => {
    const current = getGoalCurrent(goal);
    return (current / goal.target_count) * 100;
  };

  const getGoalCurrent = (goal: Goal) => {
    if (goal.goal_type === 'countries') return visitedCountries;
    if (goal.goal_type === 'continents') return totalContinents;
    if (goal.goal_type === 'trips') return visitedCountries; // Placeholder - would need trip count
    if (goal.goal_type === 'repeat_visits') return 0; // Would need repeat visit tracking
    if (goal.goal_type === 'new_countries_year') return visitedCountries; // Placeholder
    if (goal.goal_type === 'travel_streak') return 0; // Would need streak tracking
    if (goal.goal_type === 'flight_miles') return 0; // Would need miles tracking
    if (goal.goal_type === 'days_abroad') return 0; // Would need days tracking
    return 0;
  };

  const getGoalTypeLabel = (goalType: string) => {
    const labels: Record<string, string> = {
      countries: 'countries',
      continents: 'continents',
      trips: 'trips',
      repeat_visits: 'repeat visits',
      new_countries_year: 'new countries',
      travel_streak: 'months',
      flight_miles: 'miles',
      days_abroad: 'days',
    };
    return labels[goalType] || goalType;
  };

  // Earned only when current count meets requirement (or special condition for type 'special')
  const earnedList = ACHIEVEMENTS.filter((a) => {
    if (a.type === 'special' && a.key === 'new_years_abroad') return hasNewYearsAbroad;
    const current = a.type === 'countries' ? visitedCountries : totalContinents;
    return current >= a.requirement;
  });
  const lockedList = ACHIEVEMENTS.filter((a) => !earnedList.includes(a));
  const displayedAchievements = showAllAchievements ? ACHIEVEMENTS : [...earnedList, ...lockedList.slice(0, 6 - earnedList.length)].slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      {/* Achievements */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Trophy className="h-5 w-5 text-primary" />
              Achievements
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {earnedList.length}/{ACHIEVEMENTS.length} unlocked
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {displayedAchievements.map((achievement) => {
              const isSpecialEarned = achievement.type === 'special' && achievement.key === 'new_years_abroad' && hasNewYearsAbroad;
              const current = achievement.type === 'countries' ? visitedCountries
                : achievement.type === 'continents' ? totalContinents
                  : isSpecialEarned ? 1 : 0;
              const isEarned = achievement.type === 'special' ? isSpecialEarned : current >= achievement.requirement;
              const isNewlyEarned = newlyEarnedKey === achievement.key;
              const rarity = rarityStyles[achievement.rarity];
              const countryNames = achievement.type === 'countries'
                ? unlockedByCountryNamesByAchievementKey[achievement.key] ?? []
                : undefined;
              const detailLines = achievement.type === 'special' && achievement.key === 'new_years_abroad'
                ? newYearsAbroadTripLabels
                : undefined;

              return (
                <FlippableAchievementCard
                  key={achievement.key}
                  achievement={achievement}
                  isEarned={isEarned}
                  isNewlyEarned={isNewlyEarned}
                  current={current}
                  rarityStyles={rarity}
                  countryNames={countryNames}
                  detailLines={detailLines}
                />
              );
            })}
          </div>

          {ACHIEVEMENTS.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-4 text-muted-foreground"
              onClick={() => setShowAllAchievements(!showAllAchievements)}
            >
              {showAllAchievements ? 'Show less' : `View all ${ACHIEVEMENTS.length} achievements`}
              <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", showAllAchievements && "rotate-180")} />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Target className="h-5 w-5 text-primary" />
            Travel Goals
          </CardTitle>
          <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set a Travel Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Goal Title</Label>
                  <Input
                    placeholder="e.g., Visit 10 new countries this year"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Goal Type</Label>
                    <Select value={newGoal.goal_type} onValueChange={(v) => setNewGoal({ ...newGoal, goal_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="countries">Countries Visited</SelectItem>
                        <SelectItem value="continents">Continents Explored</SelectItem>
                        <SelectItem value="trips">Trips Taken</SelectItem>
                        <SelectItem value="repeat_visits">Repeat Visits (Same Country)</SelectItem>
                        <SelectItem value="new_countries_year">New Countries This Year</SelectItem>
                        <SelectItem value="travel_streak">Travel Streak (Consecutive Months)</SelectItem>
                        <SelectItem value="flight_miles">Flight Miles</SelectItem>
                        <SelectItem value="days_abroad">Days Abroad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newGoal.target_count === 0 ? '' : newGoal.target_count}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Allow empty during editing, parse to number or 0
                        setNewGoal({ ...newGoal, target_count: val === '' ? 0 : parseInt(val) || 0 });
                      }}
                      placeholder="Enter target"
                    />
                  </div>
                </div>
                <div>
                  <Label>Deadline (optional)</Label>
                  <Input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleAddGoal}
                  className="w-full"
                  disabled={!newGoal.title.trim() || newGoal.target_count < 1}
                >
                  Create Goal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No goals yet. Set your first travel goal!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => {
                const progress = Math.min(getGoalProgress(goal), 100);
                const current = getGoalCurrent(goal);
                const typeLabel = getGoalTypeLabel(goal.goal_type);

                return (
                  <div key={goal.id} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-foreground text-sm">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {current} / {goal.target_count} {typeLabel}
                          {goal.deadline && ` • Due ${format(new Date(goal.deadline), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {progress >= 100 && (
                      <p className="text-xs text-accent mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Goal completed!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAchievements;
