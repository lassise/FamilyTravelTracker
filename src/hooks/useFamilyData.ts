import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  countriesVisited: number;
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  continent: string;
  visitedBy: string[];
  countryCode?: string;
}

export const useFamilyData = () => {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [homeCountry, setHomeCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setFamilyMembers([]);
      setCountries([]);
      setWishlist([]);
      setHomeCountry(null);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (isFetching.current) return;
    isFetching.current = true;

    // Only show loading on initial load, not refetches
    if (lastUserId.current !== user.id) {
      setLoading(true);
      lastUserId.current = user.id;
    }

    try {
      // Fetch all data in parallel
      // IMPORTANT: Fetch BOTH old system (country_visits) and new system (visit_family_members)
      // to preserve countries added without detailed visit records
      const [membersResult, countriesResult, visitDetailsResult, visitMembersResult, countryVisitsResult, wishlistResult, profileResult] = await Promise.all([
        supabase.from("family_members").select("*").order("created_at", { ascending: true }),
        supabase.from("countries").select("*").order("name", { ascending: true }),
        supabase.from("country_visit_details").select("id, country_id"),
        supabase.from("visit_family_members").select("visit_id, family_member_id, family_members (name)"),
        supabase.from("country_visits").select("country_id, family_member_id, family_members (name)"),
        supabase.from("country_wishlist").select("country_id"),
        supabase.from("profiles").select("home_country").eq("id", user.id).single()
      ]);

      if (membersResult.error) throw membersResult.error;
      if (countriesResult.error) throw countriesResult.error;
      if (visitDetailsResult.error) throw visitDetailsResult.error;
      if (visitMembersResult.error) throw visitMembersResult.error;
      if (countryVisitsResult.error) throw countryVisitsResult.error;
      if (wishlistResult.error) throw wishlistResult.error;

      const membersData = membersResult.data || [];
      const countriesData = countriesResult.data || [];
      const visitDetailsData = visitDetailsResult.data || [];
      const visitMembersData = visitMembersResult.data || [];
      const countryVisitsData = countryVisitsResult.data || [];
      const wishlistData = wishlistResult.data || [];
      const userHomeCountry = profileResult.data?.home_country || null;

      // Build a map from visit_id to country_id (for new detailed visit system)
      const visitToCountry = new Map<string, string>();
      for (const visit of visitDetailsData) {
        if (visit.id && visit.country_id) {
          visitToCountry.set(visit.id, visit.country_id);
        }
      }

      // Build lookup maps for O(1) access
      // Map: country_id -> Set of member names who visited
      const visitsByCountry = new Map<string, Set<string>>();
      // Map: family_member_id -> Set of unique country_ids visited
      const countriesByMember = new Map<string, Set<string>>();

      // Process NEW system: visit_family_members (detailed visits with dates)
      for (const visitMember of visitMembersData) {
        const visitId = visitMember.visit_id;
        const countryId = visitToCountry.get(visitId);
        // Safe type check: family_members may not be joined if data is missing
        const memberData = visitMember.family_members;
        const memberName = memberData && typeof memberData === 'object' && 'name' in memberData ? memberData.name : null;
        const memberId = visitMember.family_member_id;

        if (countryId && memberName && memberId) {
          // Add member to country's visitedBy set
          if (!visitsByCountry.has(countryId)) {
            visitsByCountry.set(countryId, new Set());
          }
          visitsByCountry.get(countryId)!.add(memberName);

          // Add country to member's visited countries set
          if (!countriesByMember.has(memberId)) {
            countriesByMember.set(memberId, new Set());
          }
          countriesByMember.get(memberId)!.add(countryId);
        }
      }

      // Process OLD system: country_visits (simple associations without detailed visits)
      // This preserves countries that were added without full trip details
      for (const countryVisit of countryVisitsData) {
        const countryId = countryVisit.country_id;
        // Safe type check: family_members may not be joined if data is missing
        const memberData = countryVisit.family_members;
        const memberName = memberData && typeof memberData === 'object' && 'name' in memberData ? memberData.name : null;
        const memberId = countryVisit.family_member_id;

        if (countryId && memberName && memberId) {
          // Add member to country's visitedBy set (merge with new system data)
          if (!visitsByCountry.has(countryId)) {
            visitsByCountry.set(countryId, new Set());
          }
          visitsByCountry.get(countryId)!.add(memberName);

          // Add country to member's visited countries set
          if (!countriesByMember.has(memberId)) {
            countriesByMember.set(memberId, new Set());
          }
          countriesByMember.get(memberId)!.add(countryId);
        }
      }

      // Map data with O(1) lookups
      const membersWithCount = membersData.map((member) => {
        const { role: _role, ...rest } = member;
        return {
          ...rest,
          countriesVisited: countriesByMember.get(member.id)?.size || 0
        };
      });

      const countriesWithVisits = countriesData.map((country) => {
        const memberSet = visitsByCountry.get(country.id);
        return {
          ...country,
          visitedBy: memberSet ? Array.from(memberSet) : []
        };
      });

      const wishlistIds = wishlistData
        .map(w => w.country_id)
        .filter((id): id is string => id !== null);

      setFamilyMembers(membersWithCount);
      setCountries(countriesWithVisits);
      setWishlist(wishlistIds);
      setHomeCountry(userHomeCountry);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    // Debounce realtime updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchData, 300);
    };

    const channel = supabase
      .channel('family_data_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_members' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'countries' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'country_visit_details' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visit_family_members' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'country_visits' }, debouncedFetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'country_wishlist' }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  // Memoize totalContinents calculation
  const totalContinents = useMemo(() =>
    new Set(countries.filter(c => c.visitedBy.length > 0).map(c => c.continent)).size,
    [countries]
  );

  return {
    familyMembers,
    countries,
    wishlist,
    homeCountry,
    loading,
    refetch: fetchData,
    totalContinents
  };
};
