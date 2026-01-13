import { useState, useEffect, useCallback, useRef } from "react";
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

export type PreferencePriority = "none" | "nice_to_have" | "must_have";

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
  // Amenity preferences with Must Have / Nice to Have priority
  entertainment_seatback: PreferencePriority;
  entertainment_mobile: PreferencePriority;
  usb_charging: PreferencePriority;
  legroom_preference: PreferencePriority;
  min_legroom_inches: number | null;
  // Preference priorities (legacy - kept for compatibility)
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
  // Amenity defaults
  entertainment_seatback: "nice_to_have",
  entertainment_mobile: "nice_to_have",
  usb_charging: "nice_to_have",
  legroom_preference: "nice_to_have",
  min_legroom_inches: null,
  // Default priorities
  nonstop_priority: "nice_to_have",
  departure_time_priority: "nice_to_have",
  airline_priority: "nice_to_have",
  layover_priority: "nice_to_have",
  seat_priority: "nice_to_have",
};

export const useFlightPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<FlightPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (isFetching.current) return;
    isFetching.current = true;

    try {
      // Fetch both in parallel
      const [flightPrefsResult, profileResult] = await Promise.all([
        supabase.from("flight_preferences").select("*").eq("user_id", user.id).single(),
        supabase.from("profiles").select("home_airports").eq("id", user.id).single()
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
          await createDefaultPreferences(profileHomeAirports);
        } else {
          throw flightPrefsResult.error;
        }
      } else if (flightPrefsResult.data) {
        const data = flightPrefsResult.data;
        
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
        
        if (homeAirports.length === 0 && profileHomeAirports.length > 0) {
          homeAirports = profileHomeAirports;
        }
        
        setPreferences({
          id: data.id,
          home_airports: homeAirports,
          alternate_airports: [],
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
          // Amenity preferences
          entertainment_seatback: (data.entertainment_seatback as PreferencePriority) || "nice_to_have",
          entertainment_mobile: (data.entertainment_mobile as PreferencePriority) || "nice_to_have",
          usb_charging: (data.usb_charging as PreferencePriority) || "nice_to_have",
          legroom_preference: (data.legroom_preference as PreferencePriority) || "nice_to_have",
          min_legroom_inches: data.min_legroom_inches || null,
          nonstop_priority: "nice_to_have",
          departure_time_priority: "nice_to_have",
          airline_priority: "nice_to_have",
          layover_priority: "nice_to_have",
          seat_priority: "nice_to_have",
        });
      }
    } catch (error) {
      console.error("Error fetching flight preferences:", error);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user?.id]);

  const createDefaultPreferences = useCallback(async (profileHomeAirports: HomeAirport[] = []) => {
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
  }, [user?.id]);

  const updatePreferences = useCallback(async (updates: Partial<FlightPreferences>) => {
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
  }, [user?.id, preferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    refetch: fetchPreferences,
  };
};
