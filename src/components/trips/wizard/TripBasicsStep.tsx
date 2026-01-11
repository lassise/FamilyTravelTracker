import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TripFormData } from "../TripWizard";
import { MapPin, Calendar, Hotel, Users } from "lucide-react";

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

      {/* Planning stage toggles */}
      <div className="space-y-4 p-4 rounded-lg bg-muted/50">
        <p className="text-sm font-medium text-foreground">What details do you have so far?</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="hasDates" className="font-normal cursor-pointer">
              I know my travel dates
            </Label>
          </div>
          <Switch
            id="hasDates"
            checked={formData.hasDates}
            onCheckedChange={(checked) => updateFormData({ hasDates: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hotel className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="hasLodging" className="font-normal cursor-pointer">
              I know where I'm staying
            </Label>
          </div>
          <Switch
            id="hasLodging"
            checked={formData.hasLodging}
            onCheckedChange={(checked) => updateFormData({ hasLodging: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="travelingWithKids" className="font-normal cursor-pointer">
              Traveling with kids
            </Label>
          </div>
          <Switch
            id="travelingWithKids"
            checked={formData.travelingWithKids}
            onCheckedChange={(checked) => updateFormData({ travelingWithKids: checked })}
          />
        </div>
      </div>

      {formData.hasDates && (
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
      )}

      {formData.hasLodging && (
        <div className="space-y-2">
          <Label htmlFor="lodging">Where are you staying?</Label>
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
      )}

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
    </div>
  );
};
