import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Calendar, Trophy, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "trip_details_encouragement_dismissed";

export const TripDetailsEncouragementCard = () => {
  const [dismissed, setDismissed] = useState(true); // Start hidden until we check
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      setDismissed(true);
    } catch {
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  return (
    <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/5 relative overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="pt-6 pb-6 pr-12">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex gap-3 text-primary shrink-0">
            <Calendar className="h-10 w-10" />
            <div>
              <Trophy className="h-5 w-5 mb-1 text-amber-500" />
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">Add trip details for more insights</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add dates, highlights, and trip names to your country visits. Unlock richer analytics, 
              travel milestones, and extra achievements as you track your journey.
            </p>
            <Button
              onClick={() => navigate("/family")}
              size="sm"
              className={cn("gap-2")}
            >
              <Calendar className="h-4 w-4" />
              Add trip details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
