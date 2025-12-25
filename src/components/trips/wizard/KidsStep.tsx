import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TripFormData } from "../TripWizard";
import { Baby, Plus, X } from "lucide-react";

interface KidsStepProps {
  formData: TripFormData;
  updateFormData: (updates: Partial<TripFormData>) => void;
}

export const KidsStep = ({ formData, updateFormData }: KidsStepProps) => {
  const [newAge, setNewAge] = useState("");

  const addKidAge = () => {
    const age = parseInt(newAge);
    if (!isNaN(age) && age >= 0 && age <= 18) {
      updateFormData({ kidsAges: [...formData.kidsAges, age] });
      setNewAge("");
    }
  };

  const removeKidAge = (index: number) => {
    updateFormData({
      kidsAges: formData.kidsAges.filter((_, i) => i !== index),
    });
  };

  const hasYoungKids = formData.kidsAges.some(age => age <= 4);

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
        
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
            max="18"
            placeholder="Age"
            value={newAge}
            onChange={(e) => setNewAge(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKidAge()}
            className="w-24"
          />
          <Button type="button" variant="secondary" onClick={addKidAge}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {formData.kidsAges.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.kidsAges.map((age, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm py-1 px-3 gap-1"
              >
                {age} {age === 1 ? "year" : "years"}
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
