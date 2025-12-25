import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TripFormData } from "../TripWizard";
import { MapPin, Calendar } from "lucide-react";

interface TripBasicsStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

export const TripBasicsStep = ({ formData, updateFormData }: TripBasicsStepProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="destination" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Where are you going?
        </Label>
        <Input
          id="destination"
          placeholder="e.g., Paris, France or Disney World, Orlando"
          value={formData.destination}
          onChange={(e) => updateFormData({ destination: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Start Date
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => updateFormData({ startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            min={formData.startDate}
            onChange={(e) => updateFormData({ endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Trip Name (optional)</Label>
        <Input
          id="title"
          placeholder="Give your trip a fun name"
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Leave blank and we'll create one for you
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lodging">Where are you staying? (optional)</Label>
        <Input
          id="lodging"
          placeholder="e.g., Marriott Downtown, Airbnb near Central Park"
          value={formData.lodgingLocation}
          onChange={(e) => updateFormData({ lodgingLocation: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Helps us plan activities near your accommodation
        </p>
      </div>
    </div>
  );
};
