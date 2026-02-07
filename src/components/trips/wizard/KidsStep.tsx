import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TripFormData } from "../TripWizard";
import { Baby, Plus, X, Users, Accessibility, ShoppingCart, AlertTriangle, Brain, Clock, Footprints } from "lucide-react";

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

// Common food allergies
const COMMON_ALLERGIES = [
  { id: "nuts", label: "Tree Nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "dairy", label: "Dairy" },
  { id: "eggs", label: "Eggs" },
  { id: "gluten", label: "Gluten" },
  { id: "shellfish", label: "Shellfish" },
  { id: "soy", label: "Soy" },
  { id: "fish", label: "Fish" },
];

// Sensory sensitivity options
const SENSORY_OPTIONS = [
  { id: "avoid_crowds", label: "Avoid crowded places", description: "Suggest off-peak times & quieter alternatives" },
  { id: "avoid_loud", label: "Avoid loud environments", description: "No fireworks, loud concerts, busy markets" },
  { id: "need_routine", label: "Need predictable routine", description: "Consistent daily schedule" },
  { id: "need_quiet_spaces", label: "Need quiet break spaces", description: "Include calm-down areas nearby" },
];

// Walking duration options
const WALKING_OPTIONS = [
  { value: "0", label: "No limit" },
  { value: "15", label: "15 min max between activities" },
  { value: "30", label: "30 min max between activities" },
  { value: "60", label: "1 hour max between activities" },
];

// Activity duration options
const ACTIVITY_OPTIONS = [
  { value: "0", label: "No limit" },
  { value: "30", label: "30 min max per activity" },
  { value: "60", label: "1 hour max per activity" },
  { value: "120", label: "2 hours max per activity" },
];

export const KidsStep = ({ formData, updateFormData }: KidsStepProps) => {
  const [newAge, setNewAge] = useState("");
  const [customAllergy, setCustomAllergy] = useState("");

  const addKidAge = () => {
    const age = parseInt(newAge);
    if (!isNaN(age) && age >= 2 && age <= 18) {
      if (!formData.kidsAges.includes(age)) {
        updateFormData({ kidsAges: [...formData.kidsAges, age] });
        setNewAge("");
      } else {
        setNewAge("");
      }
    }
  };

  const addInfantByMonths = (months: number) => {
    const ageInYears = months / 12;
    const isDuplicate = formData.kidsAges.some(age => Math.abs(age - ageInYears) < 0.01);
    if (!isDuplicate) {
      updateFormData({ kidsAges: [...formData.kidsAges, ageInYears] });
    }
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

  const toggleAllergy = (allergyId: string) => {
    const current = formData.foodAllergies || [];
    if (current.includes(allergyId)) {
      updateFormData({ foodAllergies: current.filter(a => a !== allergyId) });
    } else {
      updateFormData({ foodAllergies: [...current, allergyId] });
    }
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !formData.foodAllergies?.includes(`custom:${trimmed}`)) {
      updateFormData({ foodAllergies: [...(formData.foodAllergies || []), `custom:${trimmed}`] });
      setCustomAllergy("");
    }
  };

  const toggleSensitivity = (sensitivityId: string) => {
    const current = formData.sensorySensitivities || [];
    if (current.includes(sensitivityId)) {
      updateFormData({ sensorySensitivities: current.filter(s => s !== sensitivityId) });
    } else {
      updateFormData({ sensorySensitivities: [...current, sensitivityId] });
    }
  };

  const hasYoungKids = formData.kidsAges.some(age => age <= 4);

  // If not traveling with kids, show accessibility options only
  if (!formData.travelingWithKids) {
    return (
      <div className="space-y-6">
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Adults-Only Trip</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Great! We'll tailor recommendations for an adult travel experience.
          </p>
        </div>

        {/* Accessibility options for adults-only trips */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Accessibility className="h-4 w-4" />
            Accessibility & Mobility
          </h4>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="wheelchair-adult"
              checked={formData.needsWheelchairAccess}
              onCheckedChange={(checked) =>
                updateFormData({ needsWheelchairAccess: checked as boolean })
              }
            />
            <Label htmlFor="wheelchair-adult" className="font-normal cursor-pointer">
              Wheelchair-accessible options needed
              <span className="block text-xs text-muted-foreground">
                We'll prioritize step-free access, elevators, and accessible venues
              </span>
            </Label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kids Ages Section */}
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

      {/* Young kids specific options */}
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
              checked={formData.strollerNeeds || formData.hasStroller}
              onCheckedChange={(checked) => {
                updateFormData({
                  strollerNeeds: checked as boolean,
                  hasStroller: checked as boolean
                });
              }}
            />
            <Label htmlFor="stroller" className="font-normal cursor-pointer">
              <ShoppingCart className="h-4 w-4 inline mr-1" />
              We'll be using a stroller
              <span className="block text-xs text-muted-foreground">
                We'll prioritize stroller-friendly activities, terrain info, and elevator access
              </span>
            </Label>
          </div>

          {/* Bedtime */}
          <div className="space-y-2">
            <Label htmlFor="bedtime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Bedtime
            </Label>
            <p className="text-sm text-muted-foreground">
              Evening activities will end in time to get back for bedtime
            </p>
            <Input
              id="bedtime"
              type="time"
              value={formData.bedtime || ""}
              onChange={(e) => updateFormData({ bedtime: e.target.value })}
              className="w-32"
            />
          </div>
        </>
      )}

      {/* Food Allergies Section */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Food Allergies & Dietary Restrictions
        </h4>
        <p className="text-sm text-muted-foreground">
          We'll only suggest allergy-safe restaurants and flag food-related activities
        </p>

        <div className="flex flex-wrap gap-2">
          {COMMON_ALLERGIES.map((allergy) => (
            <Badge
              key={allergy.id}
              variant={formData.foodAllergies?.includes(allergy.id) ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-xs transition-all hover:scale-105"
              onClick={() => toggleAllergy(allergy.id)}
            >
              {allergy.label}
            </Badge>
          ))}
        </div>

        {/* Custom allergy input */}
        <div className="flex gap-2">
          <Input
            placeholder="Add other allergy..."
            value={customAllergy}
            onChange={(e) => setCustomAllergy(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomAllergy())}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addCustomAllergy}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Show selected custom allergies */}
        {formData.foodAllergies?.filter(a => a.startsWith("custom:")).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.foodAllergies.filter(a => a.startsWith("custom:")).map((allergy) => (
              <Badge key={allergy} variant="secondary" className="gap-1">
                {allergy.replace("custom:", "")}
                <button
                  type="button"
                  onClick={() => toggleAllergy(allergy)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Sensory Sensitivities Section */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          Sensory & Stimulation Needs
        </h4>
        <p className="text-sm text-muted-foreground">
          For children with autism, anxiety, or sensory processing differences
        </p>

        <div className="space-y-3">
          {SENSORY_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-start space-x-3">
              <Checkbox
                id={option.id}
                checked={formData.sensorySensitivities?.includes(option.id)}
                onCheckedChange={() => toggleSensitivity(option.id)}
              />
              <Label htmlFor={option.id} className="font-normal cursor-pointer">
                {option.label}
                <span className="block text-xs text-muted-foreground">
                  {option.description}
                </span>
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Walking & Activity Limits Section */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Footprints className="h-4 w-4" />
          Energy & Pacing Limits
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxWalking">Max walking between activities</Label>
            <Select
              value={String(formData.maxWalkingMinutes || 0)}
              onValueChange={(value) => updateFormData({ maxWalkingMinutes: parseInt(value) })}
            >
              <SelectTrigger id="maxWalking">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WALKING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxActivity">Max activity duration</Label>
            <Select
              value={String(formData.maxActivityMinutes || 0)}
              onValueChange={(value) => updateFormData({ maxActivityMinutes: parseInt(value) })}
            >
              <SelectTrigger id="maxActivity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Accessibility section - always show when traveling with kids */}
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Accessibility className="h-4 w-4" />
          Accessibility & Mobility
        </h4>

        <div className="flex items-center space-x-3">
          <Checkbox
            id="wheelchair"
            checked={formData.needsWheelchairAccess}
            onCheckedChange={(checked) =>
              updateFormData({ needsWheelchairAccess: checked as boolean })
            }
          />
          <Label htmlFor="wheelchair" className="font-normal cursor-pointer">
            Wheelchair-accessible options needed
            <span className="block text-xs text-muted-foreground">
              We'll prioritize step-free access, elevators, and accessible venues
            </span>
          </Label>
        </div>
      </div>
    </div>
  );
};
