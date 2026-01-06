import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Country, FamilyMember } from '@/hooks/useFamilyData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, Target, Star, Globe, Map, Plane, Award, Medal, 
  Crown, Gem, Plus, Check, Calendar, Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface AchievementsGoalsProps {
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
  { key: 'first_country', name: 'First Steps', description: 'Visit your first country', icon: Globe, color: 'bg-emerald-500', requirement: 1, type: 'countries' },
  { key: 'five_countries', name: 'Explorer', description: 'Visit 5 countries', icon: Map, color: 'bg-blue-500', requirement: 5, type: 'countries' },
  { key: 'ten_countries', name: 'Adventurer', description: 'Visit 10 countries', icon: Plane, color: 'bg-cyan-500', requirement: 10, type: 'countries' },
  { key: 'twenty_countries', name: 'Globetrotter', description: 'Visit 20 countries', icon: Star, color: 'bg-purple-500', requirement: 20, type: 'countries' },
  { key: 'twentyfive_countries', name: 'Quarter Century', description: 'Visit 25 countries', icon: Medal, color: 'bg-amber-500', requirement: 25, type: 'countries' },
  { key: 'thirty_countries', name: 'World Traveler', description: 'Visit 30 countries', icon: Award, color: 'bg-orange-500', requirement: 30, type: 'countries' },
  { key: 'forty_countries', name: 'Elite Explorer', description: 'Visit 40 countries', icon: Crown, color: 'bg-rose-500', requirement: 40, type: 'countries' },
  { key: 'fifty_countries', name: 'Legendary', description: 'Visit 50 countries', icon: Gem, color: 'bg-violet-500', requirement: 50, type: 'countries' },
  { key: 'hundred_countries', name: 'Century Club', description: 'Visit 100 countries', icon: Trophy, color: 'bg-gradient-to-r from-amber-500 to-yellow-500', requirement: 100, type: 'countries' },
  // Continent milestones
  { key: 'two_continents', name: 'Continental Start', description: 'Visit 2 continents', icon: Globe, color: 'bg-teal-500', requirement: 2, type: 'continents' },
  { key: 'three_continents', name: 'Continental', description: 'Visit 3 continents', icon: Map, color: 'bg-indigo-500', requirement: 3, type: 'continents' },
  { key: 'five_continents', name: 'Global Citizen', description: 'Visit 5 continents', icon: Plane, color: 'bg-pink-500', requirement: 5, type: 'continents' },
  { key: 'six_continents', name: 'Almost There', description: 'Visit 6 continents', icon: Star, color: 'bg-fuchsia-500', requirement: 6, type: 'continents' },
  { key: 'all_continents', name: 'World Conqueror', description: 'Visit all 7 continents', icon: Crown, color: 'bg-gradient-to-r from-purple-500 to-pink-500', requirement: 7, type: 'continents' },
];

const AchievementsGoals = ({ countries, familyMembers, totalContinents }: AchievementsGoalsProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<string[]>([]);
  const [achievementsLoaded, setAchievementsLoaded] = useState(false);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target_count: 5, goal_type: 'countries', deadline: '' });
  const { toast } = useToast();

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0).length;

  // Fetch existing data on mount
  useEffect(() => {
    fetchGoals();
    fetchAchievements();
  }, []);

  // Check for new achievements only after existing ones are loaded
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
      // Only award if not already earned (check both state and what we're about to add)
      if (current >= achievement.requirement && 
          !earnedAchievements.includes(achievement.key) && 
          !newlyEarned.includes(achievement.key)) {
        
        // Try to insert - will fail silently if already exists due to unique constraint
        const { error } = await supabase.from('user_achievements').insert({
          user_id: user.id,
          achievement_key: achievement.key,
        });
        
        // Only show toast if insert succeeded (wasn't already in DB)
        if (!error) {
          newlyEarned.push(achievement.key);
          toast({
            title: '🎉 Achievement Unlocked!',
            description: `${achievement.name}: ${achievement.description}`,
          });
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

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Achievements */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const isEarned = earnedAchievements.includes(achievement.key);
              const current = achievement.type === 'countries' ? visitedCountries : totalContinents;
              
              return (
                <div 
                  key={achievement.key}
                  className={`relative flex flex-col items-center p-3 rounded-lg transition-all ${
                    isEarned 
                      ? 'bg-muted' 
                      : 'bg-muted/30 opacity-50'
                  }`}
                  title={`${achievement.name}: ${achievement.description} (${current}/${achievement.requirement})`}
                >
                  <div className={`p-2 rounded-full ${isEarned ? achievement.color : 'bg-muted'}`}>
                    <achievement.icon className={`h-5 w-5 ${isEarned ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground mt-2 text-center">
                    {achievement.name}
                  </span>
                  {isEarned && (
                    <Check className="absolute top-1 right-1 h-4 w-4 text-accent" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
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
            <p className="text-muted-foreground text-center py-4">
              No goals yet. Set your first travel goal!
            </p>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const progress = Math.min(getGoalProgress(goal), 100);
                const current = goal.goal_type === 'countries' ? visitedCountries : totalContinents;
                
                return (
                  <div key={goal.id} className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-foreground">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {current} / {goal.target_count} {goal.goal_type}
                          {goal.deadline && ` • Due ${format(new Date(goal.deadline), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
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

export default AchievementsGoals;
