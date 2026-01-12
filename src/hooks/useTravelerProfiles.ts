import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TravelerProfile {
  id: string;
  name: string;
  traveler_type: "adult" | "child" | "infant" | "lap_infant";
  date_of_birth?: string;
  known_traveler_number?: string;
  redress_number?: string;
  passport_country?: string;
  passport_expiry?: string;
  seat_preference: "window" | "aisle" | "middle";
  meal_preference?: string;
  special_assistance?: string[];
  frequent_flyer_programs: { airline: string; number: string }[];
}

export const useTravelerProfiles = () => {
  const { user } = useAuth();
  const [travelers, setTravelers] = useState<TravelerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTravelers = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("traveler_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      setTravelers(
        (data || []).map((t) => ({
          id: t.id,
          name: t.name,
          traveler_type: t.traveler_type as TravelerProfile["traveler_type"],
          date_of_birth: t.date_of_birth || undefined,
          known_traveler_number: t.known_traveler_number || undefined,
          redress_number: t.redress_number || undefined,
          passport_country: t.passport_country || undefined,
          passport_expiry: t.passport_expiry || undefined,
          seat_preference: (t.seat_preference as TravelerProfile["seat_preference"]) || "window",
          meal_preference: t.meal_preference || undefined,
          special_assistance: t.special_assistance || [],
          frequent_flyer_programs: (t.frequent_flyer_programs as { airline: string; number: string }[]) || [],
        }))
      );
    } catch (error) {
      console.error("Error fetching traveler profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTraveler = async (traveler: Omit<TravelerProfile, "id">) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("traveler_profiles")
        .insert({
          user_id: user.id,
          name: traveler.name,
          traveler_type: traveler.traveler_type,
          date_of_birth: traveler.date_of_birth,
          known_traveler_number: traveler.known_traveler_number,
          redress_number: traveler.redress_number,
          passport_country: traveler.passport_country,
          passport_expiry: traveler.passport_expiry,
          seat_preference: traveler.seat_preference,
          meal_preference: traveler.meal_preference,
          special_assistance: traveler.special_assistance,
          frequent_flyer_programs: JSON.stringify(traveler.frequent_flyer_programs),
        })
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setTravelers((prev) => [...prev, {
          ...traveler,
          id: data.id,
        }]);
        toast.success(`Added ${traveler.name} to travelers`);
      }
    } catch (error) {
      console.error("Error adding traveler:", error);
      toast.error("Failed to add traveler");
    }
  };

  const updateTraveler = async (id: string, updates: Partial<TravelerProfile>) => {
    if (!user?.id) return;

    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.frequent_flyer_programs) {
        updateData.frequent_flyer_programs = JSON.stringify(updates.frequent_flyer_programs);
      }

      const { error } = await supabase
        .from("traveler_profiles")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      setTravelers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    } catch (error) {
      console.error("Error updating traveler:", error);
      toast.error("Failed to update traveler");
    }
  };

  const deleteTraveler = async (id: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("traveler_profiles")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      
      setTravelers((prev) => prev.filter((t) => t.id !== id));
      toast.success("Traveler removed");
    } catch (error) {
      console.error("Error deleting traveler:", error);
      toast.error("Failed to remove traveler");
    }
  };

  useEffect(() => {
    fetchTravelers();
  }, [user?.id]);

  return {
    travelers,
    loading,
    addTraveler,
    updateTraveler,
    deleteTraveler,
    refetch: fetchTravelers,
  };
};
