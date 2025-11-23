import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

export const useFamilyData = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
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

      setFamilyMembers(membersWithCount);
      setCountries(countriesWithVisits);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { familyMembers, countries, loading, refetch: fetchData };
};
