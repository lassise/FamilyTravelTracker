import { Label } from "@/components/ui/label";
import { TripFormData } from "../TripWizard";
import { 
  Trees, 
  Landmark, 
  Ticket, 
  Waves, 
  Building2, 
  Utensils,
  Camera,
  Music,
  ShoppingBag,
  Footprints,
  Palette,
  Gamepad2
} from "lucide-react";

interface InterestsStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

const INTERESTS = [
  { id: "nature", label: "Nature & Outdoors", icon: Trees },
  { id: "culture", label: "Culture & History", icon: Landmark },
  { id: "theme-parks", label: "Theme Parks", icon: Ticket },
  { id: "beaches", label: "Beaches & Water", icon: Waves },
  { id: "museums", label: "Museums", icon: Building2 },
  { id: "food", label: "Food & Dining", icon: Utensils },
  { id: "sightseeing", label: "Sightseeing", icon: Camera },
  { id: "entertainment", label: "Shows & Entertainment", icon: Music },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "walking", label: "Walking Tours", icon: Footprints },
  { id: "arts", label: "Arts & Crafts", icon: Palette },
  { id: "playgrounds", label: "Playgrounds & Play Areas", icon: Gamepad2 },
];

export const InterestsStep = ({ formData, updateFormData }: InterestsStepProps) => {
  const toggleInterest = (interestId: string) => {
    const current = formData.interests;
    if (current.includes(interestId)) {
      updateFormData({ interests: current.filter((i) => i !== interestId) });
    } else {
      updateFormData({ interests: [...current, interestId] });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>What does your family enjoy?</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Select all that apply - we'll tailor activities to your interests
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {INTERESTS.map((interest) => {
          const Icon = interest.icon;
          const isSelected = formData.interests.includes(interest.id);
          
          return (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggleInterest(interest.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <Icon className="h-6 w-6 mb-2" />
              <span className="text-xs text-center font-medium">{interest.label}</span>
            </button>
          );
        })}
      </div>

      {formData.interests.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {formData.interests.length} interest{formData.interests.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
};
