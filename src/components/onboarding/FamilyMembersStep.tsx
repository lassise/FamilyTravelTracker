
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, User, Baby, Contact } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Name too long"),
  role: z.string().min(1, "Please select an age group")
});

interface FamilyMembersStepProps {
  onMembersChange: (members: Array<{ id: string; name: string }>) => void;
  onSoloMode?: (isSolo: boolean) => void;
  suggestedName?: string;
}

const ROLES = [
  { value: "Select...", label: "Select Role..." },
  { value: "Adult", label: "Adult (18+)" },
  { value: "Teen (13-17)", label: "Teen (13-17)" },
  { value: "Child (6-12)", label: "Child (6-12)" },
  { value: "Child (3-5)", label: "Child (3-5)" },
  { value: "Toddler (1-2)", label: "Toddler (1-2)" },
  { value: "Infant (<1)", label: "Infant (<1)" },
];

const SPOUSE_QUICK_ADD = [
  { label: "Add Husband", name: "Husband", avatar: "👨", role: "Adult" },
  { label: "Add Wife", name: "Wife", avatar: "👩", role: "Adult" },
  { label: "Add Partner", name: "Partner", avatar: "🧑", role: "Adult" },
];

const AVATAR_EMOJIS = ["🧑", "👨", "👩", "👦", "👧", "👴", "👵", "👶"];
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];

const FamilyMembersStep = ({ onMembersChange, onSoloMode, suggestedName }: FamilyMembersStepProps) => {
  const [members, setMembers] = useState<Array<{ id: string; name: string; avatar: string; color: string; role: string }>>([]);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState(""); // Start empty to show placeholder
  const [loading, setLoading] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  // Auto-fill name from the "What's Your Name" step
  useEffect(() => {
    if (suggestedName && !hasAutoFilled && members.length === 0 && !newName) {
      setNewName(suggestedName);
      setHasAutoFilled(true);
    }
  }, [suggestedName, hasAutoFilled, members.length, newName]);

  useEffect(() => {
    onMembersChange(members.map(m => ({ id: m.id, name: m.name })));
    onSoloMode?.(members.length <= 1);
  }, [members, onMembersChange, onSoloMode]);

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
      const validated = memberSchema.parse({ name: newName, role: newRole });

      setLoading(true);
      const isChild = newRole.includes("Child") || newRole.includes("Toddler") || newRole.includes("Infant");
      // Pick avatar based on role if possible, else random
      let avatar = AVATAR_EMOJIS[members.length % AVATAR_EMOJIS.length];
      if (isChild) avatar = "👶"; // Default child emoji, logic could be smarter

      const color = COLORS[members.length % COLORS.length];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("family_members")
        .insert([{
          name: validated.name,
          role: validated.role,
          avatar,
          color,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      setMembers([...members, data]);
      setNewName("");
      // Reset role to Adult for next entry unless user keeps changing it
      setNewRole("Adult");

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

  const handleQuickAddSpouse = async (spouseOption: typeof SPOUSE_QUICK_ADD[0]) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        setLoading(false);
        return;
      }

      const color = COLORS[members.length % COLORS.length];

      const { data, error } = await supabase
        .from("family_members")
        .insert([{
          name: spouseOption.name,
          role: spouseOption.role,
          avatar: spouseOption.avatar,
          color,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      setMembers([...members, data]);
      toast({ title: `${spouseOption.name} added! You can edit their name anytime.` });
    } catch (error) {
      toast({ title: "Failed to add", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
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
            <Label htmlFor="role">Age Group</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select age group..." />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter(r => r.value !== "Select...").map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleAddMember} disabled={loading || !newName.trim()} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Traveler
        </Button>
      </div>

      {/* Quick add spouse buttons - show if user has added themselves */}
      {members.length >= 1 && members.length < 2 && (
        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs text-muted-foreground uppercase font-semibold">Quick Add</Label>
          <div className="flex flex-wrap gap-2">
            {SPOUSE_QUICK_ADD.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAddSpouse(option)}
                disabled={loading}
                className="gap-2"
              >
                <span>{option.avatar}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {members.length > 0 && (
        <div className="space-y-3 mt-2">
          <Label className="text-muted-foreground">
            {members.length === 1 ? "Traveler" : `Travelers (${members.length})`}
          </Label>
          <div className="grid gap-2">
            {members.map((member) => (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg relative"
                      style={{ backgroundColor: member.color + "30" }}
                    >
                      {member.avatar}
                      {/* Visual indicator for children */}
                      {(member.role.includes("Child") || member.role.includes("Toddler") || member.role.includes("Infant")) && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] px-1 rounded-full">
                          KID
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
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
          <p>Add yourself to start tracking your travels</p>
          <p className="text-sm mt-1">You can add more people later if you want</p>
        </div>
      )}
    </div>
  );
};

export default FamilyMembersStep;
