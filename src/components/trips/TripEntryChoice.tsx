import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, FileText, Sparkles } from "lucide-react";

export type TripEntryMode = "quick" | "full";

interface TripEntryChoiceProps {
  onSelect: (mode: TripEntryMode) => void;
}

/**
 * Entry point for adding a trip. Two clear paths:
 * - Quick Add: minimal (country + family), then optionally add details later
 * - Add with Details: full form immediately (country, family, dates, notes)
 * No "add country before trip" question – countries are always part of a trip.
 */
export const TripEntryChoice = ({ onSelect }: TripEntryChoiceProps) => {
  const navigate = useNavigate();

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Add a New Trip</CardTitle>
        <CardDescription>
          Choose how you want to log this trip. You can always add more countries or details later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto py-6 flex flex-col gap-2"
            onClick={() => onSelect("quick")}
          >
            <Zap className="h-8 w-8 text-primary" />
            <span className="font-semibold">Quick Add</span>
            <span className="text-xs font-normal text-muted-foreground">
              Country + who went. Add dates later.
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-6 flex flex-col gap-2"
            onClick={() => onSelect("full")}
          >
            <FileText className="h-8 w-8 text-primary" />
            <span className="font-semibold">Add with Details</span>
            <span className="text-xs font-normal text-muted-foreground">
              Country, who went, dates, notes in one form.
            </span>
          </Button>
        </div>
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => navigate("/trips/new")}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Plan a trip with AI (itinerary, activities)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
