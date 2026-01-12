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

export interface FlightPreferences {
  id?: string;
  home_airports: HomeAirport[];
  preferred_airlines: string[];
  avoided_airlines: string[];
  preferred_alliances: string[];
  seat_preference: "window" | "aisle" | "middle";
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
  willing_to_drive_further: boolean;
  max_extra_drive_minutes: number;
  min_savings_for_further_airport: number;
  default_checked_bags: number;
  carry_on_only: boolean;
  search_mode: "cash" | "points" | "hybrid";
}

const defaultPreferences: FlightPreferences = {
  home_airports: [],
  preferred_airlines: [],
  avoided_airlines: [],
  preferred_alliances: [],
  seat_preference: "window",
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
      const { data, error } = await supabase
        .from("flight_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No preferences exist yet, create defaults
          await createDefaultPreferences();
        } else {
          throw error;
        }
      } else if (data) {
        // Parse home_airports from JSON
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
        
        setPreferences({
          id: data.id,
          home_airports: homeAirports,
          preferred_airlines: data.preferred_airlines || [],
          avoided_airlines: data.avoided_airlines || [],
          preferred_alliances: data.preferred_alliances || [],
          seat_preference: (data.seat_preference as "window" | "aisle" | "middle") || "window",
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
          willing_to_drive_further: data.willing_to_drive_further ?? true,
          max_extra_drive_minutes: data.max_extra_drive_minutes || 60,
          min_savings_for_further_airport: data.min_savings_for_further_airport || 200,
          default_checked_bags: data.default_checked_bags || 0,
          carry_on_only: data.carry_on_only || false,
          search_mode: (data.search_mode as "cash" | "points" | "hybrid") || "cash",
        });
      }
    } catch (error) {
      console.error("Error fetching flight preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("flight_preferences")
        .insert({
          user_id: user.id,
          ...defaultPreferences,
          home_airports: JSON.stringify(defaultPreferences.home_airports),
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setPreferences({
          ...defaultPreferences,
          id: data.id,
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
