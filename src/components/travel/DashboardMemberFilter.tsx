import { memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users } from 'lucide-react';
import { FamilyMember } from '@/hooks/useFamilyData';

interface DashboardMemberFilterProps {
  familyMembers: FamilyMember[];
  selectedMemberId: string | null;
  onSelectMember: (memberId: string | null) => void;
}

const DashboardMemberFilter = memo(({
  familyMembers,
  selectedMemberId,
  onSelectMember,
}: DashboardMemberFilterProps) => {
  if (familyMembers.length <= 1) return null;

  const handleValueChange = (value: string) => {
    onSelectMember(value === 'all' ? null : value);
  };

  return (
    <Select
      value={selectedMemberId || 'all'}
      onValueChange={handleValueChange}
    >
      <SelectTrigger 
        className="w-auto min-w-[140px] h-8 gap-2 text-xs bg-background border-border"
        aria-label="Filter by family member"
      >
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="All" />
      </SelectTrigger>
      <SelectContent className="bg-background border-border z-50">
        <SelectItem value="all" className="text-sm">
          <span>All Members</span>
        </SelectItem>
        {familyMembers.map((member) => (
          <SelectItem key={member.id} value={member.id} className="text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: member.color }}
              />
              <span>{member.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

DashboardMemberFilter.displayName = 'DashboardMemberFilter';

export default DashboardMemberFilter;
