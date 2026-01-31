import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VisitDetail {
  id: string;
  country_id: string;
  visit_date: string | null;
  end_date: string | null;
  number_of_days: number | null;
  notes: string | null;
  trip_name: string | null;
  trip_group_id: string | null;
  approximate_year: number | null;
  approximate_month: number | null;
  is_approximate: boolean | null;
  // Memory capture fields
  highlight: string | null;
  why_it_mattered: string | null;
}

interface CityVisit {
  id: string;
  country_id: string;
  city_name: string;
  visit_date: string | null;
  notes: string | null;
}

interface TravelSettings {
  id: string;
  home_country: string;
  home_country_code: string;
}

interface CountryVisitSummary {
  countryId: string;
  totalDays: number;
  timesVisited: number;
  citiesCount: number;
  cities: string[];
}

export const useVisitDetails = () => {
  const [visitDetails, setVisitDetails] = useState<VisitDetail[]>([]);
  const [cityVisits, setCityVisits] = useState<CityVisit[]>([]);
  const [travelSettings, setTravelSettings] = useState<TravelSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);
  const isInitialLoad = useRef(true);

  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    
    if (isInitialLoad.current) {
      setLoading(true);
    }
    
    try {
      const [visitsResult, citiesResult, settingsResult] = await Promise.all([
        supabase.from("country_visit_details").select("*"),
        supabase.from("city_visits").select("*"),
        supabase.from("travel_settings").select("*").limit(1).maybeSingle(),
      ]);

      if (visitsResult.error) throw visitsResult.error;
      if (citiesResult.error) throw citiesResult.error;
      if (!settingsResult.error) setTravelSettings(settingsResult.data);
      else setTravelSettings(null);

      setVisitDetails(visitsResult.data || []);
      setCityVisits(citiesResult.data || []);
    } catch (error) {
      console.error("Error fetching visit details:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
      isInitialLoad.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Debounce realtime updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchData, 300);
    };

    const channel = supabase
      .channel("visit_details_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "country_visit_details" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "city_visits" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "travel_settings" }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Memoize getCountrySummary
  const getCountrySummary = useCallback((countryId: string): CountryVisitSummary => {
    const countryVisits = visitDetails.filter((v) => v.country_id === countryId);
    const countryCities = cityVisits.filter((c) => c.country_id === countryId);

    return {
      countryId,
      totalDays: countryVisits.reduce((sum, v) => sum + (v.number_of_days || 0), 0),
      timesVisited: countryVisits.length,
      citiesCount: countryCities.length,
      cities: countryCities.map((c) => c.city_name),
    };
  }, [visitDetails, cityVisits]);

  // Calculate total days abroad
  const getTotalDaysAbroad = useCallback((homeCountryName: string): number => {
    return visitDetails.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
  }, [visitDetails]);

  // Memoize getAllSummaries
  const getAllSummaries = useCallback((): Map<string, CountryVisitSummary> => {
    const countryIds = new Set<string>();
    visitDetails.forEach((v) => countryIds.add(v.country_id));
    cityVisits.forEach((c) => countryIds.add(c.country_id));

    const summaries = new Map<string, CountryVisitSummary>();
    countryIds.forEach((id) => {
      summaries.set(id, getCountrySummary(id));
    });

    return summaries;
  }, [visitDetails, cityVisits, getCountrySummary]);

  return {
    visitDetails,
    cityVisits,
    travelSettings,
    loading,
    refetch: fetchData,
    getCountrySummary,
    getTotalDaysAbroad,
    getAllSummaries,
  };
};
