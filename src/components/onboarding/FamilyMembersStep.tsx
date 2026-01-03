import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Name too long"),
  role: z.string().trim().min(1, "Role is required").max(30, "Role too long"),
});

interface FamilyMembersStepProps {
  onMembersChange: (members: Array<{ id: string; name: string }>) => void;
}

const ROLE_SUGGESTIONS = ["Dad", "Mom", "Son", "Daughter", "Grandpa", "Grandma", "Uncle", "Aunt"];
const AVATAR_EMOJIS = ["👨", "👩", "👦", "👧", "👴", "👵", "🧑", "👶"];
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];

const FamilyMembersStep = ({ onMembersChange }: FamilyMembersStepProps) => {
  const [members, setMembers] = useState<Array<{ id: string; name: string; role: string; avatar: string; color: string }>>([]);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    onMembersChange(members.map(m => ({ id: m.id, name: m.name })));
  }, [members, onMembersChange]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from("family_members")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMembers(data);
    }
  };

  const handleAddMember = async () => {
    try {
      const validated = memberSchema.parse({ name: newName, role: newRole || "Family" });
      
      setLoading(true);
      const avatar = AVATAR_EMOJIS[members.length % AVATAR_EMOJIS.length];
      const color = COLORS[members.length % COLORS.length];

      const { data, error } = await supabase
        .from("family_members")
        .insert([{
          name: validated.name,
          role: validated.role,
          avatar,
          color,
        }])
        .select()
        .single();

      if (error) throw error;

      setMembers([...members, data]);
      setNewName("");
      setNewRole("");
      toast({ title: `${validated.name} added!` });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Failed to add member", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (id: string) => {
    const { error } = await supabase.from("family_members").delete().eq("id", id);
    if (!error) {
      setMembers(members.filter(m => m.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="e.g., John"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
          />
        </div>
        <div>
          <Label htmlFor="role">Role (optional)</Label>
          <Input
            id="role"
            placeholder="e.g., Dad, Mom, Son"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {ROLE_SUGGESTIONS.map((role) => (
          <Badge
            key={role}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10"
            onClick={() => setNewRole(role)}
          >
            {role}
          </Badge>
        ))}
      </div>

      <Button onClick={handleAddMember} disabled={loading || !newName.trim()} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Family Member
      </Button>

      {members.length > 0 && (
        <div className="space-y-2 mt-4">
          <Label className="text-muted-foreground">Your Family ({members.length})</Label>
          <div className="grid gap-2">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: member.color + "30" }}
                    >
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Add family members to track their travels</p>
        </div>
      )}
    </div>
  );
};

export default FamilyMembersStep;
