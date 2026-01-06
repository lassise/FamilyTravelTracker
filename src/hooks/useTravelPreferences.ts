import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TravelPreferences {
  id: string;
  user_id: string;
  liked_countries: string[];
  disliked_countries: string[];
  travel_style: string[];
  budget_preference: string;
  pace_preference: string;
  accommodation_preference: string[];
  interests: string[];
  avoid_preferences: string[];
  travel_with: string;
}

const defaultPreferences: Omit<TravelPreferences, 'id' | 'user_id'> = {
  liked_countries: [],
  disliked_countries: [],
  travel_style: [],
  budget_preference: 'moderate',
  pace_preference: 'moderate',
  accommodation_preference: [],
  interests: [],
  avoid_preferences: [],
  travel_with: 'family',
};

export const useTravelPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<TravelPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("travel_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPreferences(data as TravelPreferences);
      } else {
        // Create default preferences
        const { data: newData, error: insertError } = await supabase
          .from("travel_preferences")
          .insert({ user_id: user.id, ...defaultPreferences })
          .select()
          .single();
        
        if (!insertError && newData) {
          setPreferences(newData as TravelPreferences);
        }
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const updatePreferences = async (updates: Partial<TravelPreferences>) => {
    if (!user || !preferences) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("travel_preferences")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (!error && data) {
      setPreferences(data as TravelPreferences);
    }

    return { data, error };
  };

  const toggleCountryPreference = async (
    countryName: string,
    type: 'liked' | 'disliked'
  ) => {
    if (!preferences) return;

    const likedField = 'liked_countries';
    const dislikedField = 'disliked_countries';

    let newLiked = [...preferences.liked_countries];
    let newDisliked = [...preferences.disliked_countries];

    if (type === 'liked') {
      if (newLiked.includes(countryName)) {
        newLiked = newLiked.filter(c => c !== countryName);
      } else {
        newLiked.push(countryName);
        newDisliked = newDisliked.filter(c => c !== countryName);
      }
    } else {
      if (newDisliked.includes(countryName)) {
        newDisliked = newDisliked.filter(c => c !== countryName);
      } else {
        newDisliked.push(countryName);
        newLiked = newLiked.filter(c => c !== countryName);
      }
    }

    await updatePreferences({
      [likedField]: newLiked,
      [dislikedField]: newDisliked,
    });
  };

  return {
    preferences,
    loading,
    refetch: fetchPreferences,
    updatePreferences,
    toggleCountryPreference,
  };
};
