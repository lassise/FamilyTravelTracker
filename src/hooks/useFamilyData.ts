import { useEffect, useState, useCallback } from "react";
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

  const fetchData = useCallback(async () => {
    if (!user) {
      setFamilyMembers([]);
      setCountries([]);
      setWishlist([]);
      setHomeCountry(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch family members
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("*")
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      // Fetch countries
      const { data: countriesData, error: countriesError } = await supabase
        .from("countries")
        .select("*")
        .order("name", { ascending: true });

      if (countriesError) throw countriesError;

      // Fetch country visits
      const { data: visitsData, error: visitsError } = await supabase
        .from("country_visits")
        .select(`
          country_id,
          family_member_id,
          family_members (name)
        `);

      if (visitsError) throw visitsError;

      // Fetch wishlist
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("country_wishlist")
        .select("country_id");

      if (wishlistError) throw wishlistError;

      // Fetch home country from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("home_country")
        .eq("id", user.id)
        .single();
      const userHomeCountry = profileData?.home_country || null;

      // Calculate countries visited per family member
      const membersWithCount = membersData?.map((member) => {
        const visitCount = visitsData?.filter(
          (visit) => visit.family_member_id === member.id
        ).length || 0;
        return { ...member, countriesVisited: visitCount };
      }) || [];

      // Map visited by names to countries
      const countriesWithVisits = countriesData?.map((country) => {
        const visits = visitsData?.filter((visit) => visit.country_id === country.id) || [];
        const visitedBy = visits
          .map((visit: any) => visit.family_members?.name)
          .filter(Boolean);
        return { ...country, visitedBy };
      }) || [];

      // Extract wishlist country IDs
      const wishlistIds = wishlistData?.map(w => w.country_id).filter(Boolean) as string[] || [];

      setFamilyMembers(membersWithCount);
      setCountries(countriesWithVisits);
      setWishlist(wishlistIds);
      setHomeCountry(userHomeCountry);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    // Set up realtime subscriptions
    const channel = supabase
      .channel('family_data_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'family_members' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'countries' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'country_visits' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'country_wishlist' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  // Calculate total continents visited
  const totalContinents = new Set(
    countries.filter(c => c.visitedBy.length > 0).map(c => c.continent)
  ).size;

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
