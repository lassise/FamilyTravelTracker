import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, MapPin, RefreshCw } from "lucide-react";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { useFamilyData } from "@/hooks/useFamilyData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  country: string;
  reason: string;
  matchScore: number;
  highlights: string[];
  bestTimeToVisit: string;
}

const TravelRecommendations = () => {
  const { preferences, loading: prefsLoading } = useTravelPreferences();
  const { countries } = useFamilyData();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0).map(c => c.name);

  const generateRecommendations = async () => {
    if (!preferences) {
      toast({ title: "Please set your travel preferences first", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trip-suggestions", {
        body: {
          preferences: {
            travel_style: preferences.travel_style,
            interests: preferences.interests,
            budget: preferences.budget_preference,
            pace: preferences.pace_preference,
            liked_countries: preferences.liked_countries,
            disliked_countries: preferences.disliked_countries,
            avoid: preferences.avoid_preferences,
          },
          visited_countries: visitedCountries,
          request_type: "recommendations",
        },
      });

      if (error) throw error;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
        setHasGenerated(true);
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast({ title: "Failed to generate recommendations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (prefsLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          AI Recommendations
        </CardTitle>
        <Button
          onClick={generateRecommendations}
          disabled={loading}
          size="sm"
          variant={hasGenerated ? "outline" : "default"}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : hasGenerated ? (
            <RefreshCw className="h-4 w-4 mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {hasGenerated ? "Refresh" : "Get Recommendations"}
        </Button>
      </CardHeader>
      <CardContent>
        {!hasGenerated && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Based on your preferences and travel history,</p>
            <p>we'll suggest your next perfect destination.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Analyzing your travel DNA...</p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{rec.country}</h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {rec.matchScore}% match
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{rec.reason}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {rec.highlights.map((highlight, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {highlight}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  🗓️ Best time: {rec.bestTimeToVisit}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TravelRecommendations;
