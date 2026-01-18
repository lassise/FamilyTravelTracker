import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TripFormData } from "../TripWizard";
import { Baby, Plus, X, Users } from "lucide-react";

interface KidsStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

// Infant age options in months
const INFANT_MONTHS = [
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 9, label: "9 months" },
  { value: 12, label: "12 months" },
  { value: 18, label: "18 months" },
  { value: 24, label: "24 months" },
];

export const KidsStep = ({ formData, updateFormData }: KidsStepProps) => {
  const [newAge, setNewAge] = useState("");
  const [infantMonths, setInfantMonths] = useState<string>("");

  const addKidAge = () => {
    const age = parseInt(newAge);
    if (!isNaN(age) && age >= 0 && age <= 18) {
      updateFormData({ kidsAges: [...formData.kidsAges, age] });
      setNewAge("");
    }
  };

  const addInfantByMonths = (months: number) => {
    // Store as negative to indicate months (e.g., -6 = 6 months old)
    // Or we can store as decimal (0.5 = 6 months)
    // Let's store as decimal for clarity
    const ageInYears = months / 12;
    updateFormData({ kidsAges: [...formData.kidsAges, ageInYears] });
    setInfantMonths("");
  };

  const removeKidAge = (index: number) => {
    updateFormData({
      kidsAges: formData.kidsAges.filter((_, i) => i !== index),
    });
  };

  const formatAge = (age: number): string => {
    if (age < 1) {
      const months = Math.round(age * 12);
      return `${months} mo`;
    }
    return `${age} ${age === 1 ? "year" : "years"}`;
  };

  const hasYoungKids = formData.kidsAges.some(age => age <= 4);

  // If not traveling with kids, show a simple message
  if (!formData.travelingWithKids) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Adults-Only Trip</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Great! We'll tailor recommendations for an adult travel experience. 
            You can proceed to the next step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Baby className="h-4 w-4" />
          Kids' Ages
        </Label>
        <p className="text-sm text-muted-foreground">
          Add the age of each child traveling
        </p>
        
        {/* Infant selection (in months) */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">For babies under 2:</Label>
          <div className="flex flex-wrap gap-2">
            {INFANT_MONTHS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addInfantByMonths(option.value)}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Older kids input */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">For kids 2 and older:</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min="2"
              max="18"
              placeholder="Age (2-18)"
              value={newAge}
              onChange={(e) => setNewAge(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKidAge()}
              className="w-28"
            />
            <Button type="button" variant="secondary" onClick={addKidAge}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {formData.kidsAges.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.kidsAges.map((age, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm py-1 px-3 gap-1"
              >
                {formatAge(age)}
                <button
                  type="button"
                  onClick={() => removeKidAge(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {formData.kidsAges.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Please add at least one child's age to continue
          </p>
        )}
      </div>

      {hasYoungKids && (
        <>
          <div className="space-y-2">
            <Label htmlFor="napSchedule">Nap Schedule</Label>
            <Select
              value={formData.napSchedule}
              onValueChange={(value) => updateFormData({ napSchedule: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select nap schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning nap (9-11am)</SelectItem>
                <SelectItem value="afternoon">Afternoon nap (1-3pm)</SelectItem>
                <SelectItem value="both">Morning & afternoon naps</SelectItem>
                <SelectItem value="flexible">Flexible / naps on-the-go</SelectItem>
                <SelectItem value="none">No naps needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <Checkbox
              id="stroller"
              checked={formData.strollerNeeds}
              onCheckedChange={(checked) =>
                updateFormData({ strollerNeeds: checked as boolean })
              }
            />
            <Label htmlFor="stroller" className="font-normal cursor-pointer">
              We'll be using a stroller
              <span className="block text-xs text-muted-foreground">
                We'll prioritize stroller-friendly activities and routes
              </span>
            </Label>
          </div>
        </>
      )}
    </div>
  );
};
