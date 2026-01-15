import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usStateFlagUrls, getStateAbbreviation } from '@/lib/stateFlagsData';

interface StateGridSelectorProps {
  states: Record<string, string>;
  selectedStates: Set<string>;
  onStateToggle: (stateCode: string) => void;
  countryCode: string;
}

const StateCard = memo(({ 
  code, 
  name, 
  isSelected, 
  onToggle,
  flagUrl 
}: { 
  code: string; 
  name: string; 
  isSelected: boolean; 
  onToggle: () => void;
  flagUrl: string | null;
}) => {
  const abbreviation = getStateAbbreviation(code);
  
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative group aspect-[4/3] rounded-lg overflow-hidden transition-all duration-200",
        "border-2 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected 
          ? "border-emerald-500 shadow-md shadow-emerald-500/20" 
          : "border-border/50 hover:border-primary/50"
      )}
    >
      {/* Flag Background */}
      {flagUrl ? (
        <img 
          src={flagUrl} 
          alt={`${name} flag`}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-200",
            isSelected ? "opacity-100" : "opacity-40 group-hover:opacity-60"
          )}
          loading="lazy"
        />
      ) : (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-muted to-muted/50",
          isSelected && "from-emerald-100 to-emerald-50"
        )} />
      )}
      
      {/* Overlay gradient for text readability - darker for non-visited */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t transition-opacity duration-200",
        isSelected 
          ? "from-emerald-900/60 via-emerald-900/20 to-transparent" 
          : "from-black/80 via-black/50 to-black/30 group-hover:from-black/70 group-hover:via-black/40"
      )} />
      
      {/* State Abbreviation - positioned higher to make room for name */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
        <span className={cn(
          "text-lg md:text-xl font-bold tracking-wide drop-shadow-lg transition-colors",
          isSelected ? "text-white" : "text-white/80"
        )}>
          {abbreviation}
        </span>
      </div>
      
      {/* Selection Indicator - only one checkmark */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center bg-emerald-500">
          <Check className="w-3 h-3 md:w-4 md:h-4 text-white" />
        </div>
      )}
      
      {/* State Name - always visible at bottom */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 px-1 py-1 text-[9px] md:text-[10px] text-center",
        "text-white font-medium truncate",
        isSelected ? "bg-emerald-600/80" : "bg-black/70"
      )}>
        {name}
      </div>
      
      {/* Visited Badge */}
      {isSelected && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-emerald-500 rounded text-[8px] md:text-[10px] font-bold text-white uppercase tracking-wider">
          ✓
        </div>
      )}
    </button>
  );
});

StateCard.displayName = 'StateCard';

const StateGridSelector = ({ states, selectedStates, onStateToggle, countryCode }: StateGridSelectorProps) => {
  const stateEntries = Object.entries(states);
  const isUSA = countryCode === 'US';
  
  // Get flag URLs (only for USA currently)
  const getFlagUrl = (code: string): string | null => {
    if (isUSA) {
      return usStateFlagUrls[code] || null;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-9 gap-2 md:gap-3">
      {stateEntries.map(([code, name]) => (
        <StateCard
          key={code}
          code={code}
          name={name}
          isSelected={selectedStates.has(code)}
          onToggle={() => onStateToggle(code)}
          flagUrl={getFlagUrl(code)}
        />
      ))}
    </div>
  );
};

export default memo(StateGridSelector);
