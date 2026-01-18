import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit2, Trash2, Check, Plane, MapPin, Users, Clock, DollarSign } from "lucide-react";
import { useTravelProfiles, TravelProfile } from "@/hooks/useTravelProfiles";
import { cn } from "@/lib/utils";

const SEAT_TYPES = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First Class' },
];

const SEAT_FEATURES = [
  { value: 'lie_flat', label: 'Lie-Flat Seats' },
  { value: 'pod', label: 'Private Pods' },
  { value: 'extra_legroom', label: 'Extra Legroom' },
  { value: 'window', label: 'Window Preference' },
  { value: 'aisle', label: 'Aisle Preference' },
  { value: 'bulkhead', label: 'Bulkhead Row' },
];

interface ProfileFormData {
  name: string;
  trip_length_min: number;
  trip_length_max: number;
  domestic_vs_international: 'domestic' | 'international' | 'both';
  preferred_seat_types: string[];
  preferred_seat_features: string[];
  prefer_nonstop: boolean;
  max_stops: number;
  pace: 'relaxed' | 'moderate' | 'packed';
  budget_level: 'budget' | 'moderate' | 'luxury';
  kid_friendly_priority: 'low' | 'moderate' | 'high';
}

const defaultFormData: ProfileFormData = {
  name: "",
  trip_length_min: 1,
  trip_length_max: 14,
  domestic_vs_international: 'both',
  preferred_seat_types: ['economy'],
  preferred_seat_features: [],
  prefer_nonstop: true,
  max_stops: 1,
  pace: 'moderate',
  budget_level: 'moderate',
  kid_friendly_priority: 'moderate',
};

export function TravelProfilesManager() {
  const { profiles, activeProfile, loading, createProfile, updateProfile, deleteProfile, setActive } = useTravelProfiles();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TravelProfile | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);

  const handleEdit = (profile: TravelProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      trip_length_min: profile.trip_length_min,
      trip_length_max: profile.trip_length_max,
      domestic_vs_international: profile.domestic_vs_international as 'domestic' | 'international' | 'both',
      preferred_seat_types: profile.preferred_seat_types,
      preferred_seat_features: profile.preferred_seat_features,
      prefer_nonstop: profile.prefer_nonstop,
      max_stops: profile.max_stops,
      pace: profile.pace as 'relaxed' | 'moderate' | 'packed',
      budget_level: profile.budget_level as 'budget' | 'moderate' | 'luxury',
      kid_friendly_priority: profile.kid_friendly_priority as 'low' | 'moderate' | 'high',
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProfile(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingProfile) {
      await updateProfile(editingProfile.id, formData);
    } else {
      await createProfile({
        ...formData,
        is_active: false,
        is_default: false,
        custom_preferences: {},
      });
    }
    setIsDialogOpen(false);
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Travel Profiles
            </CardTitle>
            <CardDescription>
              Save different travel styles for quick access
            </CardDescription>
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Profile
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={cn(
              "border rounded-lg p-4 transition-all",
              profile.is_active && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{profile.name}</h4>
                  {profile.is_active && (
                    <Badge variant="default" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                  {profile.is_default && (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {profile.trip_length_min}-{profile.trip_length_max} days
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.domestic_vs_international}
                  </span>
                  <span className="flex items-center gap-1">
                    <Plane className="h-3 w-3" />
                    {profile.preferred_seat_types.join(', ')}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {profile.budget_level}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!profile.is_active && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActive(profile.id)}
                  >
                    Activate
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEdit(profile)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                {!profile.is_default && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteProfile(profile.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingProfile ? 'Edit Profile' : 'Create New Profile'}
              </DialogTitle>
              <DialogDescription>
                Configure your travel preferences for this profile
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Profile Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Weekend Getaways"
                  />
                </div>

                <Separator />

                {/* Trip Length */}
                <div className="space-y-4">
                  <Label>Typical Trip Length</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Slider
                        value={[formData.trip_length_min, formData.trip_length_max]}
                        min={1}
                        max={30}
                        step={1}
                        onValueChange={([min, max]) => setFormData(prev => ({
                          ...prev,
                          trip_length_min: min,
                          trip_length_max: max,
                        }))}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-24">
                      {formData.trip_length_min} - {formData.trip_length_max} days
                    </span>
                  </div>
                </div>

                {/* Domestic vs International */}
                <div className="space-y-2">
                  <Label>Trip Type</Label>
                  <Select
                    value={formData.domestic_vs_international}
                    onValueChange={(v) => setFormData(prev => ({ 
                      ...prev, 
                      domestic_vs_international: v as 'domestic' | 'international' | 'both' 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domestic">Domestic Only</SelectItem>
                      <SelectItem value="international">International Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Seat Types */}
                <div className="space-y-2">
                  <Label>Preferred Cabin Class</Label>
                  <div className="flex flex-wrap gap-2">
                    {SEAT_TYPES.map(type => (
                      <Badge
                        key={type.value}
                        variant={formData.preferred_seat_types.includes(type.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          preferred_seat_types: toggleArrayItem(prev.preferred_seat_types, type.value),
                        }))}
                      >
                        {type.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Seat Features */}
                <div className="space-y-2">
                  <Label>Seat Preferences</Label>
                  <div className="flex flex-wrap gap-2">
                    {SEAT_FEATURES.map(feature => (
                      <Badge
                        key={feature.value}
                        variant={formData.preferred_seat_features.includes(feature.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          preferred_seat_features: toggleArrayItem(prev.preferred_seat_features, feature.value),
                        }))}
                      >
                        {feature.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Non-stop preference */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Prefer Non-stop Flights</Label>
                    <p className="text-xs text-muted-foreground">Prioritize direct flights when available</p>
                  </div>
                  <Switch
                    checked={formData.prefer_nonstop}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, prefer_nonstop: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Stops</Label>
                  <Select
                    value={formData.max_stops.toString()}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, max_stops: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Non-stop only</SelectItem>
                      <SelectItem value="1">Up to 1 stop</SelectItem>
                      <SelectItem value="2">Up to 2 stops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Pace */}
                <div className="space-y-2">
                  <Label>Travel Pace</Label>
                  <Select
                    value={formData.pace}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, pace: v as 'relaxed' | 'moderate' | 'packed' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relaxed">Relaxed - Fewer activities, more downtime</SelectItem>
                      <SelectItem value="moderate">Moderate - Balanced schedule</SelectItem>
                      <SelectItem value="packed">Packed - See as much as possible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget */}
                <div className="space-y-2">
                  <Label>Budget Level</Label>
                  <Select
                    value={formData.budget_level}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, budget_level: v as 'budget' | 'moderate' | 'luxury' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget - Cost-conscious choices</SelectItem>
                      <SelectItem value="moderate">Moderate - Good value balance</SelectItem>
                      <SelectItem value="luxury">Luxury - Premium experiences</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Kid-Friendly Priority */}
                <div className="space-y-2">
                  <Label>Kid-Friendly Priority</Label>
                  <Select
                    value={formData.kid_friendly_priority}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, kid_friendly_priority: v as 'low' | 'moderate' | 'high' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Adult-focused</SelectItem>
                      <SelectItem value="moderate">Moderate - Family balance</SelectItem>
                      <SelectItem value="high">High - Kids come first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name.trim()}>
                {editingProfile ? 'Save Changes' : 'Create Profile'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
