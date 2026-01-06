import { useEffect, useState } from "react";
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [visitsResult, citiesResult, settingsResult] = await Promise.all([
        supabase.from("country_visit_details").select("*"),
        supabase.from("city_visits").select("*"),
        supabase.from("travel_settings").select("*").limit(1).maybeSingle(),
      ]);

      if (visitsResult.error) throw visitsResult.error;
      if (citiesResult.error) throw citiesResult.error;
      if (settingsResult.error) throw settingsResult.error;

      setVisitDetails(visitsResult.data || []);
      setCityVisits(citiesResult.data || []);
      setTravelSettings(settingsResult.data);
    } catch (error) {
      console.error("Error fetching visit details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscriptions
    const channel = supabase
      .channel("visit_details_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "country_visit_details" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "city_visits" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "travel_settings" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate summary per country
  const getCountrySummary = (countryId: string): CountryVisitSummary => {
    const countryVisits = visitDetails.filter((v) => v.country_id === countryId);
    const countryCities = cityVisits.filter((c) => c.country_id === countryId);

    return {
      countryId,
      totalDays: countryVisits.reduce((sum, v) => sum + (v.number_of_days || 0), 0),
      timesVisited: countryVisits.length,
      citiesCount: countryCities.length,
      cities: countryCities.map((c) => c.city_name),
    };
  };

  // Calculate total days abroad (excluding home country)
  const getTotalDaysAbroad = (homeCountryName: string): number => {
    // We need to match with countries table, but for now we sum all visit days
    // The caller should filter by comparing country names
    return visitDetails.reduce((sum, v) => sum + (v.number_of_days || 0), 0);
  };

  // Get all summaries
  const getAllSummaries = (): Map<string, CountryVisitSummary> => {
    const countryIds = new Set(visitDetails.map((v) => v.country_id));
    cityVisits.forEach((c) => countryIds.add(c.country_id));

    const summaries = new Map<string, CountryVisitSummary>();
    countryIds.forEach((id) => {
      summaries.set(id, getCountrySummary(id));
    });

    return summaries;
  };

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