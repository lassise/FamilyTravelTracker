import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TripLeg {
  id: string;
  trip_id: string;
  country_id: string | null;
  country_name: string;
  country_code: string | null;
  start_date: string;
  end_date: string;
  number_of_days: number;
  order_index: number;
  cities: string[] | null;
  notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TripLegInput {
  trip_id: string;
  country_id?: string | null;
  country_name: string;
  country_code?: string | null;
  start_date: string;
  end_date: string;
  order_index?: number;
  cities?: string[] | null;
  notes?: string | null;
}

export const useTripLegs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Fetch all legs for a specific trip
  const fetchLegsForTrip = useCallback(async (tripId: string): Promise<{ data: TripLeg[] | null; error: Error | null }> => {
    if (!tripId) return { data: [], error: null };

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trip_legs")
        .select("*")
        .eq("trip_id", tripId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return { data: data as TripLeg[], error: null };
    } catch (error) {
      console.error("Error fetching trip legs:", error);
      return { data: null, error: error as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all legs for a specific country (by country_id or country_name)
  const fetchLegsForCountry = useCallback(async (
    countryId?: string,
    countryName?: string
  ): Promise<{ data: TripLeg[] | null; error: Error | null }> => {
    if (!countryId && !countryName) return { data: [], error: null };

    setLoading(true);
    try {
      let query = supabase.from("trip_legs").select("*");

      if (countryId) {
        query = query.eq("country_id", countryId);
      } else if (countryName) {
        query = query.ilike("country_name", countryName);
      }

      const { data, error } = await query.order("start_date", { ascending: false });

      if (error) throw error;
      return { data: data as TripLeg[], error: null };
    } catch (error) {
      console.error("Error fetching country legs:", error);
      return { data: null, error: error as Error };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a single leg
  const createLeg = useCallback(async (leg: TripLegInput): Promise<{ data: TripLeg | null; error: Error | null }> => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    try {
      const { data, error } = await supabase
        .from("trip_legs")
        .insert({
          trip_id: leg.trip_id,
          country_id: leg.country_id || null,
          country_name: leg.country_name,
          country_code: leg.country_code || null,
          start_date: leg.start_date,
          end_date: leg.end_date,
          order_index: leg.order_index ?? 0,
          cities: leg.cities || null,
          notes: leg.notes || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as TripLeg, error: null };
    } catch (error) {
      console.error("Error creating trip leg:", error);
      return { data: null, error: error as Error };
    }
  }, [user]);

  // Create multiple legs at once (for trip creation)
  const createLegs = useCallback(async (legs: TripLegInput[]): Promise<{ data: TripLeg[] | null; error: Error | null }> => {
    if (!user) return { data: null, error: new Error("Not authenticated") };
    if (legs.length === 0) return { data: [], error: null };

    try {
      const legsWithUser = legs.map((leg, index) => ({
        trip_id: leg.trip_id,
        country_id: leg.country_id || null,
        country_name: leg.country_name,
        country_code: leg.country_code || null,
        start_date: leg.start_date,
        end_date: leg.end_date,
        order_index: leg.order_index ?? index,
        cities: leg.cities || null,
        notes: leg.notes || null,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from("trip_legs")
        .insert(legsWithUser)
        .select();

      if (error) throw error;
      return { data: data as TripLeg[], error: null };
    } catch (error) {
      console.error("Error creating trip legs:", error);
      return { data: null, error: error as Error };
    }
  }, [user]);

  // Update a single leg
  const updateLeg = useCallback(async (
    id: string,
    updates: Partial<Omit<TripLegInput, 'trip_id'>>
  ): Promise<{ data: TripLeg | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase
        .from("trip_legs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as TripLeg, error: null };
    } catch (error) {
      console.error("Error updating trip leg:", error);
      return { data: null, error: error as Error };
    }
  }, []);

  // Delete a single leg
  const deleteLeg = useCallback(async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase
        .from("trip_legs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting trip leg:", error);
      return { error: error as Error };
    }
  }, []);

  // Delete all legs for a trip
  const deleteLegsForTrip = useCallback(async (tripId: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase
        .from("trip_legs")
        .delete()
        .eq("trip_id", tripId);

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error deleting trip legs:", error);
      return { error: error as Error };
    }
  }, []);

  // Reorder legs within a trip
  const reorderLegs = useCallback(async (
    tripId: string,
    orderedLegIds: string[]
  ): Promise<{ error: Error | null }> => {
    try {
      // Update each leg with its new order_index
      const updates = orderedLegIds.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("trip_legs")
          .update({ order_index: update.order_index })
          .eq("id", update.id)
          .eq("trip_id", tripId);

        if (error) throw error;
      }

      return { error: null };
    } catch (error) {
      console.error("Error reordering trip legs:", error);
      return { error: error as Error };
    }
  }, []);

  // Replace all legs for a trip (for editing)
  const replaceLegsForTrip = useCallback(async (
    tripId: string,
    newLegs: Omit<TripLegInput, 'trip_id'>[]
  ): Promise<{ data: TripLeg[] | null; error: Error | null }> => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    try {
      // Delete existing legs
      const { error: deleteError } = await deleteLegsForTrip(tripId);
      if (deleteError) throw deleteError;

      // Create new legs
      const legsWithTripId = newLegs.map((leg, index) => ({
        ...leg,
        trip_id: tripId,
        order_index: leg.order_index ?? index,
      }));

      const { data, error } = await createLegs(legsWithTripId);
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error replacing trip legs:", error);
      return { data: null, error: error as Error };
    }
  }, [user, deleteLegsForTrip, createLegs]);

  // Calculate trip dates from legs (first leg start to last leg end)
  const calculateTripDatesFromLegs = useCallback((legs: TripLeg[] | TripLegInput[]): {
    start_date: string | null;
    end_date: string | null;
    total_days: number;
  } => {
    if (legs.length === 0) {
      return { start_date: null, end_date: null, total_days: 0 };
    }

    const sortedLegs = [...legs].sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    const firstLeg = sortedLegs[0];
    const lastLeg = sortedLegs[sortedLegs.length - 1];

    const startDate = firstLeg.start_date;
    const endDate = lastLeg.end_date;

    // Calculate total days (end - start + 1)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return {
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
    };
  }, []);

  return {
    loading,
    fetchLegsForTrip,
    fetchLegsForCountry,
    createLeg,
    createLegs,
    updateLeg,
    deleteLeg,
    deleteLegsForTrip,
    reorderLegs,
    replaceLegsForTrip,
    calculateTripDatesFromLegs,
  };
};
