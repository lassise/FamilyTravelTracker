import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface YourNameStepProps {
  onNameSaved: (name: string) => void;
}

const YourNameStep = ({ onNameSaved }: YourNameStepProps) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingName();
  }, []);

  const fetchExistingName = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      if (profile?.full_name) {
        setName(profile.full_name);
        setSaved(true);
        onNameSaved(profile.full_name);
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("id", user.id);

      if (error) throw error;

      setSaved(true);
      onNameSaved(name.trim());
      toast({ title: "Name saved!" });
    } catch (error) {
      toast({ title: "Failed to save name", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCircle className="w-10 h-10 text-primary" />
        </div>
        <p className="text-muted-foreground">
          Let's start with your name. This will be used for your personal travel statistics and profile.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="your-name">Your Name</Label>
        <Input
          id="your-name"
          placeholder="Enter your full name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          className="text-lg"
        />
      </div>

      <Button 
        onClick={handleSave} 
        disabled={loading || !name.trim() || saved} 
        className="w-full"
      >
        {saved ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Saved
          </>
        ) : loading ? (
          "Saving..."
        ) : (
          "Save Name"
        )}
      </Button>

      {saved && (
        <p className="text-center text-sm text-muted-foreground">
          Great! Next, we'll set up your traveler profile.
        </p>
      )}
    </div>
  );
};

export default YourNameStep;
