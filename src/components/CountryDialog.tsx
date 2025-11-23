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

const countrySchema = z.object({
  name: z.string().trim().min(1, "Country name is required").max(100, "Name must be less than 100 characters"),
  flag: z.string().trim().min(1, "Flag emoji is required").max(10, "Flag must be an emoji"),
  continent: z.string().min(1, "Continent is required"),
});

interface CountryDialogProps {
  country?: {
    id: string;
    name: string;
    flag: string;
    continent: string;
  };
  onSuccess: () => void;
}

const continents = ["Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"];

const CountryDialog = ({ country, onSuccess }: CountryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(country?.name || "");
  const [flag, setFlag] = useState(country?.flag || "");
  const [continent, setContinent] = useState(country?.continent || "");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = countrySchema.parse({ name, flag, continent });

      if (country) {
        const { error } = await supabase
          .from("countries")
          .update({
            name: validated.name,
            flag: validated.flag,
            continent: validated.continent
          })
          .eq("id", country.id);

        if (error) throw error;
        toast({ title: "Country updated successfully!" });
      } else {
        const { error } = await supabase
          .from("countries")
          .insert([{
            name: validated.name,
            flag: validated.flag,
            continent: validated.continent
          }]);

        if (error) throw error;
        toast({ title: "Country added successfully!" });
      }

      setOpen(false);
      onSuccess();
      
      // Reset form
      setName("");
      setFlag("");
      setContinent("");
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
          description: "Failed to save country",
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
        {country ? (
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        ) : (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Country
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{country ? "Edit" : "Add"} Country</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Country Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Japan"
              maxLength={100}
            />
          </div>
          
          <div>
            <Label htmlFor="flag">Flag Emoji</Label>
            <Input
              id="flag"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="🇯🇵"
              maxLength={10}
            />
          </div>
          
          <div>
            <Label htmlFor="continent">Continent</Label>
            <Select value={continent} onValueChange={setContinent}>
              <SelectTrigger>
                <SelectValue placeholder="Select continent" />
              </SelectTrigger>
              <SelectContent>
                {continents.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
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
              {loading ? "Saving..." : country ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CountryDialog;
