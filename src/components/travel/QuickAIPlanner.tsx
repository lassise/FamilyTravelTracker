import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Zap, Calendar, MapPin, Sun, Moon, Clock, Crown } from "lucide-react";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DayActivity {
  activity: string;
  description: string;
  duration: string;
}

interface ItineraryDay {
  dayNumber: number;
  title: string;
  morning: DayActivity;
  afternoon: DayActivity;
  evening: DayActivity;
  tips: string;
}

interface QuickItinerary {
  destination: string;
  summary: string;
  days: ItineraryDay[];
}

const QuickAIPlanner = () => {
  const { preferences } = useTravelPreferences();
  const { toast } = useToast();
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState([5]);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<QuickItinerary | null>(null);

  const generateItinerary = async () => {
    if (!destination.trim()) {
      toast({ title: "Please enter a destination", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-trip-suggestions", {
        body: {
          request_type: "quick_itinerary",
          destination: destination.trim(),
          days: days[0],
          preferences: preferences ? {
            travel_style: preferences.travel_style,
            interests: preferences.interests,
            budget: preferences.budget_preference,
            pace: preferences.pace_preference,
          } : null,
        },
      });

      if (error) {
        console.error("API error:", error);
        // Try to parse error message for better user feedback
        let errorMessage = "Failed to generate itinerary";
        try {
          if (error.message) {
            const errorData = JSON.parse(error.message);
            errorMessage = errorData.error || errorData.message || errorMessage;
          }
        } catch {
          errorMessage = error.message || errorMessage;
        }
        toast({ 
          title: errorMessage, 
          variant: "destructive",
          description: "Please try again or check your destination name"
        });
        return;
      }

      if (data?.days && Array.isArray(data.days) && data.days.length > 0) {
        setItinerary(data);
      } else {
        toast({ 
          title: "Could not generate itinerary", 
          variant: "destructive",
          description: "The AI couldn't create a valid itinerary. Please try a different destination or adjust your preferences."
        });
      }
    } catch (error: any) {
      console.error("Error generating itinerary:", error);
      toast({ 
        title: "Failed to generate itinerary", 
        variant: "destructive",
        description: error?.message || "An unexpected error occurred. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPlanner = () => {
    setItinerary(null);
    setDestination("");
    setDays([5]);
  };

  return (
    <Card className="relative">
      <Crown className="absolute top-4 right-4 h-5 w-5 text-amber-500" title="Premium" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Quick AI Planner
        </CardTitle>
        <CardDescription>
          Get an instant itinerary based on your preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!itinerary ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="destination">Where do you want to go?</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Tokyo, Paris, Bali..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Trip Duration</Label>
                <span className="text-sm font-medium">{days[0]} days</span>
              </div>
              <Slider
                value={days}
                onValueChange={setDays}
                min={1}
                max={14}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Weekend</span>
                <span>Week</span>
                <span>2 Weeks</span>
              </div>
            </div>

            {preferences && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="text-muted-foreground mb-2">Using your preferences:</p>
                <div className="flex flex-wrap gap-1">
                  {preferences.travel_style.slice(0, 3).map((style) => (
                    <span key={style} className="px-2 py-0.5 bg-primary/10 rounded text-xs">
                      {style}
                    </span>
                  ))}
                  {preferences.interests.slice(0, 3).map((interest) => (
                    <span key={interest} className="px-2 py-0.5 bg-secondary/50 rounded text-xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={generateItinerary}
              disabled={loading || !destination.trim() || destination.trim().length < 2}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Itinerary
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{itinerary.destination}</h3>
              <Button variant="outline" size="sm" onClick={resetPlanner}>
                New Plan
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">{itinerary.summary}</p>

            <div className="space-y-4">
              {itinerary.days.map((day) => (
                <div key={day.dayNumber} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">Day {day.dayNumber}: {day.title}</span>
                  </div>

                  <div className="grid gap-2 pl-6">
                    <div className="flex items-start gap-2">
                      <Sun className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{day.morning.activity}</p>
                        <p className="text-xs text-muted-foreground">{day.morning.description}</p>
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />{day.morning.duration}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Sun className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{day.afternoon.activity}</p>
                        <p className="text-xs text-muted-foreground">{day.afternoon.description}</p>
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />{day.afternoon.duration}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Moon className="h-4 w-4 text-indigo-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{day.evening.activity}</p>
                        <p className="text-xs text-muted-foreground">{day.evening.description}</p>
                        <span className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />{day.evening.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    💡 {day.tips}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickAIPlanner;
