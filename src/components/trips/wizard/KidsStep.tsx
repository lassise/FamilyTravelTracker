import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TripFormData } from "../TripWizard";
import { Baby, Plus, X, Users, Accessibility, ShoppingCart, AlertTriangle, Brain, Clock, Footprints } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface KidsStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

// No longer need INFANT_MONTHS

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

  const addKidAge = (age: number) => {
    updateFormData({ kidsAges: [...formData.kidsAges, age] });
  };

  const removeKidAge = (index: number) => {
    updateFormData({
      kidsAges: formData.kidsAges.filter((_, i) => i !== index),
    });
  };

  const formatAge = (age: number): string => {
    if (age < 1) {
      return "Under 1 yr";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="kid-toggle" className="font-medium cursor-pointer">
            Traveling with kids
          </Label>
        </div>
        <Switch
          id="kid-toggle"
          checked={formData.travelingWithKids}
          onCheckedChange={(checked) => updateFormData({ travelingWithKids: checked })}
        />
      </div>

      {!formData.travelingWithKids ? (
        <div className="space-y-6 pt-4">
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Adults-Only Trip</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We'll tailor suggestions for an adult experience. You can still add accessibility needs below.
            </p>
          </div>

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
                  Step-free access, elevators, and accessible venues
                </span>
              </Label>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Kids Ages Section */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Baby className="h-5 w-5" />
              Kids' Ages
            </Label>
            <p className="text-sm text-muted-foreground">
              Add the age of each child traveling (years)
            </p>

            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addKidAge(0)}
                  className="h-10 text-xs px-1"
                >
                  &lt;1 yr
                </Button>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(age => (
                  <Button
                    key={age}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addKidAge(age)}
                    className="h-10 text-xs"
                  >
                    {age}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t mt-2">
                <Input
                  id="age-input"
                  type="number"
                  min="13"
                  max="18"
                  placeholder="Other age (13-18)"
                  value={newAge}
                  onChange={(e) => setNewAge(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const age = parseInt(newAge);
                      if (!isNaN(age) && age > 0) {
                        addKidAge(age);
                        setNewAge("");
                      }
                    }
                  }}
                  className="h-10 text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const age = parseInt(newAge);
                    if (!isNaN(age) && age > 0) {
                      addKidAge(age);
                      setNewAge("");
                    }
                  }}
                  className="h-10 px-4"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formData.kidsAges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.kidsAges.map((age, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-sm py-1.5 px-3 gap-2 bg-blue-100 text-blue-700 border-blue-200"
                  >
                    {formatAge(age)}
                    <button
                      type="button"
                      onClick={() => removeKidAge(index)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {formData.kidsAges.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                Please add at least one child's age to continue
              </p>
            )}
          </div>

          {/* Young kids specific options */}
          <div className="bg-primary/5 p-4 rounded-xl space-y-6 border border-primary/10">
            {/* Stroller Question - Standalone */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
                <Label htmlFor="stroller-toggle" className="font-medium cursor-pointer">
                  Will you be using a stroller?
                </Label>
              </div>
              <Switch
                id="stroller-toggle"
                checked={formData.hasStroller || formData.strollerNeeds}
                onCheckedChange={(checked) => updateFormData({ hasStroller: checked, strollerNeeds: checked })}
              />
            </div>

            {hasYoungKids && (
              <>
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <Label htmlFor="nap-toggle" className="font-medium cursor-pointer">
                        Does your child need a daily nap?
                      </Label>
                    </div>
                    <Switch
                      id="nap-toggle"
                      checked={!!(formData.napStartTime || formData.napEndTime)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          updateFormData({ napStartTime: "13:00", napEndTime: "15:00" });
                        } else {
                          updateFormData({ napStartTime: "", napEndTime: "" });
                        }
                      }}
                    />
                  </div>

                  {(formData.napStartTime || formData.napEndTime) && (
                    <div className="flex items-center gap-3 pl-6 animate-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1">
                        <Label htmlFor="napStart" className="text-[10px] uppercase text-muted-foreground">Start</Label>
                        <Input
                          id="napStart"
                          type="time"
                          value={formData.napStartTime}
                          onChange={(e) => updateFormData({ napStartTime: e.target.value })}
                          className="w-32 h-9"
                        />
                      </div>
                      <div className="pt-4 text-muted-foreground">to</div>
                      <div className="space-y-1">
                        <Label htmlFor="napEnd" className="text-[10px] uppercase text-muted-foreground">End</Label>
                        <Input
                          id="napEnd"
                          type="time"
                          value={formData.napEndTime}
                          onChange={(e) => updateFormData({ napEndTime: e.target.value })}
                          className="w-32 h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label htmlFor="bedtime" className="flex items-center gap-2 font-medium">
                    <Clock className="h-4 w-4 text-indigo-500" />
                    Preferred Bedtime
                  </Label>
                  <Input
                    id="bedtime"
                    type="time"
                    value={formData.bedtime || ""}
                    onChange={(e) => updateFormData({ bedtime: e.target.value })}
                    className="w-32 h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">Helps us avoid suggesting late dinners</p>
                </div>
              </>
            )}
          </div>

          {/* Safety Accordion remains same but inside the travelingWithKids block */}
          {/* Refactored below */}

          {/* Accordion for safety and special needs */}
          <Accordion type="single" collapsible className="w-full border-t">
            {/* Food Allergies Section */}
            <AccordionItem value="allergies">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2 text-left">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Food Allergies & Dietary Restrictions</span>
                    <span className="text-xs text-muted-foreground font-normal">Restaurant suggestions & safety flags</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1 pb-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  {COMMON_ALLERGIES.map((allergy) => (
                    <Badge
                      key={allergy.id}
                      variant={formData.foodAllergies?.includes(allergy.id) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5 transition-all hover:scale-105"
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

                {/* Selected custom allergies */}
                {formData.foodAllergies?.filter(a => a.startsWith("custom:")).length > 0 && (
                  <div className="flex flex-wrap gap-1">
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
              </AccordionContent>
            </AccordionItem>

            {/* Sensory Sensitivities Section */}
            <AccordionItem value="sensory">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2 text-left">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Sensory & Stimulation Needs</span>
                    <span className="text-xs text-muted-foreground font-normal">Autism, anxiety, or sensory processing</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1 pb-4">
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
              </AccordionContent>
            </AccordionItem>

            {/* Energy & Pacing Limits Section */}
            <AccordionItem value="pacing">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2 text-left">
                  <Footprints className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Energy & Pacing Limits</span>
                    <span className="text-xs text-muted-foreground font-normal">Walking limits & activity durations</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1 pb-4">
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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
      )}
    </div>
  );
};
