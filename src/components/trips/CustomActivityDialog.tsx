import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomActivityDialogProps {
  itineraryDayId: string;
  onActivityAdded: () => void;
  existingItemsCount: number;
}

const CATEGORIES = [
  { value: "attraction", label: "Attraction" },
  { value: "restaurant", label: "Restaurant" },
  { value: "outdoor", label: "Outdoor" },
  { value: "museum", label: "Museum" },
  { value: "entertainment", label: "Entertainment" },
  { value: "transport", label: "Transport" },
  { value: "rest", label: "Rest / Downtime" },
  { value: "meeting", label: "Meeting" },
  { value: "business", label: "Business" },
];

export const CustomActivityDialog = ({ 
  itineraryDayId, 
  onActivityAdded,
  existingItemsCount 
}: CustomActivityDialogProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    locationName: "",
    category: "attraction",
    durationMinutes: 60,
    costEstimate: 0,
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Please enter an activity title");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("itinerary_items").insert({
        itinerary_day_id: itineraryDayId,
        sort_order: existingItemsCount,
        title: form.title,
        description: form.description || null,
        start_time: form.startTime || null,
        end_time: form.endTime || null,
        location_name: form.locationName || null,
        category: form.category,
        duration_minutes: form.durationMinutes,
        cost_estimate: form.costEstimate || null,
        time_slot: getTimeSlot(form.startTime),
      });

      if (error) throw error;

      toast.success("Activity added!");
      setOpen(false);
      setForm({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        locationName: "",
        category: "attraction",
        durationMinutes: 60,
        costEstimate: 0,
      });
      onActivityAdded();
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Failed to add activity");
    } finally {
      setSaving(false);
    }
  };

  const getTimeSlot = (time: string): string => {
    if (!time) return "morning";
    const hour = parseInt(time.split(":")[0]);
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Custom Activity</DialogTitle>
          <DialogDescription>
            Add your own activity to this day's itinerary
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Activity Name *</Label>
            <Input
              id="title"
              placeholder="e.g., Visit local market, Business lunch with client"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                step={15}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location Name</Label>
            <Input
              id="location"
              placeholder="e.g., Central Park, Marriott Conference Room"
              value={form.locationName}
              onChange={(e) => setForm({ ...form, locationName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Estimated Cost ($)</Label>
            <Input
              id="cost"
              type="number"
              min={0}
              value={form.costEstimate}
              onChange={(e) => setForm({ ...form, costEstimate: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Any notes about this activity..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Activity"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
