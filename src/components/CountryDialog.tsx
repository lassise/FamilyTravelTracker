import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getAllCountries, type CountryOption } from "@/lib/countriesData";
import { cn } from "@/lib/utils";

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
  familyMembers?: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

const allCountries = getAllCountries();

const CountryDialog = ({ country, familyMembers = [], onSuccess }: CountryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(
    country ? { name: country.name, flag: country.flag, continent: country.continent, code: "" } : null
  );
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCountrySelect = (countryOption: CountryOption) => {
    setSelectedCountry(countryOption);
    setComboboxOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedCountry) {
      toast({
        title: "Validation Error",
        description: "Please select a country",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const validated = countrySchema.parse({ 
        name: selectedCountry.name, 
        flag: selectedCountry.flag, 
        continent: selectedCountry.continent 
      });

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({ title: "You must be logged in", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { data: newCountry, error } = await supabase
          .from("countries")
          .insert([{
            name: validated.name,
            flag: validated.flag,
            continent: validated.continent,
            user_id: user.id
          }])
          .select()
          .single();

        if (error) throw error;

        // Add country visits for selected members
        if (newCountry && selectedMembers.length > 0) {
          const visits = selectedMembers.map(memberId => ({
            country_id: newCountry.id,
            family_member_id: memberId,
            user_id: user.id
          }));
          
          const { error: visitsError } = await supabase
            .from("country_visits")
            .insert(visits);
          
          if (visitsError) throw visitsError;
        }

        toast({ title: "Country added successfully!" });
      }

      setOpen(false);
      onSuccess();
      
      // Reset form
      setSelectedCountry(null);
      setSelectedMembers([]);
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
            <Label>Country</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                  type="button"
                >
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <span>{selectedCountry.flag}</span>
                      <span>{selectedCountry.name}</span>
                      <span className="text-muted-foreground text-xs">({selectedCountry.continent})</span>
                    </span>
                  ) : (
                    "Select country..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {allCountries.map((countryOption) => (
                        <CommandItem
                          key={countryOption.code}
                          value={countryOption.name}
                          onSelect={() => handleCountrySelect(countryOption)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCountry?.name === countryOption.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="mr-2">{countryOption.flag}</span>
                          <span>{countryOption.name}</span>
                          <span className="ml-auto text-muted-foreground text-xs">{countryOption.continent}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {!country && familyMembers.length > 0 && (
            <div>
              <Label>Visited By (Optional)</Label>
              <div className="space-y-2 mt-2">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers([...selectedMembers, member.id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`member-${member.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {member.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
