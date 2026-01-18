import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { TripFormData } from "../TripWizard";
import { Zap, Scale, Coffee, DollarSign, MapPin, Home } from "lucide-react";

interface PreferencesStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

const PACE_OPTIONS = [
  {
    value: "relaxed",
    label: "Relaxed",
    description: "Fewer activities, more downtime, flexible schedule",
    icon: Coffee,
  },
  {
    value: "moderate",
    label: "Balanced",
    description: "Mix of activities and rest, moderate pace",
    icon: Scale,
  },
  {
    value: "packed",
    label: "Action-Packed",
    description: "Maximum activities, early starts, see it all",
    icon: Zap,
  },
];

const BUDGET_OPTIONS = [
  { value: "budget", label: "Budget-Friendly", description: "Free attractions, affordable dining" },
  { value: "moderate", label: "Moderate", description: "Mix of paid and free activities" },
  { value: "premium", label: "Premium", description: "No expense spared, best experiences" },
];

const PROVIDER_OPTIONS = [
  { id: "local_tours", label: "Local Tours", description: "Expert-led local experiences" },
  { id: "airbnb_experiences", label: "Airbnb Experiences", description: "Unique hosted activities" },
  { id: "viator", label: "Viator", description: "Tours & tickets worldwide" },
  { id: "getyourguide", label: "GetYourGuide", description: "Attractions & activities" },
];

export const PreferencesStep = ({ formData, updateFormData }: PreferencesStepProps) => {
  const providerPreferences = formData.providerPreferences || [];

  const toggleProvider = (providerId: string) => {
    const current = providerPreferences;
    if (current.includes(providerId)) {
      updateFormData({ providerPreferences: current.filter(p => p !== providerId) });
    } else {
      updateFormData({ providerPreferences: [...current, providerId] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Label>Trip Pace</Label>
        <RadioGroup
          value={formData.pacePreference}
          onValueChange={(value) => updateFormData({ pacePreference: value })}
          className="space-y-3"
        >
          {PACE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.pacePreference === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value={option.value} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Budget Level
        </Label>
        <RadioGroup
          value={formData.budgetLevel}
          onValueChange={(value) => updateFormData({ budgetLevel: value })}
          className="space-y-3"
        >
          {BUDGET_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.budgetLevel === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <RadioGroupItem value={option.value} className="mt-1" />
              <div className="flex-1">
                <span className="font-medium">{option.label}</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Preferred Booking Providers (Optional)
        </Label>
        <p className="text-sm text-muted-foreground">
          Select providers you prefer for activities. Leave empty for all providers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PROVIDER_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                providerPreferences.includes(option.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Checkbox
                checked={providerPreferences.includes(option.id)}
                onCheckedChange={() => toggleProvider(option.id)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="font-medium text-sm">{option.label}</span>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Home className="h-4 w-4" />
          Lodging Status
        </Label>
        <label
          className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
            formData.hasLodging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <Checkbox
            checked={formData.hasLodging}
            onCheckedChange={(checked) => updateFormData({ hasLodging: !!checked })}
            className="mt-1"
          />
          <div className="flex-1">
            <span className="font-medium">I already have lodging booked</span>
            <p className="text-sm text-muted-foreground mt-1">
              {formData.hasLodging 
                ? "Great! We won't suggest hotels."
                : "We'll suggest lodging options with booking links."}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};
