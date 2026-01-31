import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check, User, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface SelectYourselfStepProps {
  familyMembers: Array<{ id: string; name: string }>;
  onSelect: (memberId: string | null) => void;
}

const SelectYourselfStep = ({ familyMembers, onSelect }: SelectYourselfStepProps) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [familyMembers]);

  const fetchMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("family_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMembers(data);
    }
    setLoading(false);
  };

  const handleSelect = (memberId: string) => {
    setSelectedId(memberId);
    onSelect(memberId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Add at least one traveler first</p>
      </div>
    );
  }

  // Auto-select if only one member
  if (members.length === 1 && !selectedId) {
    handleSelect(members[0].id);
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          Select the primary traveler who will manage this account and see personal travel statistics.
        </p>
      </div>

      <Label className="text-muted-foreground">Select Primary Traveler</Label>
      
      <div className="grid gap-3">
        {members.map((member) => (
          <Card
            key={member.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedId === member.id 
                ? "ring-2 ring-primary bg-primary/5" 
                : "hover:bg-muted/50"
            )}
            onClick={() => handleSelect(member.id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: member.color + "30" }}
                >
                  {member.avatar}
                </div>
                <div>
                  <p className="font-medium text-foreground">{member.name}</p>
                </div>
              </div>
              {selectedId === member.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        The primary traveler will see their personal travel stats on the dashboard
      </p>
    </div>
  );
};

export default SelectYourselfStep;
