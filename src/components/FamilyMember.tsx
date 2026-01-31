import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FamilyMemberDialog from "./FamilyMemberDialog";
import MemberCountriesDialog from "./MemberCountriesDialog";
import type { Country } from "@/hooks/useFamilyData";

interface FamilyMemberProps {
  id: string;
  name: string;
  countriesVisited: number;
  avatar: string;
  color: string;
  countries: Country[];
  onUpdate: () => void;
}

const FamilyMember = ({ id, name, countriesVisited, avatar, color, countries, onUpdate }: FamilyMemberProps) => {
  const { toast } = useToast();
  const [earliestYear, setEarliestYear] = useState<number | null>(null);

  // Fetch the earliest visit year for this family member
  useEffect(() => {
    const fetchEarliestYear = async () => {
      try {
        // Get all visit IDs for this family member
        const { data: visitMemberData } = await supabase
          .from('visit_family_members')
          .select('visit_id')
          .eq('family_member_id', id);

        if (!visitMemberData || visitMemberData.length === 0) {
          setEarliestYear(null);
          return;
        }

        const visitIds = visitMemberData.map(v => v.visit_id);

        // Get the visit details for these visits
        const { data: visitDetails } = await supabase
          .from('country_visit_details')
          .select('visit_date, approximate_year')
          .in('id', visitIds);

        if (!visitDetails || visitDetails.length === 0) {
          setEarliestYear(null);
          return;
        }

        // Find the earliest year
        let earliest: number | null = null;
        for (const visit of visitDetails) {
          let year: number | null = null;
          if (visit.visit_date) {
            year = new Date(visit.visit_date).getFullYear();
          } else if (visit.approximate_year) {
            year = visit.approximate_year;
          }
          if (year && (!earliest || year < earliest)) {
            earliest = year;
          }
        }
        setEarliestYear(earliest);
      } catch (error) {
        console.error('Error fetching earliest year:', error);
      }
    };

    fetchEarliestYear();
  }, [id]);

  // Filter countries visited by this member
  const memberCountries = countries.filter(country => 
    country.visitedBy.includes(name)
  );

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const { error } = await supabase
      .from("family_members")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete family member",
        variant: "destructive",
      });
    } else {
      toast({ title: `${name} deleted successfully` });
      onUpdate();
    }
  };
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden">
      <CardContent className="p-0">
        <div className={`h-2 ${color}`} />
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg">
              {avatar}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground">{name}</h3>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <MemberCountriesDialog 
                memberName={name}
                countries={memberCountries}
                countriesCount={countriesVisited}
              />
            </div>
            
            {earliestYear && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Explorer since {earliestYear}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <FamilyMemberDialog
                member={{ id, name, avatar, color }}
                onSuccess={onUpdate}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FamilyMember;
