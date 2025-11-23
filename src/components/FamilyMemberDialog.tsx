import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const familyMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Name must be less than 50 characters"),
  role: z.string().trim().min(1, "Role is required").max(100, "Role must be less than 100 characters"),
  avatar: z.string().trim().min(1, "Avatar emoji is required").max(10, "Avatar must be an emoji"),
});

interface FamilyMemberDialogProps {
  member?: {
    id: string;
    name: string;
    role: string;
    avatar: string;
    color: string;
  };
  onSuccess: () => void;
}

const colorOptions = [
  { label: "Sunset Orange", value: "bg-gradient-to-r from-primary to-primary/60" },
  { label: "Ocean Blue", value: "bg-gradient-to-r from-secondary to-secondary/60" },
  { label: "Forest Green", value: "bg-gradient-to-r from-accent to-accent/60" },
  { label: "Rainbow", value: "bg-gradient-to-r from-primary to-secondary" },
];

const FamilyMemberDialog = ({ member, onSuccess }: FamilyMemberDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(member?.name || "");
  const [role, setRole] = useState(member?.role || "");
  const [avatar, setAvatar] = useState(member?.avatar || "");
  const [color, setColor] = useState(member?.color || colorOptions[0].value);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = familyMemberSchema.parse({ name, role, avatar });

      if (member) {
        const { error } = await supabase
          .from("family_members")
          .update({
            name: validated.name,
            role: validated.role,
            avatar: validated.avatar,
            color: color
          })
          .eq("id", member.id);

        if (error) throw error;
        toast({ title: "Family member updated successfully!" });
      } else {
        const { error } = await supabase
          .from("family_members")
          .insert([{
            name: validated.name,
            role: validated.role,
            avatar: validated.avatar,
            color: color
          }]);

        if (error) throw error;
        toast({ title: "Family member added successfully!" });
      }

      setOpen(false);
      onSuccess();
      
      // Reset form
      setName("");
      setRole("");
      setAvatar("");
      setColor(colorOptions[0].value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save family member",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {member ? (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Family Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? "Edit" : "Add"} Family Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              maxLength={50}
            />
          </div>
          
          <div>
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Chief Planner"
              maxLength={100}
            />
          </div>
          
          <div>
            <Label htmlFor="avatar">Avatar Emoji</Label>
            <Input
              id="avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="👨 👩 👧 🧒"
              maxLength={10}
            />
          </div>
          
          <div>
            <Label htmlFor="color">Color Theme</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : member ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FamilyMemberDialog;
