import { Ruler } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDistanceUnit, DistanceUnit } from "@/hooks/useDistanceUnit";
import { useToast } from "@/hooks/use-toast";

const DistanceUnitSetting = () => {
  const { distanceUnit, updateDistanceUnit, loading } = useDistanceUnit();
  const { toast } = useToast();

  const handleChange = async (value: DistanceUnit) => {
    try {
      await updateDistanceUnit(value);
      toast({ title: `Distance unit set to ${value}` });
    } catch {
      toast({ title: "Failed to update distance unit", variant: "destructive" });
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Ruler className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Distance Units</Label>
      </div>
      <RadioGroup
        value={distanceUnit}
        onValueChange={(v) => handleChange(v as DistanceUnit)}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="miles" id="miles" />
          <Label htmlFor="miles" className="text-sm cursor-pointer">Miles</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="kilometers" id="kilometers" />
          <Label htmlFor="kilometers" className="text-sm cursor-pointer">Kilometers</Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export default DistanceUnitSetting;
