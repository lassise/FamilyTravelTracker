import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LinkedMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export const useLinkedFamilyMember = () => {
  const { user } = useAuth();
  const [linkedMember, setLinkedMember] = useState<LinkedMember | null>(null);
  const [linkedMemberId, setLinkedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLinkedMember = useCallback(async () => {
    if (!user) {
      setLinkedMember(null);
      setLinkedMemberId(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch profile with linked member ID - use type assertion for new column
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("linked_family_member_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const memberId = (profileData as any)?.linked_family_member_id;
      setLinkedMemberId(memberId || null);

      if (memberId) {
        // Fetch the actual family member details
        const { data: memberData, error: memberError } = await supabase
          .from("family_members")
          .select("*")
          .eq("id", memberId)
          .single();

        if (!memberError && memberData) {
          setLinkedMember(memberData);
        }
      } else {
        setLinkedMember(null);
      }
    } catch (error) {
      console.error("Error fetching linked member:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateLinkedMember = async (memberId: string | null) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ linked_family_member_id: memberId } as any)
        .eq("id", user.id);

      if (error) throw error;

      setLinkedMemberId(memberId);
      await fetchLinkedMember();
      return true;
    } catch (error) {
      console.error("Error updating linked member:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchLinkedMember();
  }, [fetchLinkedMember]);

  return {
    linkedMember,
    linkedMemberId,
    loading,
    updateLinkedMember,
    refetch: fetchLinkedMember,
  };
};
