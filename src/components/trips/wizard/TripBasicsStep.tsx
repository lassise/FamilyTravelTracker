import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TripFormData } from "../TripWizard";
import { TripLegEditor, type TripLegDraft } from "../TripLegEditor";
import { MapPin, Calendar, Hotel, Users, Briefcase, Palmtree, ArrowRightLeft, Globe, Sun, Snowflake, Leaf, Flower2, HelpCircle, Clock } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  const [dateModeAnswered, setDateModeAnswered] = useState(
    formData.legs.some(l => l.start_date || l.end_date || (l.duration_days && l.duration_days > 0))
  );

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
      <div className="space-y-3 pt-2">
        <Label className="flex items-center gap-2 text-base font-semibold">
          <Globe className="h-5 w-5" />
          Which countries are you visiting?
        </Label>
        <p className="text-sm text-muted-foreground pb-2">
          Add each country you'll visit.
        </p>
        <TripLegEditor
          legs={formData.legs}
          onLegsChange={handleLegsChange}
          hasDates={formData.hasDates}
          hideDateInputs={!dateModeAnswered}
        />
      </div>

      {/* Date Type Selection */}
      <div className="space-y-4 border-t pt-6 text-center sm:text-left">
        <Label className="text-base font-semibold">Do you have specific dates for this trip?</Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant={formData.hasDates && dateModeAnswered ? "default" : "outline"}
            className="flex-1 py-6 h-auto flex flex-col gap-1 items-center transition-all"
            onClick={() => {
              updateFormData({ hasDates: true });
              setDateModeAnswered(true);
            }}
          >
            <Calendar className="h-5 w-5" />
            <span>I have specific dates</span>
          </Button>
          <Button
            type="button"
            variant={!formData.hasDates && dateModeAnswered ? "default" : "outline"}
            className="flex-1 py-6 h-auto flex flex-col gap-1 items-center transition-all"
            onClick={() => {
              updateFormData({ hasDates: false });
              setDateModeAnswered(true);
            }}
          >
            <Clock className="h-5 w-5" />
            <span>I'm just browsing (No dates)</span>
          </Button>
        </div>
      </div>

      {!formData.hasDates && dateModeAnswered && (
        <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-top-2">
          <Label className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            When are you thinking of going? (Optional)
          </Label>
          <ToggleGroup
            type="single"
            value={formData.preferredSeason}
            onValueChange={(value) => value && updateFormData({ preferredSeason: value })}
            className="justify-start flex-wrap gap-2"
          >
            <ToggleGroupItem value="spring" className="gap-2 px-3 py-2 h-auto flex flex-col sm:flex-row">
              <Flower2 className="h-4 w-4 text-green-500" />
              <span>Spring</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="summer" className="gap-2 px-3 py-2 h-auto flex flex-col sm:flex-row">
              <Sun className="h-4 w-4 text-amber-500" />
              <span>Summer</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="fall" className="gap-2 px-3 py-2 h-auto flex flex-col sm:flex-row">
              <Leaf className="h-4 w-4 text-orange-500" />
              <span>Fall</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="winter" className="gap-2 px-3 py-2 h-auto flex flex-col sm:flex-row">
              <Snowflake className="h-4 w-4 text-blue-500" />
              <span>Winter</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="any" className="gap-2 px-3 py-2 h-auto flex flex-col sm:flex-row">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span>Don't Know / Any</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Trip Purpose */}
      <div className="space-y-3 pt-4 border-t">
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
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all text-center ${formData.tripPurpose === option.value
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
    </div >
  );
};
