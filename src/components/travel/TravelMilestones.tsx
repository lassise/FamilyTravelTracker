import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Country, FamilyMember } from "@/hooks/useFamilyData";
import { 
  Trophy, Star, Globe, Map, Plane, Flag,
  Milestone, Award, Crown, Zap, Rocket, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TravelMilestonesProps {
  countries: Country[];
  familyMembers: FamilyMember[];
  totalContinents: number;
}

interface MilestoneData {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  threshold: number;
  current: number;
  achieved: boolean;
  category: 'countries' | 'continents' | 'special';
  color: string;
}

const TravelMilestones = ({ countries, familyMembers, totalContinents }: TravelMilestonesProps) => {
  const visitedCountries = countries.filter(c => c.visitedBy.length > 0);
  const visitedCount = visitedCountries.length;
  
  // Calculate unique continents from visited countries
  const visitedContinents = new Set(visitedCountries.map(c => c.continent)).size;

  const milestones: MilestoneData[] = [
    // Country milestones
    { id: 'first', title: 'First Steps', description: 'Visit your first country', icon: Flag, threshold: 1, current: visitedCount, achieved: visitedCount >= 1, category: 'countries', color: 'text-green-500' },
    { id: 'explorer', title: 'Explorer', description: 'Visit 5 countries', icon: Globe, threshold: 5, current: visitedCount, achieved: visitedCount >= 5, category: 'countries', color: 'text-blue-500' },
    { id: 'wanderer', title: 'Wanderer', description: 'Visit 10 countries', icon: Map, threshold: 10, current: visitedCount, achieved: visitedCount >= 10, category: 'countries', color: 'text-purple-500' },
    { id: 'globetrotter', title: 'Globetrotter', description: 'Visit 25 countries', icon: Plane, threshold: 25, current: visitedCount, achieved: visitedCount >= 25, category: 'countries', color: 'text-orange-500' },
    { id: 'worldtraveler', title: 'World Traveler', description: 'Visit 50 countries', icon: Trophy, threshold: 50, current: visitedCount, achieved: visitedCount >= 50, category: 'countries', color: 'text-yellow-500' },
    { id: 'legend', title: 'Travel Legend', description: 'Visit 100 countries', icon: Crown, threshold: 100, current: visitedCount, achieved: visitedCount >= 100, category: 'countries', color: 'text-primary' },
    
    // Continent milestones
    { id: 'continental', title: 'Continental', description: 'Visit 2 continents', icon: Star, threshold: 2, current: visitedContinents, achieved: visitedContinents >= 2, category: 'continents', color: 'text-cyan-500' },
    { id: 'multicontinental', title: 'Multi-Continental', description: 'Visit 4 continents', icon: Zap, threshold: 4, current: visitedContinents, achieved: visitedContinents >= 4, category: 'continents', color: 'text-pink-500' },
    { id: 'worldmaster', title: 'World Master', description: 'Visit all 7 continents', icon: Rocket, threshold: 7, current: visitedContinents, achieved: visitedContinents >= 7, category: 'continents', color: 'text-gradient' },
    
    // Special milestones
    { id: 'familyfun', title: 'Family Fun', description: 'Travel with 3+ family members', icon: Award, threshold: 3, current: familyMembers.length, achieved: familyMembers.length >= 3, category: 'special', color: 'text-rose-500' },
  ];

  const achievedCount = milestones.filter(m => m.achieved).length;
  const nextMilestone = milestones.find(m => !m.achieved);

  // Flippable milestone card component
  const FlippableMilestoneCard = ({ milestone }: { milestone: MilestoneData }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const Icon = milestone.icon;
    const progress = Math.min((milestone.current / milestone.threshold) * 100, 100);

    return (
      <div
        className="relative h-[120px] cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ perspective: '1000px' }}
      >
        <div
          className="absolute inset-0 transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front of card */}
          <div
            className={cn(
              "absolute inset-0 p-3 rounded-lg text-center flex flex-col items-center",
              milestone.achieved
                ? "bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30"
                : "bg-muted/30 border border-transparent opacity-60"
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className={cn(
              "inline-flex p-2 rounded-full mb-2",
              milestone.achieved ? "bg-primary/20" : "bg-muted"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                milestone.achieved ? milestone.color : "text-muted-foreground"
              )} />
            </div>
            <h4 className={cn(
              "text-xs font-semibold mb-0.5",
              milestone.achieved ? "text-foreground" : "text-muted-foreground"
            )}>
              {milestone.title}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-auto">Tap for details</p>
            {milestone.achieved && (
              <div className="absolute -top-1 -right-1">
                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                  <Star className="h-2.5 w-2.5 text-primary-foreground fill-primary-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Back of card */}
          <div
            className={cn(
              "absolute inset-0 p-3 rounded-lg text-center flex flex-col items-center justify-center border",
              milestone.achieved
                ? "bg-gradient-to-br from-secondary/10 to-primary/10 border-primary/30"
                : "bg-muted/50 border-border"
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <Icon className={cn("h-4 w-4 mb-1", milestone.achieved ? milestone.color : "text-muted-foreground")} />
            <h4 className="text-xs font-semibold text-foreground mb-1">{milestone.title}</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
              {milestone.description}
            </p>
            {milestone.achieved ? (
              <span className="text-[10px] text-accent flex items-center gap-1">
                <Check className="h-3 w-3" />
                Achieved!
              </span>
            ) : (
              <>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {milestone.current}/{milestone.threshold} {milestone.category}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Milestone className="h-5 w-5 text-primary" />
            Travel Milestones
          </CardTitle>
          <Badge variant="secondary">
            {achievedCount}/{milestones.length} unlocked
          </Badge>
        </div>
        
        {nextMilestone && (
          <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Next milestone</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <nextMilestone.icon className={cn("h-4 w-4", nextMilestone.color)} />
                <span className="font-medium text-sm text-foreground">{nextMilestone.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {nextMilestone.current}/{nextMilestone.threshold}
              </span>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: `${Math.min((nextMilestone.current / nextMilestone.threshold) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {milestones.map((milestone) => (
            <FlippableMilestoneCard key={milestone.id} milestone={milestone} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TravelMilestones;
