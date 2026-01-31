import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe2, Map, User, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface LinkedMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

interface PersonalCountry {
  id: string;
  name: string;
  flag: string;
  continent: string;
  visited: boolean;
}

interface PersonalTravelSummaryProps {
  visitedCountries: PersonalCountry[];
  totalCountries: number;
  continentsVisited: number;
  linkedMember: LinkedMember | null;
}

const PersonalTravelSummary = ({ 
  visitedCountries, 
  totalCountries, 
  continentsVisited,
  linkedMember 
}: PersonalTravelSummaryProps) => {
  const worldPercentage = Math.round((totalCountries / 195) * 100);
  const continentPercentage = Math.round((continentsVisited / 7) * 100);

  // Group by continent
  const continentCounts: Record<string, number> = {};
  visitedCountries.forEach(country => {
    continentCounts[country.continent] = (continentCounts[country.continent] || 0) + 1;
  });

  if (!linkedMember) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Profile Linked</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete onboarding to start tracking your travels, or link yourself in profile settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-secondary/10 to-accent/10 pb-4">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ backgroundColor: linkedMember.color + "30" }}
          >
            {linkedMember.avatar}
          </div>
          <div>
            <CardTitle className="text-2xl">{linkedMember.name}'s Travel History</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid sm:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Globe2 className="h-5 w-5 text-secondary" />
              <span className="text-3xl font-bold text-foreground">{totalCountries}</span>
            </div>
            <p className="text-sm text-muted-foreground">Countries Visited</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Map className="h-5 w-5 text-accent" />
              <span className="text-3xl font-bold text-foreground">{continentsVisited}</span>
            </div>
            <p className="text-sm text-muted-foreground">Continents</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-3xl font-bold text-foreground">{worldPercentage}%</span>
            </div>
            <p className="text-sm text-muted-foreground">World Explored</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">World Progress</span>
              <span className="font-medium">{totalCountries} / 195 countries</span>
            </div>
            <Progress value={worldPercentage} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Continents</span>
              <span className="font-medium">{continentsVisited} / 7 continents</span>
            </div>
            <Progress value={continentPercentage} className="h-2" />
          </div>
        </div>

        {Object.keys(continentCounts).length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Countries by Continent</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(continentCounts).map(([continent, count]) => (
                <div 
                  key={continent}
                  className="px-3 py-1.5 bg-secondary/10 rounded-full text-sm"
                >
                  <span className="font-medium">{continent}</span>
                  <span className="text-muted-foreground ml-1">({count})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonalTravelSummary;
