import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Trash2, Calendar, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CountryDialog from "./CountryDialog";
import CountryVisitDetailsDialog from "./CountryVisitDetailsDialog";
import { Country } from "@/hooks/useFamilyData";
import { useVisitDetails } from "@/hooks/useVisitDetails";
import { getAllCountries } from "@/lib/countriesData";

interface CountryTrackerProps {
  countries: Country[];
  familyMembers: Array<{ id: string; name: string }>;
  onUpdate: () => void;
}

const CountryTracker = ({ countries, familyMembers, onUpdate }: CountryTrackerProps) => {
  const { toast } = useToast();
  const { getCountrySummary, refetch: refetchVisitDetails } = useVisitDetails();
  const allCountriesData = getAllCountries();

  const getCountryCode = (countryName: string): string => {
    const found = allCountriesData.find((c) => c.name === countryName);
    return found?.code || "";
  };

  const handleUpdate = () => {
    onUpdate();
    refetchVisitDetails();
  };

  const handleToggleVisit = async (countryId: string, memberId: string, isVisited: boolean) => {
    if (isVisited) {
      // Remove visit
      const { error } = await supabase
        .from("country_visits")
        .delete()
        .eq("country_id", countryId)
        .eq("family_member_id", memberId);

      if (error) {
        toast({ title: "Error updating visit", variant: "destructive" });
      }
    } else {
      // Add visit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        return;
      }
      const { error } = await supabase
        .from("country_visits")
        .insert([{ country_id: countryId, family_member_id: memberId, user_id: user.id }]);

      if (error) {
        toast({ title: "Error updating visit", variant: "destructive" });
      }
    }
  };

  const handleDelete = async (countryId: string, countryName: string) => {
    if (!confirm(`Are you sure you want to delete ${countryName}?`)) return;

    const { error } = await supabase
      .from("countries")
      .delete()
      .eq("id", countryId);

    if (error) {
      toast({ title: "Error deleting country", variant: "destructive" });
    } else {
      toast({ title: `${countryName} deleted successfully` });
      onUpdate();
    }
  };
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Countries We've Explored
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-4">
            Our family's travel journey across the world
          </p>
          <CountryDialog familyMembers={familyMembers} onSuccess={handleUpdate} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {countries.map((country) => {
            const summary = getCountrySummary(country.id);
            const countryCode = getCountryCode(country.name);
            
            return (
              <Card 
                key={country.id}
                className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-3xl">{country.flag}</span>
                      <span>{country.name}</span>
                    </CardTitle>
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {country.continent}
                    </Badge>
                    {summary.timesVisited > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {summary.timesVisited}x
                      </Badge>
                    )}
                    {summary.totalDays > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        {summary.totalDays}d
                      </Badge>
                    )}
                    {summary.citiesCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        {summary.citiesCount}
                      </Badge>
                    )}
                  </div>

                  {summary.cities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {summary.cities.slice(0, 3).map((city) => (
                        <Badge key={city} variant="outline" className="text-xs bg-muted/50">
                          {city}
                        </Badge>
                      ))}
                      {summary.cities.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-muted/50">
                          +{summary.cities.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Visited by:</p>
                    {familyMembers.map((member) => {
                      const isVisited = country.visitedBy.includes(member.name);
                      return (
                        <div key={member.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`${country.id}-${member.id}`}
                            checked={isVisited}
                            onCheckedChange={() => handleToggleVisit(country.id, member.id, isVisited)}
                          />
                          <label
                            htmlFor={`${country.id}-${member.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {member.name}
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 pt-2 flex-wrap">
                    <CountryVisitDetailsDialog
                      countryId={country.id}
                      countryName={country.name}
                      countryCode={countryCode}
                      onUpdate={handleUpdate}
                      buttonLabel="Trips"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(country.id, country.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CountryTracker;
