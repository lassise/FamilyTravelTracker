import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Lock, Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

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

interface FlippableAchievementCardProps {
  achievement: Achievement;
  isEarned: boolean;
  isNewlyEarned: boolean;
  current: number;
  rarityStyles: {
    border: string;
    badge: string;
    glow: string;
  };
}

const FlippableAchievementCard = ({
  achievement,
  isEarned,
  isNewlyEarned,
  current,
  rarityStyles,
}: FlippableAchievementCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const progress = Math.min((current / achievement.requirement) * 100, 100);

  return (
    <div
      className="relative h-[140px] cursor-pointer perspective-1000"
      onClick={() => setIsFlipped(!isFlipped)}
      style={{ perspective: '1000px' }}
    >
      <div
        className={cn(
          "absolute inset-0 transition-transform duration-500 preserve-3d",
          isFlipped && "rotate-y-180"
        )}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front of card */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center p-3 rounded-lg transition-all border backface-hidden",
            isEarned
              ? `bg-card/80 ${rarityStyles.border} ${rarityStyles.glow} shadow-md`
              : 'bg-muted/30 border-transparent opacity-60 hover:opacity-80',
            isNewlyEarned && 'animate-celebrate ring-2 ring-amber-400 ring-offset-2'
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Rarity badge */}
          {isEarned && achievement.rarity !== 'common' && (
            <Badge className={cn("absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0", rarityStyles.badge)}>
              {achievement.rarity}
            </Badge>
          )}

          <div className={cn(
            "p-2 rounded-full relative",
            isEarned ? achievement.color : 'bg-muted',
            isNewlyEarned && 'animate-icon-pop'
          )}>
            {isEarned ? (
              <achievement.icon className="h-5 w-5 text-white drop-shadow-sm" />
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

          <p className="text-[10px] text-muted-foreground mt-auto">Tap for details</p>
        </div>

        {/* Back of card */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-3 rounded-lg border backface-hidden",
            isEarned
              ? `bg-gradient-to-br from-primary/10 to-secondary/10 ${rarityStyles.border}`
              : 'bg-muted/50 border-border'
          )}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className={cn(
            "p-1.5 rounded-full mb-2",
            isEarned ? achievement.color : 'bg-muted'
          )}>
            <achievement.icon className={cn(
              "h-4 w-4",
              isEarned ? "text-primary-foreground" : "text-muted-foreground"
            )} />
          </div>
          
          <h4 className="text-xs font-semibold text-foreground text-center mb-1">
            {achievement.name}
          </h4>
          
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            {isEarned ? achievement.description : achievement.hint}
          </p>
          
          <div className="mt-2 text-[10px] font-medium">
            {isEarned ? (
              <span className="text-accent flex items-center gap-1">
                <Check className="h-3 w-3" />
                Unlocked!
              </span>
            ) : (
              <span className="text-muted-foreground">
                {current}/{achievement.requirement} {achievement.type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlippableAchievementCard;
