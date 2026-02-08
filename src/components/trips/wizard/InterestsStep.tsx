import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Gamepad2,
  Target,
  Church,
  Briefcase,
  Plus,
  X,
  LandPlot
} from "lucide-react";

interface InterestsStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

const INTERESTS = [
  { id: "nature", label: "Nature & Outdoors", icon: Trees },
  { id: "culture", label: "Culture & History", icon: Landmark },
  { id: "churches", label: "Churches & Religious Sites", icon: Church },
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
  { id: "golf", label: "Golf", icon: LandPlot },
  { id: "business", label: "Business & Work", icon: Briefcase },
];

export const InterestsStep = ({ formData, updateFormData }: InterestsStepProps) => {
  const [customInterest, setCustomInterest] = useState("");

  const toggleInterest = (interestId: string) => {
    const current = formData.interests;
    if (current.includes(interestId)) {
      updateFormData({ interests: current.filter((i) => i !== interestId) });
    } else {
      updateFormData({ interests: [...current, interestId] });
    }
  };

  const addCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (trimmed && !formData.interests.includes(`custom:${trimmed}`)) {
      updateFormData({ interests: [...formData.interests, `custom:${trimmed}`] });
      setCustomInterest("");
    }
  };

  const removeCustomInterest = (interest: string) => {
    updateFormData({ interests: formData.interests.filter((i) => i !== interest) });
  };

  const customInterests = formData.interests.filter(i => i.startsWith("custom:"));
  const standardInterests = formData.interests.filter(i => !i.startsWith("custom:"));

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
          const isSelected = standardInterests.includes(interest.id);

          return (
            <button
              key={interest.id}
              type="button"
              onClick={() => toggleInterest(interest.id)}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${isSelected
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

      {/* Custom Interests */}
      <div className="space-y-2">
        <Label>Add your own interests</Label>
        <div className="flex gap-2">
          <Input
            placeholder="E.g., Wine tasting, Hiking..."
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomInterest())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addCustomInterest}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {customInterests.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {customInterests.map((interest) => (
              <Badge key={interest} variant="secondary" className="gap-1">
                {interest.replace("custom:", "")}
                <button
                  type="button"
                  onClick={() => removeCustomInterest(interest)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {formData.interests.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {formData.interests.length} interest{formData.interests.length !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
};
