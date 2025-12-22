import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Trip {
  id: string;
  user_id: string;
  family_group_id: string | null;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image: string | null;
  status: string | null;
  trip_type: string | null;
  budget_total: number | null;
  currency: string | null;
  kids_ages: number[] | null;
  pace_preference: string | null;
  interests: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useTrips = () => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();

    if (!user) return;

    // Set up realtime subscription
    const channel = supabase
      .channel("trips_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trips" },
        () => fetchTrips()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createTrip = async (tripData: Partial<Omit<Trip, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("trips")
      .insert({
        title: tripData.title || "Untitled Trip",
        destination: tripData.destination,
        start_date: tripData.start_date,
        end_date: tripData.end_date,
        cover_image: tripData.cover_image,
        status: tripData.status,
        trip_type: tripData.trip_type,
        budget_total: tripData.budget_total,
        currency: tripData.currency,
        kids_ages: tripData.kids_ages,
        pace_preference: tripData.pace_preference,
        interests: tripData.interests,
        notes: tripData.notes,
        family_group_id: tripData.family_group_id,
        user_id: user.id,
      })
      .select()
      .single();

    return { data, error };
  };

  const updateTrip = async (id: string, updates: Partial<Trip>) => {
    const { data, error } = await supabase
      .from("trips")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  };

  const deleteTrip = async (id: string) => {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    return { error };
  };

  return {
    trips,
    loading,
    refetch: fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
  };
};
