import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface TravelProfile {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  trip_length_min: number;
  trip_length_max: number;
  domestic_vs_international: string;
  preferred_seat_types: string[];
  preferred_seat_features: string[];
  prefer_nonstop: boolean;
  max_stops: number;
  pace: string;
  budget_level: string;
  kid_friendly_priority: string;
  custom_preferences: Json;
  created_at: string;
  updated_at: string;
}

interface DefaultProfile {
  name: string;
  is_active: boolean;
  is_default: boolean;
  trip_length_min: number;
  trip_length_max: number;
  domestic_vs_international: string;
  preferred_seat_types: string[];
  preferred_seat_features: string[];
  prefer_nonstop: boolean;
  max_stops: number;
  pace: string;
  budget_level: string;
  kid_friendly_priority: string;
  custom_preferences: Json;
}

const DEFAULT_PROFILES: DefaultProfile[] = [
  {
    name: "Short Domestic Trips",
    is_active: true,
    is_default: true,
    trip_length_min: 1,
    trip_length_max: 5,
    domestic_vs_international: 'domestic',
    preferred_seat_types: ['economy', 'premium_economy'],
    preferred_seat_features: ['aisle', 'extra_legroom'],
    prefer_nonstop: true,
    max_stops: 1,
    pace: 'moderate',
    budget_level: 'moderate',
    kid_friendly_priority: 'moderate',
    custom_preferences: {},
  },
  {
    name: "Long International Trips",
    is_active: false,
    is_default: true,
    trip_length_min: 7,
    trip_length_max: 21,
    domestic_vs_international: 'international',
    preferred_seat_types: ['business', 'premium_economy'],
    preferred_seat_features: ['lie_flat', 'pod', 'window'],
    prefer_nonstop: false,
    max_stops: 1,
    pace: 'relaxed',
    budget_level: 'moderate',
    kid_friendly_priority: 'high',
    custom_preferences: {},
  },
];

export const useTravelProfiles = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<TravelProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState<TravelProfile | null>(null);

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setActiveProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("travel_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Create default profiles for new users
        const defaultsToInsert = DEFAULT_PROFILES.map(profile => ({
          ...profile,
          user_id: user.id,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from("travel_profiles")
          .insert(defaultsToInsert)
          .select();

        if (insertError) throw insertError;
        
        const typedInserted = inserted as TravelProfile[];
        setProfiles(typedInserted);
        setActiveProfile(typedInserted.find(p => p.is_active) || null);
      } else {
        const typedData = data as TravelProfile[];
        setProfiles(typedData);
        setActiveProfile(typedData.find(p => p.is_active) || null);
      }
    } catch (error) {
      console.error("Error fetching travel profiles:", error);
      toast.error("Failed to load travel profiles");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = async (profile: Omit<TravelProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return { error: new Error("Not authenticated") };

    const insertData = {
      name: profile.name,
      is_active: profile.is_active,
      is_default: profile.is_default,
      trip_length_min: profile.trip_length_min,
      trip_length_max: profile.trip_length_max,
      domestic_vs_international: profile.domestic_vs_international,
      preferred_seat_types: profile.preferred_seat_types,
      preferred_seat_features: profile.preferred_seat_features,
      prefer_nonstop: profile.prefer_nonstop,
      max_stops: profile.max_stops,
      pace: profile.pace,
      budget_level: profile.budget_level,
      kid_friendly_priority: profile.kid_friendly_priority,
      custom_preferences: profile.custom_preferences as Json,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from("travel_profiles")
      .insert(insertData)
      .select()
      .single();

    if (!error && data) {
      await fetchProfiles();
      toast.success("Profile created successfully");
    } else if (error) {
      toast.error("Failed to create profile");
    }

    return { data: data as TravelProfile | null, error };
  };

  const updateProfile = async (id: string, updates: Partial<TravelProfile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Build a clean update object
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.trip_length_min !== undefined) updateData.trip_length_min = updates.trip_length_min;
    if (updates.trip_length_max !== undefined) updateData.trip_length_max = updates.trip_length_max;
    if (updates.domestic_vs_international !== undefined) updateData.domestic_vs_international = updates.domestic_vs_international;
    if (updates.preferred_seat_types !== undefined) updateData.preferred_seat_types = updates.preferred_seat_types;
    if (updates.preferred_seat_features !== undefined) updateData.preferred_seat_features = updates.preferred_seat_features;
    if (updates.prefer_nonstop !== undefined) updateData.prefer_nonstop = updates.prefer_nonstop;
    if (updates.max_stops !== undefined) updateData.max_stops = updates.max_stops;
    if (updates.pace !== undefined) updateData.pace = updates.pace;
    if (updates.budget_level !== undefined) updateData.budget_level = updates.budget_level;
    if (updates.kid_friendly_priority !== undefined) updateData.kid_friendly_priority = updates.kid_friendly_priority;
    if (updates.custom_preferences !== undefined) updateData.custom_preferences = updates.custom_preferences as Json;

    const { data, error } = await supabase
      .from("travel_profiles")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (!error && data) {
      await fetchProfiles();
      toast.success("Profile updated");
    } else if (error) {
      toast.error("Failed to update profile");
    }

    return { data: data as TravelProfile | null, error };
  };

  const deleteProfile = async (id: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const profile = profiles.find(p => p.id === id);
    if (profile?.is_default) {
      toast.error("Cannot delete default profiles");
      return { error: new Error("Cannot delete default profiles") };
    }

    const { error } = await supabase
      .from("travel_profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      await fetchProfiles();
      toast.success("Profile deleted");
    } else {
      toast.error("Failed to delete profile");
    }

    return { error };
  };

  const setActive = async (id: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("travel_profiles")
      .update({ is_active: true })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (!error && data) {
      await fetchProfiles();
      toast.success(`Switched to "${(data as TravelProfile).name}" profile`);
    }

    return { data: data as TravelProfile | null, error };
  };

  return {
    profiles,
    activeProfile,
    loading,
    createProfile,
    updateProfile,
    deleteProfile,
    setActive,
    refetch: fetchProfiles,
  };
};
