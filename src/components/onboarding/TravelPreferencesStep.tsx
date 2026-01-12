import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Tent, 
  Hotel, 
  Building, 
  Ship,
  Wallet,
  DollarSign,
  Gem,
  Zap,
  Coffee,
  Armchair
} from "lucide-react";

interface TravelPreferencesStepProps {
  onPreferencesChange?: (prefs: TravelPrefs) => void;
}

interface TravelPrefs {
  budget_preference: string;
  pace_preference: string;
  interests: string[];
  accommodation_preference: string[];
}

const INTEREST_OPTIONS = [
  { label: "Adventure & Outdoors", emoji: "🏔️" },
  { label: "Art & Museums", emoji: "🎨" },
  { label: "Beach & Relaxation", emoji: "🏖️" },
  { label: "Churches & Religious Sites", emoji: "⛪" },
  { label: "City Exploration", emoji: "🌆" },
  { label: "Family-friendly", emoji: "👨‍👩‍👧‍👦" },
  { label: "Food & Culinary", emoji: "🍜" },
  { label: "Golf", emoji: "⛳" },
  { label: "History & Culture", emoji: "🏛️" },
  { label: "Nature & Wildlife", emoji: "🦁" },
  { label: "Nightlife", emoji: "🌃" },
  { label: "Shopping", emoji: "🛍️" },
  { label: "Sports & Activities", emoji: "⚽" },
  { label: "Theme Parks", emoji: "🎢" },
].sort((a, b) => a.label.localeCompare(b.label));

const ACCOMMODATION_OPTIONS = [
  { value: "hotels", label: "Hotels", icon: Hotel },
  { value: "resorts", label: "Resorts", icon: Building },
  { value: "vacation_rentals", label: "Vacation Rentals", icon: Tent },
  { value: "cruises", label: "Cruises", icon: Ship },
];

const TravelPreferencesStep = ({ onPreferencesChange }: TravelPreferencesStepProps) => {
  const [preferences, setPreferences] = useState<TravelPrefs>({
    budget_preference: "moderate",
    pace_preference: "moderate",
    interests: [],
    accommodation_preference: [],
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingPreferences();
  }, []);

  useEffect(() => {
    onPreferencesChange?.(preferences);
  }, [preferences, onPreferencesChange]);

  const fetchExistingPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("travel_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setPreferences({
        budget_preference: data.budget_preference || "moderate",
        pace_preference: data.pace_preference || "moderate",
        interests: data.interests || [],
        accommodation_preference: data.accommodation_preference || [],
      });
    }
  };

  const savePreferences = async (newPrefs: TravelPrefs) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("travel_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("travel_preferences")
          .update(newPrefs)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("travel_preferences")
          .insert({ user_id: user.id, ...newPrefs });
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    const newInterests = preferences.interests.includes(interest)
      ? preferences.interests.filter((i) => i !== interest)
      : [...preferences.interests, interest];
    
    const newPrefs = { ...preferences, interests: newInterests };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const toggleAccommodation = (value: string) => {
    const newAccom = preferences.accommodation_preference.includes(value)
      ? preferences.accommodation_preference.filter((a) => a !== value)
      : [...preferences.accommodation_preference, value];
    
    const newPrefs = { ...preferences, accommodation_preference: newAccom };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const updatePreference = (key: keyof TravelPrefs, value: string) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  return (
    <div className="space-y-6">
      {/* Budget Preference */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Budget Preference</Label>
        <RadioGroup
          value={preferences.budget_preference}
          onValueChange={(v) => updatePreference("budget_preference", v)}
          className="grid grid-cols-3 gap-2"
        >
          <Label
            htmlFor="budget"
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              preferences.budget_preference === "budget" 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="budget" id="budget" className="sr-only" />
            <Wallet className="w-5 h-5 text-green-500" />
            <span className="text-xs font-medium">Budget</span>
          </Label>
          <Label
            htmlFor="moderate"
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              preferences.budget_preference === "moderate" 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="moderate" id="moderate" className="sr-only" />
            <DollarSign className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-medium">Moderate</span>
          </Label>
          <Label
            htmlFor="luxury"
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              preferences.budget_preference === "luxury" 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="luxury" id="luxury" className="sr-only" />
            <Gem className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-medium">Luxury</span>
          </Label>
        </RadioGroup>
      </div>

      {/* Travel Pace */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Travel Pace</Label>
        <RadioGroup
          value={preferences.pace_preference}
          onValueChange={(v) => updatePreference("pace_preference", v)}
          className="grid grid-cols-3 gap-2"
        >
          <Label
            htmlFor="relaxed"
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              preferences.pace_preference === "relaxed" 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="relaxed" id="relaxed" className="sr-only" />
            <Armchair className="w-5 h-5 text-teal-500" />
            <span className="text-xs font-medium">Relaxed</span>
          </Label>
          <Label
            htmlFor="pace-moderate"
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              preferences.pace_preference === "moderate" 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="moderate" id="pace-moderate" className="sr-only" />
            <Coffee className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-medium">Balanced</span>
          </Label>
          <Label
            htmlFor="fast"
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
              preferences.pace_preference === "fast" 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="fast" id="fast" className="sr-only" />
            <Zap className="w-5 h-5 text-rose-500" />
            <span className="text-xs font-medium">Fast-paced</span>
          </Label>
        </RadioGroup>
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">What do you enjoy? (Select all that apply)</Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <Badge
              key={interest.label}
              variant={preferences.interests.includes(interest.label) ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-xs transition-all hover:scale-105"
              onClick={() => toggleInterest(interest.label)}
            >
              <span className="mr-1">{interest.emoji}</span>
              {interest.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Accommodation */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Preferred Accommodation (Select all that apply)</Label>
        <div className="grid grid-cols-2 gap-2">
          {ACCOMMODATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleAccommodation(option.value)}
              className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                preferences.accommodation_preference.includes(option.value)
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
            >
              <option.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TravelPreferencesStep;
