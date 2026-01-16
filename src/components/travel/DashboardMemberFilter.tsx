import { memo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, ChevronDown } from 'lucide-react';
import { FamilyMember } from '@/hooks/useFamilyData';
import { cn } from '@/lib/utils';

interface DashboardMemberFilterProps {
  familyMembers: FamilyMember[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  onToggleAll: () => void;
  isAllSelected: boolean;
  filterSummary: string;
}

const DashboardMemberFilter = memo(({
  familyMembers,
  selectedMemberIds,
  onToggleMember,
  onToggleAll,
  isAllSelected,
  filterSummary,
}: DashboardMemberFilterProps) => {
  if (familyMembers.length <= 1) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 text-xs bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80"
          aria-label="Filter by family member"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Showing:</span>
          <span className="font-medium">{filterSummary}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1">
          <button
            onClick={onToggleAll}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
              isAllSelected
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            <Checkbox 
              checked={isAllSelected} 
              className="pointer-events-none"
              aria-hidden="true"
            />
            <span className="font-medium">Select All</span>
          </button>
          
          <div className="h-px bg-border my-2" />
          
          {familyMembers.map((member) => {
            const isSelected = selectedMemberIds.includes(member.id);
            const isOnlyOneSelected = selectedMemberIds.length === 1 && isSelected;
            
            return (
              <button
                key={member.id}
                onClick={() => onToggleMember(member.id)}
                disabled={isOnlyOneSelected}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors",
                  isSelected
                    ? "bg-primary/10"
                    : "hover:bg-muted",
                  isOnlyOneSelected && "opacity-50 cursor-not-allowed"
                )}
              >
                <Checkbox 
                  checked={isSelected} 
                  className="pointer-events-none"
                  aria-hidden="true"
                />
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                />
                <span className="truncate">{member.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
});

DashboardMemberFilter.displayName = 'DashboardMemberFilter';

export default DashboardMemberFilter;
