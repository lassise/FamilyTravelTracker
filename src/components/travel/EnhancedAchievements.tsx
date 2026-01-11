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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, Target, Star, Globe, Map, Plane, Award, Medal, 
  Crown, Gem, Plus, Check, Calendar, Trash2, ChevronDown, Lock, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  type: 'countries' | 'continents';
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
  { key: 'ten_countries', name: 'Adventurer', description: 'Visit 10 countries', icon: Plane, color: 'bg-cyan-500', requirement: 10, type: 'countries', rarity: 'common', hint: 'Visit 10 countries to unlock' },
  { key: 'twenty_countries', name: 'Globetrotter', description: 'Visit 20 countries', icon: Star, color: 'bg-purple-500', requirement: 20, type: 'countries', rarity: 'rare', hint: 'Visit 20 countries to unlock this rare badge' },
  { key: 'twentyfive_countries', name: 'Quarter Century', description: 'Visit 25 countries', icon: Medal, color: 'bg-amber-500', requirement: 25, type: 'countries', rarity: 'rare', hint: 'Visit 25 countries to unlock this rare badge' },
  { key: 'thirty_countries', name: 'World Traveler', description: 'Visit 30 countries', icon: Award, color: 'bg-orange-500', requirement: 30, type: 'countries', rarity: 'rare', hint: 'Visit 30 countries to unlock this rare badge' },
  { key: 'forty_countries', name: 'Elite Explorer', description: 'Visit 40 countries', icon: Crown, color: 'bg-rose-500', requirement: 40, type: 'countries', rarity: 'legendary', hint: 'Visit 40 countries to unlock this legendary badge' },
  { key: 'fifty_countries', name: 'Legendary', description: 'Visit 50 countries', icon: Gem, color: 'bg-violet-500', requirement: 50, type: 'countries', rarity: 'legendary', hint: 'Visit 50 countries to unlock this legendary badge' },
  { key: 'hundred_countries', name: 'Century Club', description: 'Visit 100 countries', icon: Trophy, color: 'bg-gradient-to-r from-amber-500 to-yellow-500', requirement: 100, type: 'countries', rarity: 'legendary', hint: 'Join the elite Century Club by visiting 100 countries' },
  // Continent milestones
  { key: 'two_continents', name: 'Continental Start', description: 'Visit 2 continents', icon: Globe, color: 'bg-teal-500', requirement: 2, type: 'continents', rarity: 'common', hint: 'Explore 2 continents to unlock' },
  { key: 'three_continents', name: 'Continental', description: 'Visit 3 continents', icon: Map, color: 'bg-indigo-500', requirement: 3, type: 'continents', rarity: 'common', hint: 'Explore 3 continents to unlock' },
  { key: 'five_continents', name: 'Global Citizen', description: 'Visit 5 continents', icon: Plane, color: 'bg-pink-500', requirement: 5, type: 'continents', rarity: 'rare', hint: 'Explore 5 continents to unlock this rare badge' },
  { key: 'six_continents', name: 'Almost There', description: 'Visit 6 continents', icon: Star, color: 'bg-fuchsia-500', requirement: 6, type: 'continents', rarity: 'rare', hint: 'Just one more continent after this!' },
  { key: 'all_continents', name: 'World Conqueror', description: 'Visit all 7 continents', icon: Crown, color: 'bg-gradient-to-r from-purple-500 to-pink-500', requirement: 7, type: 'continents', rarity: 'legendary', hint: 'Visit all 7 continents including Antarctica!' },
];

const rarityStyles = {
  common: { border: 'border-muted', badge: 'bg-muted text-muted-foreground', glow: '' },
  rare: { border: 'border-blue-500/50', badge: 'bg-blue-500/20 text-blue-500', glow: 'shadow-blue-500/20' },
  legendary: { border: 'border-amber-500/50', badge: 'bg-amber-500/20 text-amber-500', glow: 'shadow-amber-500/30 shadow-lg' },
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

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0).length;

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
      const current = achievement.type === 'countries' ? visitedCountries : totalContinents;
      if (current >= achievement.requirement && 
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

    const { error } = await supabase.from('travel_goals').insert({
      user_id: user.id,
      ...newGoal,
      deadline: newGoal.deadline || null,
    });

    if (!error) {
      toast({ title: 'Goal added!' });
      setIsAddingGoal(false);
      setNewGoal({ title: '', target_count: 5, goal_type: 'countries', deadline: '' });
      fetchGoals();
    }
  };

  const handleDeleteGoal = async (id: string) => {
    await supabase.from('travel_goals').delete().eq('id', id);
    fetchGoals();
  };

  const getGoalProgress = (goal: Goal) => {
    if (goal.goal_type === 'countries') return (visitedCountries / goal.target_count) * 100;
    if (goal.goal_type === 'continents') return (totalContinents / goal.target_count) * 100;
    return 0;
  };

  // Separate earned and locked achievements
  const earnedList = ACHIEVEMENTS.filter(a => earnedAchievements.includes(a.key));
  const lockedList = ACHIEVEMENTS.filter(a => !earnedAchievements.includes(a.key));
  const displayedAchievements = showAllAchievements ? ACHIEVEMENTS : [...earnedList, ...lockedList.slice(0, 6 - earnedList.length)].slice(0, 6);

  return (
    <div className="grid md:grid-cols-2 gap-6">
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
              const isEarned = earnedAchievements.includes(achievement.key);
              const isNewlyEarned = newlyEarnedKey === achievement.key;
              const current = achievement.type === 'countries' ? visitedCountries : totalContinents;
              const progress = Math.min((current / achievement.requirement) * 100, 100);
              const rarity = rarityStyles[achievement.rarity];
              
              return (
                <div 
                  key={achievement.key}
                  className={cn(
                    "relative flex flex-col items-center p-3 rounded-lg transition-all border",
                    isEarned 
                      ? `bg-muted ${rarity.border} ${rarity.glow}` 
                      : 'bg-muted/30 border-transparent opacity-60 hover:opacity-80',
                    isNewlyEarned && 'animate-scale-in ring-2 ring-primary ring-offset-2'
                  )}
                  title={isEarned ? `${achievement.name}: ${achievement.description}` : achievement.hint}
                >
                  {/* Rarity badge */}
                  {isEarned && achievement.rarity !== 'common' && (
                    <Badge className={cn("absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0", rarity.badge)}>
                      {achievement.rarity}
                    </Badge>
                  )}
                  
                  <div className={cn(
                    "p-2 rounded-full relative",
                    isEarned ? achievement.color : 'bg-muted'
                  )}>
                    {isEarned ? (
                      <achievement.icon className="h-5 w-5 text-primary-foreground" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                    {isNewlyEarned && (
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
                    )}
                  </div>
                  
                  <span className="text-xs font-medium text-foreground mt-2 text-center leading-tight">
                    {achievement.name}
                  </span>
                  
                  {!isEarned && (
                    <div className="w-full mt-2">
                      <Progress value={progress} className="h-1" />
                      <p className="text-[10px] text-muted-foreground text-center mt-1">
                        {current}/{achievement.requirement}
                      </p>
                    </div>
                  )}
                  
                  {isEarned && (
                    <Check className="absolute top-1 right-1 h-3.5 w-3.5 text-accent" />
                  )}
                </div>
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
                        <SelectItem value="countries">Countries</SelectItem>
                        <SelectItem value="continents">Continents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target</Label>
                    <Input 
                      type="number" 
                      min={1}
                      value={newGoal.target_count}
                      onChange={(e) => setNewGoal({ ...newGoal, target_count: parseInt(e.target.value) || 1 })}
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
                <Button onClick={handleAddGoal} className="w-full">
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
                const current = goal.goal_type === 'countries' ? visitedCountries : totalContinents;
                
                return (
                  <div key={goal.id} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-foreground text-sm">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {current} / {goal.target_count} {goal.goal_type}
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
