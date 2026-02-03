import React, { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { MapPin, CheckCircle2, Search } from 'lucide-react';
import { useStateVisits } from '@/hooks/useStateVisits';
import { useFamilyData, Country } from '@/hooks/useFamilyData';
import { getSubdivisionsForCountry, getSubdivisionLabel } from '@/lib/allSubdivisionsData';
import { getAllCountries } from '@/lib/countriesData';
import StateGridSelector from './StateGridSelector';
import StateMemberSelectionDialog from './StateMemberSelectionDialog';
import CountryFlag from '@/components/common/CountryFlag';
import { getEffectiveFlagCode } from '@/lib/countriesData';

interface StateMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null;
  selectedMemberId?: string | null;
}

const StateMapDialog = ({ open, onOpenChange, country, selectedMemberId }: StateMapDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [selectedStateName, setSelectedStateName] = useState<string | null>(null);

  const { familyMembers } = useFamilyData();

  // Get country code from countries-list
  const countryCode = useMemo(() => {
    if (!country) return null;
    const allCountries = getAllCountries();
    const match = allCountries.find(c => c.name === country.name);
    return match?.code || null;
  }, [country]);

  const { stateVisits, refetch } = useStateVisits(countryCode || undefined);

  // List of 50 US states (excluding DC and territories)
  const continentalUSStates = useMemo(() => {
    const stateCodes = [
      'US-AL', 'US-AZ', 'US-AR', 'US-CA', 'US-CO', 'US-CT', 'US-DE', 'US-FL',
      'US-GA', 'US-ID', 'US-IL', 'US-IN', 'US-IA', 'US-KS', 'US-KY', 'US-LA',
      'US-ME', 'US-MD', 'US-MA', 'US-MI', 'US-MN', 'US-MS', 'US-MO', 'US-MT',
      'US-NE', 'US-NV', 'US-NH', 'US-NJ', 'US-NM', 'US-NY', 'US-NC', 'US-ND',
      'US-OH', 'US-OK', 'US-OR', 'US-PA', 'US-RI', 'US-SC', 'US-SD', 'US-TN',
      'US-TX', 'US-UT', 'US-VT', 'US-VA', 'US-WA', 'US-WV', 'US-WI', 'US-WY',
      'US-AK', 'US-HI' // Alaska and Hawaii are included in the 50 states
    ];
    return new Set(stateCodes);
  }, []);

  const states = useMemo(() => {
    if (!countryCode) return null;
    const allStates = getSubdivisionsForCountry(countryCode);
    if (!allStates) return null;

    // For US, filter to only 50 states (exclude DC and territories)
    if (countryCode === 'US') {
      const filtered: Record<string, string> = {};
      Object.entries(allStates).forEach(([code, name]) => {
        if (continentalUSStates.has(code)) {
          filtered[code] = name;
        }
      });

      // Sort alphabetically by state name
      const sortedEntries = Object.entries(filtered).sort(([, nameA], [, nameB]) =>
        nameA.localeCompare(nameB)
      );

      return Object.fromEntries(sortedEntries);
    }

    // For other countries, return all subdivisions sorted alphabetically
    const sortedEntries = Object.entries(allStates).sort(([, nameA], [, nameB]) =>
      nameA.localeCompare(nameB)
    );
    return Object.fromEntries(sortedEntries);
  }, [countryCode, continentalUSStates]);

  const filteredStates = useMemo(() => {
    if (!states) return null;
    if (!searchQuery.trim()) return states;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, string> = {};
    Object.entries(states).forEach(([code, name]) => {
      if (name.toLowerCase().includes(query) || code.toLowerCase().includes(query)) {
        filtered[code] = name;
      }
    });

    // Maintain alphabetical order after filtering
    const sortedEntries = Object.entries(filtered).sort(([, nameA], [, nameB]) =>
      nameA.localeCompare(nameB)
    );
    return Object.fromEntries(sortedEntries);
  }, [states, searchQuery]);

  // States visited by at least one member (for highlighting)
  // If selectedMemberId is set, only show states visited by that member
  // Otherwise, show union of all visited states (family aggregate view)
  const visitedStateCodes = useMemo(() => {
    if (selectedMemberId) {
      // Filter to only states visited by the selected member
      return new Set(
        stateVisits
          .filter(sv => sv.family_member_id === selectedMemberId)
          .map(sv => sv.state_code)
      );
    }
    // Family aggregate view: show all states visited by any member
    return new Set(stateVisits.map(sv => sv.state_code));
  }, [stateVisits, selectedMemberId]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setMemberDialogOpen(false);
      setSelectedStateCode(null);
      setSelectedStateName(null);
    }
  }, [open]);

  // Handle state click - open member selection dialog
  const handleStateClick = (stateCode: string, stateName: string) => {
    setSelectedStateCode(stateCode);
    setSelectedStateName(stateName);
    setMemberDialogOpen(true);
  };

  const handleMemberDialogClose = () => {
    setMemberDialogOpen(false);
    setSelectedStateCode(null);
    setSelectedStateName(null);
  };

  const handleMemberDialogSave = () => {
    // Refetch state visits to update the grid
    refetch();
  };

  if (!country || !countryCode || !states) {
    return null;
  }

  const stateEntries = Object.entries(states);
  const visitedCount = visitedStateCodes.size;
  const totalCount = stateEntries.length;
  const progressPercent = Math.round((visitedCount / totalCount) * 100);

  const regionLabel = getSubdivisionLabel(countryCode);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-full bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {(() => {
                    const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                    return isSubdivision || code ? (
                      <CountryFlag countryCode={code} countryName={country.name} size="lg" />
                    ) : (
                      <span className="text-2xl">{country.flag}</span>
                    );
                  })()}
                  <span>{country.name}</span>
                </div>
                <DialogDescription className="text-sm text-muted-foreground font-normal mt-0.5">
                  Click a {regionLabel.toLowerCase().replace(/s$/, '')} to select which family members have visited
                </DialogDescription>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4">
            {/* Search and Stats Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${regionLabel.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-4">
                  <Badge
                    variant="default"
                    className="text-sm px-3 py-1 bg-emerald-500 hover:bg-emerald-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {visitedCount} / {totalCount}
                  </Badge>

                  {/* Progress Bar */}
                  <div className="hidden md:flex items-center gap-2 min-w-[120px]">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-10">
                      {progressPercent}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* State Grid */}
            <ScrollArea className="h-[calc(90vh-280px)] min-h-[300px]">
              <div className="pr-4">
                {filteredStates && Object.keys(filteredStates).length > 0 ? (
                  <StateGridSelector
                    states={filteredStates}
                    selectedStates={visitedStateCodes}
                    onStateClick={handleStateClick}
                    countryCode={countryCode}
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    No {regionLabel.toLowerCase()} found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Click on a {regionLabel.toLowerCase().replace(/s$/, '')} to select which family members have visited it
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Selection Dialog */}
      {selectedStateCode && selectedStateName && country && countryCode && (
        <StateMemberSelectionDialog
          open={memberDialogOpen}
          onOpenChange={handleMemberDialogClose}
          countryId={country.id}
          countryCode={countryCode}
          stateCode={selectedStateCode}
          stateName={selectedStateName}
          onSave={handleMemberDialogSave}
        />
      )}
    </>
  );
};

export default StateMapDialog;
