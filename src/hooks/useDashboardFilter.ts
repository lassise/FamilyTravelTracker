import { useState, useEffect, useMemo, useCallback } from 'react';
import { FamilyMember, Country } from '@/hooks/useFamilyData';

const STORAGE_KEY = 'dashboard-member-filter';

interface UseDashboardFilterResult {
  selectedMemberIds: string[];
  setSelectedMemberIds: (ids: string[]) => void;
  isAllSelected: boolean;
  toggleMember: (memberId: string) => void;
  toggleAll: () => void;
  getFilteredCountries: (countries: Country[]) => Country[];
  getFilteredContinents: (countries: Country[]) => number;
  getFilterSummary: (familyMembers: FamilyMember[]) => string;
}

export const useDashboardFilter = (familyMembers: FamilyMember[]): UseDashboardFilterResult => {
  const allMemberIds = useMemo(() => familyMembers.map(m => m.id), [familyMembers]);
  
  // Initialize from localStorage or default to all members
  const [selectedMemberIds, setSelectedMemberIdsState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        // Validate that stored IDs still exist in family members
        return parsed;
      }
    } catch {
      // Ignore parsing errors
    }
    return [];
  });

  // When family members load/change, validate and update selected IDs
  useEffect(() => {
    if (allMemberIds.length === 0) return;
    
    if (selectedMemberIds.length === 0) {
      // Default to all members if no selection
      setSelectedMemberIdsState(allMemberIds);
      return;
    }
    
    // Filter out any IDs that no longer exist
    const validIds = selectedMemberIds.filter(id => allMemberIds.includes(id));
    
    if (validIds.length === 0) {
      // If all stored IDs are invalid, reset to all
      setSelectedMemberIdsState(allMemberIds);
    } else if (validIds.length !== selectedMemberIds.length) {
      // Some IDs were invalid, update with valid ones
      setSelectedMemberIdsState(validIds);
    }
  }, [allMemberIds, selectedMemberIds.length]);

  // Persist to localStorage whenever selection changes
  useEffect(() => {
    if (selectedMemberIds.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedMemberIds));
    }
  }, [selectedMemberIds]);

  const isAllSelected = useMemo(() => 
    allMemberIds.length > 0 && selectedMemberIds.length === allMemberIds.length,
    [allMemberIds, selectedMemberIds]
  );

  const setSelectedMemberIds = useCallback((ids: string[]) => {
    // Prevent empty selection - revert to all if trying to clear
    if (ids.length === 0 && allMemberIds.length > 0) {
      setSelectedMemberIdsState(allMemberIds);
    } else {
      setSelectedMemberIdsState(ids);
    }
  }, [allMemberIds]);

  const toggleMember = useCallback((memberId: string) => {
    setSelectedMemberIdsState(prev => {
      const newSelection = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
      
      // Prevent empty selection
      if (newSelection.length === 0) {
        return prev;
      }
      return newSelection;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      // Can't deselect all - keep current selection
      return;
    }
    setSelectedMemberIdsState(allMemberIds);
  }, [isAllSelected, allMemberIds]);

  // Filter countries based on selected members
  const getFilteredCountries = useCallback((countries: Country[]) => {
    if (isAllSelected || selectedMemberIds.length === 0) {
      return countries;
    }
    
    // Get selected member names
    const selectedMemberNames = new Set(
      familyMembers
        .filter(m => selectedMemberIds.includes(m.id))
        .map(m => m.name)
    );
    
    // Filter countries to only include visits by selected members
    return countries.map(country => ({
      ...country,
      visitedBy: country.visitedBy.filter(name => selectedMemberNames.has(name))
    }));
  }, [isAllSelected, selectedMemberIds, familyMembers]);

  // Calculate continents from filtered countries
  const getFilteredContinents = useCallback((countries: Country[]) => {
    const filtered = getFilteredCountries(countries);
    return new Set(filtered.filter(c => c.visitedBy.length > 0).map(c => c.continent)).size;
  }, [getFilteredCountries]);

  // Get human-readable summary of the filter
  const getFilterSummary = useCallback((members: FamilyMember[]) => {
    if (isAllSelected || selectedMemberIds.length === 0) {
      return 'All';
    }
    
    const selectedNames = members
      .filter(m => selectedMemberIds.includes(m.id))
      .map(m => m.name.split(' ')[0]);
    
    if (selectedNames.length <= 2) {
      return selectedNames.join(' + ');
    }
    
    return `${selectedNames[0]} + ${selectedNames.length - 1} more`;
  }, [isAllSelected, selectedMemberIds]);

  return {
    selectedMemberIds,
    setSelectedMemberIds,
    isAllSelected,
    toggleMember,
    toggleAll,
    getFilteredCountries,
    getFilteredContinents,
    getFilterSummary,
  };
};
