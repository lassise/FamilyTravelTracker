import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Check } from "lucide-react";
import type { Trip } from "@/hooks/useTrips";

interface PostTripActionsProps {
  /** Trip that was just saved. */
  currentTrip: Trip;
  /** Label for the destination for display. */
  firstCountryLabel?: string;
  /** Callback when user wants to start a completely new trip. */
  onAddNewTrip: () => void;
  /** Callback when user is done (navigate to list or dashboard). */
  onFinish: () => void;
}

/**
 * Shown AFTER a trip is saved. Two options: Add Another Trip or Save & Finish.
 */
export const PostTripActions = ({
  currentTrip,
  firstCountryLabel,
  onAddNewTrip,
  onFinish,
}: PostTripActionsProps) => {
  const destinationLabel = firstCountryLabel || currentTrip.destination || "your trip";

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Trip to {destinationLabel} saved!</CardTitle>
        <CardDescription>What would you like to do next?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onAddNewTrip}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Trip
        </Button>
        <p className="text-xs text-muted-foreground pl-6">
          Start a completely new trip
        </p>

        <Button
          className="w-full justify-start"
          onClick={onFinish}
        >
          <Check className="h-4 w-4 mr-2" />
          Save &amp; Finish
        </Button>
        <p className="text-xs text-muted-foreground pl-6">
          Done for now
        </p>
      </CardContent>
    </Card>
  );
};
