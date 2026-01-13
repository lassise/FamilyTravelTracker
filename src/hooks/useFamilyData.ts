import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
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
      const [membersResult, countriesResult, visitsResult, wishlistResult, profileResult] = await Promise.all([
        supabase.from("family_members").select("*").order("created_at", { ascending: true }),
        supabase.from("countries").select("*").order("name", { ascending: true }),
        supabase.from("country_visits").select("country_id, family_member_id, family_members (name)"),
        supabase.from("country_wishlist").select("country_id"),
        supabase.from("profiles").select("home_country").eq("id", user.id).single()
      ]);

      if (membersResult.error) throw membersResult.error;
      if (countriesResult.error) throw countriesResult.error;
      if (visitsResult.error) throw visitsResult.error;
      if (wishlistResult.error) throw wishlistResult.error;

      const membersData = membersResult.data || [];
      const countriesData = countriesResult.data || [];
      const visitsData = visitsResult.data || [];
      const wishlistData = wishlistResult.data || [];
      const userHomeCountry = profileResult.data?.home_country || null;

      // Build lookup maps for O(1) access
      const visitsByMember = new Map<string, number>();
      const visitsByCountry = new Map<string, string[]>();

      for (const visit of visitsData) {
        // Count visits per member
        if (visit.family_member_id) {
          visitsByMember.set(
            visit.family_member_id, 
            (visitsByMember.get(visit.family_member_id) || 0) + 1
          );
        }
        // Group visits by country
        if (visit.country_id) {
          const memberName = (visit as any).family_members?.name;
          if (memberName) {
            const existing = visitsByCountry.get(visit.country_id) || [];
            existing.push(memberName);
            visitsByCountry.set(visit.country_id, existing);
          }
        }
      }

      // Map data with O(1) lookups
      const membersWithCount = membersData.map((member) => ({
        ...member,
        countriesVisited: visitsByMember.get(member.id) || 0
      }));

      const countriesWithVisits = countriesData.map((country) => ({
        ...country,
        visitedBy: visitsByCountry.get(country.id) || []
      }));

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
