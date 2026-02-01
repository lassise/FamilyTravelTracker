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
  type: 'countries' | 'continents' | 'special';
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
  /** For country-type achievements when earned: list of country names to show on back */
  countryNames?: string[];
  /** For special-type achievements when earned: list of detail lines (e.g. trip names) to show on back */
  detailLines?: string[];
}

const FlippableAchievementCard = ({
  achievement,
  isEarned,
  isNewlyEarned,
  current,
  rarityStyles,
  countryNames = [],
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

          <span className="text-xs font-semibold text-foreground mt-1.5 text-center leading-tight">
            {achievement.name}
          </span>
          {isEarned && (
            <>
              <p className="text-[10px] text-muted-foreground text-center mt-0.5 leading-tight">
                {achievement.description}
              </p>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center justify-center gap-1">
                <Check className="h-3 w-3" />
                Unlocked!
              </span>
            </>
          )}
          {!isEarned && (
            <div className="w-full mt-2">
              <Progress value={progress} className="h-1" />
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                {current}/{achievement.requirement}
              </p>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-auto">Tap for details</p>
        </div>

        {/* Back of card — details only (no repeat of front); scrollable list when earned + countries */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col p-3 rounded-lg border backface-hidden overflow-hidden",
            isEarned
              ? `bg-gradient-to-br from-primary/10 to-secondary/10 ${rarityStyles.border}`
              : 'bg-muted/50 border-border'
          )}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {isEarned && achievement.type === 'countries' && countryNames.length > 0 ? (
            <>
              <p className="text-[10px] font-medium text-foreground mb-1.5 shrink-0">Countries ({countryNames.length})</p>
              <ul className="text-[10px] text-muted-foreground text-left list-disc list-inside space-y-0.5 min-h-0 flex-1 overflow-y-auto pr-1">
                {countryNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </>
          ) : isEarned && achievement.type === 'special' && detailLines.length > 0 ? (
            <>
              <p className="text-[10px] font-medium text-foreground mb-1.5 shrink-0">Unlocked by</p>
              <ul className="text-[10px] text-muted-foreground text-left list-disc list-inside space-y-0.5 min-h-0 flex-1 overflow-y-auto pr-1">
                {detailLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </>
          ) : isEarned ? (
            <p className="text-[10px] text-muted-foreground text-center">No details to show.</p>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed mb-2">
                {achievement.hint}
              </p>
              <span className="text-[10px] text-muted-foreground text-center">
                {current}/{achievement.requirement} {achievement.type}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlippableAchievementCard;
