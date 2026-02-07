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
  has_lodging_booked: boolean | null;
  provider_preferences: string[] | null;
  lodging_address: string | null;
  needs_wheelchair_access: boolean | null;
  has_stroller: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check if a trip overlaps with any existing trips for the same family members
 * @returns Array of overlapping trip titles, or empty array if no overlaps
 */
const checkForOverlappingTrips = async (
  userId: string,
  startDate: string | null,
  endDate: string | null,
  familyMemberIds: string[],
  excludeTripId?: string
): Promise<string[]> => {
  if (!startDate || !endDate || familyMemberIds.length === 0) {
    return [];
  }

  try {
    // Query for trips that overlap with the date range
    let query = supabase
      .from('trips')
      .select(`
        id,
        title,
        start_date,
        end_date,
        trip_family_members(family_member_id)
      `)
      .eq('user_id', userId)
      .not('start_date', 'is', null)
      .not('end_date', 'is', null);

    // Exclude current trip if updating
    if (excludeTripId) {
      query = query.neq('id', excludeTripId);
    }

    const { data: existingTrips, error } = await query;

    if (error || !existingTrips) return [];

    const overlappingTrips: string[] = [];

    for (const trip of existingTrips) {
      // Check if date ranges overlap
      const tripStart = new Date(trip.start_date!);
      const tripEnd = new Date(trip.end_date!);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      const hasDateOverlap = tripStart <= newEnd && newStart <= tripEnd;

      if (hasDateOverlap) {
        // Check if any family members overlap
        const tripFamilyMembers = trip.trip_family_members;
        const tripMemberIds: string[] = [];

        if (Array.isArray(tripFamilyMembers)) {
          tripFamilyMembers.forEach((tfm: any) => {
            if (tfm?.family_member_id) {
              tripMemberIds.push(tfm.family_member_id);
            }
          });
        }

        const hasMemberOverlap = familyMemberIds.some(id =>
          tripMemberIds.includes(id)
        );

        if (hasMemberOverlap) {
          overlappingTrips.push(trip.title || 'Untitled Trip');
        }
      }
    }

    return overlappingTrips;
  } catch (error) {
    console.error('Error checking for overlapping trips:', error);
    return [];
  }
};

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

  const createTrip = async (
    tripData: Partial<Omit<Trip, 'id' | 'user_id' | 'created_at' | 'updated_at'>>,
    familyMemberIds: string[] = []
  ) => {
    if (!user) return { data: null, error: new Error("Not authenticated") };

    // Check for overlapping trips
    const overlaps = await checkForOverlappingTrips(
      user.id,
      tripData.start_date || null,
      tripData.end_date || null,
      familyMemberIds
    );

    if (overlaps.length > 0) {
      return {
        data: null,
        error: new Error(
          `Trip dates overlap with existing trip(s): ${overlaps.join(', ')}. Please check family member schedules.`
        ),
      };
    }

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
        has_lodging_booked: tripData.has_lodging_booked,
        provider_preferences: tripData.provider_preferences,
        lodging_address: tripData.lodging_address,
        needs_wheelchair_access: tripData.needs_wheelchair_access,
        has_stroller: tripData.has_stroller,
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
