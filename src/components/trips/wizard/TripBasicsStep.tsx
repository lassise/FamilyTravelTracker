import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TripFormData } from "../TripWizard";
import { TripLegEditor, type TripLegDraft } from "../TripLegEditor";
import { MapPin, Calendar, Hotel, Users, Briefcase, Palmtree, ArrowRightLeft, Globe } from "lucide-react";

interface TripBasicsStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

const PURPOSE_OPTIONS = [
  { value: "leisure", label: "Leisure / Vacation", icon: Palmtree, description: "Family fun, relaxation, sightseeing" },
  { value: "business", label: "Business Trip", icon: Briefcase, description: "Meetings, conferences, work-related" },
  { value: "mixed", label: "Bleisure (Both)", icon: ArrowRightLeft, description: "Combine work with leisure activities" },
];

export const TripBasicsStep = ({ formData, updateFormData }: TripBasicsStepProps) => {
  const handleLegsChange = (legs: TripLegDraft[]) => {
    // Combine all updates into a single call to prevent state sync issues
    const updates: Partial<TripFormData> = { legs };
    
    if (legs.length > 0) {
      // Calculate overall dates for backwards compatibility
      const sortedLegs = [...legs].sort((a, b) => 
        new Date(a.start_date || '9999').getTime() - new Date(b.start_date || '9999').getTime()
      );
      const firstLeg = sortedLegs.find(l => l.start_date);
      const lastLeg = [...sortedLegs].reverse().find(l => l.end_date);
      
      if (firstLeg?.start_date) {
        updates.startDate = firstLeg.start_date;
      }
      if (lastLeg?.end_date) {
        updates.endDate = lastLeg.end_date;
      }
      
      // Build destination string from all countries
      const countries = legs.map(l => l.country_name).filter(Boolean);
      if (countries.length > 0) {
        updates.destination = [...new Set(countries)].join(" + ");
      }
    }
    
    // Single atomic update
    updateFormData(updates);
  };

  return (
    <div className="space-y-6">
      {/* Multi-country leg editor */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Where are you going?
        </Label>
        <p className="text-sm text-muted-foreground">
          Add each country you'll visit with your travel dates. You can add multiple destinations for multi-country trips.
        </p>
        <TripLegEditor
          legs={formData.legs}
          onLegsChange={handleLegsChange}
        />
      </div>

      {/* Trip Purpose */}
      <div className="space-y-3">
        <Label>What's the primary purpose of this trip?</Label>
        <RadioGroup
          value={formData.tripPurpose}
          onValueChange={(value) => updateFormData({ tripPurpose: value })}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {PURPOSE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${
                  formData.tripPurpose === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value={option.value} className="sr-only" />
                <Icon className="h-6 w-6 mb-2" />
                <span className="font-medium text-sm">{option.label}</span>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Planning stage toggles */}
      <div className="space-y-4 p-4 rounded-lg bg-muted/50">
        <p className="text-sm font-medium text-foreground">Additional details</p>

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

        {formData.tripPurpose !== "business" && (
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
        )}
      </div>

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
