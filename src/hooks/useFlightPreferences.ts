import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface HomeAirport {
  code: string;
  name: string;
  driveMinutes: number;
  isPrimary: boolean;
}

export interface AlternateAirport {
  code: string;
  name: string;
  minSavings: number; // Minimum savings required to consider this airport
}

export type PreferencePriority = "non_negotiable" | "strong" | "nice_to_have";

export interface FlightPreferences {
  id?: string;
  home_airports: HomeAirport[];
  alternate_airports: AlternateAirport[]; // New: airports user is willing to drive to for savings
  preferred_airlines: string[];
  avoided_airlines: string[];
  preferred_alliances: string[];
  seat_preference: string[];
  needs_window_for_car_seat: boolean;
  cabin_class: "economy" | "premium_economy" | "business" | "first";
  max_stops: number;
  prefer_nonstop: boolean;
  max_layover_hours: number;
  min_connection_minutes: number;
  max_total_travel_hours: number;
  preferred_departure_times: string[];
  red_eye_allowed: boolean;
  family_mode: boolean;
  family_min_connection_minutes: number;
  default_checked_bags: number;
  carry_on_only: boolean;
  search_mode: "cash" | "points" | "hybrid";
  // Preference priorities
  nonstop_priority: PreferencePriority;
  departure_time_priority: PreferencePriority;
  airline_priority: PreferencePriority;
  layover_priority: PreferencePriority;
  seat_priority: PreferencePriority;
}

const defaultPreferences: FlightPreferences = {
  home_airports: [],
  alternate_airports: [],
  preferred_airlines: [],
  avoided_airlines: [],
  preferred_alliances: [],
  seat_preference: [],
  needs_window_for_car_seat: false,
  cabin_class: "economy",
  max_stops: 0,
  prefer_nonstop: true,
  max_layover_hours: 4,
  min_connection_minutes: 60,
  max_total_travel_hours: 24,
  preferred_departure_times: [],
  red_eye_allowed: false,
  family_mode: false,
  family_min_connection_minutes: 90,
  default_checked_bags: 0,
  carry_on_only: false,
  search_mode: "cash",
  // Default priorities
  nonstop_priority: "strong",
  departure_time_priority: "nice_to_have",
  airline_priority: "nice_to_have",
  layover_priority: "strong",
  seat_priority: "nice_to_have",
};

export const useFlightPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<FlightPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch both flight preferences and profile home_airports in parallel
      const [flightPrefsResult, profileResult] = await Promise.all([
        supabase
          .from("flight_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("profiles")
          .select("home_airports")
          .eq("id", user.id)
          .single()
      ]);

      // Parse profile home_airports as fallback
      let profileHomeAirports: HomeAirport[] = [];
      if (profileResult.data?.home_airports) {
        const rawAirports = profileResult.data.home_airports;
        if (typeof rawAirports === 'string') {
          try {
            profileHomeAirports = JSON.parse(rawAirports);
          } catch {
            profileHomeAirports = [];
          }
        } else if (Array.isArray(rawAirports)) {
          profileHomeAirports = rawAirports as unknown as HomeAirport[];
        }
      }

      if (flightPrefsResult.error) {
        if (flightPrefsResult.error.code === "PGRST116") {
          // No preferences exist yet, create defaults with profile airports
          await createDefaultPreferences(profileHomeAirports);
        } else {
          throw flightPrefsResult.error;
        }
      } else if (flightPrefsResult.data) {
        const data = flightPrefsResult.data;
        
        // Parse home_airports from flight preferences JSON
        let homeAirports: HomeAirport[] = [];
        if (data.home_airports) {
          if (typeof data.home_airports === 'string') {
            try {
              homeAirports = JSON.parse(data.home_airports);
            } catch {
              homeAirports = [];
            }
          } else if (Array.isArray(data.home_airports)) {
            homeAirports = data.home_airports as unknown as HomeAirport[];
          }
        }
        
        // Use profile home_airports as fallback if flight preferences don't have any
        if (homeAirports.length === 0 && profileHomeAirports.length > 0) {
          homeAirports = profileHomeAirports;
        }
        
        // Parse alternate_airports - stored alongside home_airports or separately
        let alternateAirports: AlternateAirport[] = [];
        // For now, we'll store alternate_airports in the same JSON field or as a separate concept
        // Since DB doesn't have this field yet, we'll initialize empty
        
        setPreferences({
          id: data.id,
          home_airports: homeAirports,
          alternate_airports: alternateAirports,
          preferred_airlines: data.preferred_airlines || [],
          avoided_airlines: data.avoided_airlines || [],
          preferred_alliances: data.preferred_alliances || [],
          seat_preference: Array.isArray(data.seat_preference) 
            ? data.seat_preference 
            : data.seat_preference ? [data.seat_preference] : [],
          needs_window_for_car_seat: data.needs_window_for_car_seat || false,
          cabin_class: (data.cabin_class as "economy" | "premium_economy" | "business" | "first") || "economy",
          max_stops: data.max_stops || 0,
          prefer_nonstop: data.prefer_nonstop ?? true,
          max_layover_hours: data.max_layover_hours || 4,
          min_connection_minutes: data.min_connection_minutes || 60,
          max_total_travel_hours: data.max_total_travel_hours || 24,
          preferred_departure_times: data.preferred_departure_times || [],
          red_eye_allowed: data.red_eye_allowed || false,
          family_mode: data.family_mode || false,
          family_min_connection_minutes: data.family_min_connection_minutes || 90,
          default_checked_bags: data.default_checked_bags || 0,
          carry_on_only: data.carry_on_only || false,
          search_mode: (data.search_mode as "cash" | "points" | "hybrid") || "cash",
          // Priority settings
          nonstop_priority: "strong",
          departure_time_priority: "nice_to_have",
          airline_priority: "nice_to_have",
          layover_priority: "strong",
          seat_priority: "nice_to_have",
        });
      }
    } catch (error) {
      console.error("Error fetching flight preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async (profileHomeAirports: HomeAirport[] = []) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("flight_preferences")
        .insert([{
          user_id: user.id,
          home_airports: JSON.stringify(profileHomeAirports),
          preferred_airlines: [],
          avoided_airlines: [],
          preferred_alliances: [],
          seat_preference: null,
          needs_window_for_car_seat: false,
          cabin_class: "economy",
          max_stops: 0,
          prefer_nonstop: true,
          max_layover_hours: 4,
          min_connection_minutes: 60,
          max_total_travel_hours: 24,
          preferred_departure_times: [],
          red_eye_allowed: false,
          family_mode: false,
          family_min_connection_minutes: 90,
          willing_to_drive_further: true,
          max_extra_drive_minutes: 60,
          min_savings_for_further_airport: 200,
          default_checked_bags: 0,
          carry_on_only: false,
          search_mode: "cash",
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setPreferences({
          ...defaultPreferences,
          id: data.id,
          home_airports: profileHomeAirports,
        });
      }
    } catch (error) {
      console.error("Error creating default preferences:", error);
    }
  };

  const updatePreferences = async (updates: Partial<FlightPreferences>) => {
    if (!user?.id) return;

    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.home_airports) {
        updateData.home_airports = JSON.stringify(updates.home_airports);
      }

      const { error } = await supabase
        .from("flight_preferences")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to save preferences");
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user?.id]);

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences,
  };
};
