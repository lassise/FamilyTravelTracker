
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
  Armchair,
  Utensils,
  Baby,
  Plane,
  ShieldCheck,
  Accessibility
} from "lucide-react";
import { Input } from "@/components/ui/input";

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

const FLIGHT_CLASSES = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Econ" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

const ALLIANCE_OPTIONS = [
  { value: "Star Alliance", label: "Star Alliance" },
  { value: "SkyTeam", label: "SkyTeam" },
  { value: "OneWorld", label: "OneWorld" },
];

const TravelPreferencesStep = ({ onPreferencesChange }: TravelPreferencesStepProps) => {
  const [preferences, setPreferences] = useState<TravelPrefs>({
    budget_preference: "moderate",
    pace_preference: "moderate",
    interests: [],
    accommodation_preference: [],
  });

  // Flight / Family specific states (synced to flight_preferences or placeholder)
  const [cabinClass, setCabinClass] = useState("economy");
  const [preferredAlliances, setPreferredAlliances] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]); // Placeholder
  const [accessibilityNeeds, setAccessibilityNeeds] = useState<string[]>([]); // Placeholder ("Stroller", "Wheelchair")

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

    // Fetch Travel Preferences
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

    // Fetch Flight Preferences
    const { data: flightData } = await supabase
      .from("flight_preferences")
      .select("cabin_class, preferred_alliances")
      .eq("user_id", user.id)
      .maybeSingle();

    if (flightData?.cabin_class) {
      setCabinClass(flightData.cabin_class);
    }
    if (flightData?.preferred_alliances) {
      setPreferredAlliances(flightData.preferred_alliances || []);
    }
  };

  const savePreferences = async (newPrefs: TravelPrefs) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    try {
      // 1. Save Travel Preferences
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

      // 2. Save Flight Preferences (Cabin Class)
      const { data: existingFlight } = await supabase
        .from("flight_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingFlight) {
        await supabase.from("flight_preferences").update({
          cabin_class: cabinClass,
          preferred_alliances: preferredAlliances
        }).eq("user_id", user.id);
      } else {
        // Create if missing
        await supabase.from("flight_preferences").insert({
          user_id: user.id,
          cabin_class: cabinClass,
          preferred_alliances: preferredAlliances
        });
      }

    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  // Wrapper for updating state + saving
  const updatePreference = (key: keyof TravelPrefs, value: any) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const toggleInterest = (interest: string) => {
    const newInterests = preferences.interests.includes(interest)
      ? preferences.interests.filter((i) => i !== interest)
      : [...preferences.interests, interest];
    updatePreference("interests", newInterests);
  };

  const toggleAccommodation = (value: string) => {
    const newAccom = preferences.accommodation_preference.includes(value)
      ? preferences.accommodation_preference.filter((a) => a !== value)
      : [...preferences.accommodation_preference, value];
    updatePreference("accommodation_preference", newAccom);
  };

  const handleCabinChange = (val: string) => {
    setCabinClass(val);
    // Trigger save immediately (debouncing would be better but this is fine for onboarding)
    setTimeout(() => {
      savePreferences(preferences); // Re-saves existing travel prefs but also saves cabin class
    }, 100);
  };

  return (
    <div className="space-y-8">

      {/* 1. Budget & Pace Group */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Budget Preference
          </Label>
          <RadioGroup
            value={preferences.budget_preference}
            onValueChange={(v) => updatePreference("budget_preference", v)}
            className="grid grid-cols-3 gap-2"
          >
            <Label
              htmlFor="budget"
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${preferences.budget_preference === "budget" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                }`}
            >
              <RadioGroupItem value="budget" id="budget" className="sr-only" />
              <div className="bg-green-100 p-1.5 rounded-full"><DollarSign className="w-4 h-4 text-green-600" /></div>
              <span className="text-xs font-medium">Budget</span>
            </Label>
            <Label
              htmlFor="moderate"
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${preferences.budget_preference === "moderate" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                }`}
            >
              <RadioGroupItem value="moderate" id="moderate" className="sr-only" />
              <div className="bg-blue-100 p-1.5 rounded-full"><DollarSign className="w-4 h-4 text-blue-600" /></div>
              <span className="text-xs font-medium">Standard</span>
            </Label>
            <Label
              htmlFor="luxury"
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${preferences.budget_preference === "luxury" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                }`}
            >
              <RadioGroupItem value="luxury" id="luxury" className="sr-only" />
              <div className="bg-purple-100 p-1.5 rounded-full"><Gem className="w-4 h-4 text-purple-600" /></div>
              <span className="text-xs font-medium">Luxury</span>
            </Label>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" /> Travel Pace
          </Label>
          <RadioGroup
            value={preferences.pace_preference}
            onValueChange={(v) => updatePreference("pace_preference", v)}
            className="grid grid-cols-3 gap-2"
          >
            {[{ v: "relaxed", l: "Relaxed", i: Armchair, c: "text-teal-500", bg: "bg-teal-100" },
            { v: "moderate", l: "Balanced", i: Coffee, c: "text-amber-500", bg: "bg-amber-100" },
            { v: "fast", l: "Fast", i: Zap, c: "text-rose-500", bg: "bg-rose-100" }]
              .map(opt => (
                <Label
                  key={opt.v}
                  htmlFor={opt.v}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${preferences.pace_preference === opt.v ? "border-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                >
                  <RadioGroupItem value={opt.v} id={opt.v} className="sr-only" />
                  <div className={`${opt.bg} p-1.5 rounded-full`}><opt.i className={`w-4 h-4 ${opt.c}`} /></div>
                  <span className="text-xs font-medium">{opt.l}</span>
                </Label>
              ))}
          </RadioGroup>
        </div>
      </div>

      {/* 2. Interests */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Interests & Hobbies</Label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <Badge
              key={interest.label}
              variant={preferences.interests.includes(interest.label) ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1.5 text-xs transition-all hover:scale-105 ${preferences.interests.includes(interest.label) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
              onClick={() => toggleInterest(interest.label)}
            >
              <span className="mr-1.5">{interest.emoji}</span>
              {interest.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* 3. Accommodation & Flight Class */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium">Accommodation Style</Label>
          <div className="grid grid-cols-2 gap-2">
            {ACCOMMODATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleAccommodation(option.value)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left ${preferences.accommodation_preference.includes(option.value)
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "hover:border-primary/50 hover:bg-muted/50"
                  }`}
              >
                <option.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Plane className="w-4 h-4" /> Flight Class Preference
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {FLIGHT_CLASSES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleCabinChange(opt.value)}
                className={`flex items-center justify-center p-2.5 rounded-lg border transition-all ${cabinClass === opt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 font-medium"
                  : "hover:border-primary/50 text-muted-foreground"
                  }`}
              >
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="pt-2 text-[10px] text-muted-foreground">
            We'll prioritize this class when searching for flights.
          </div>

          <div className="pt-4">
            <Label className="text-sm font-medium block mb-2">Airline Alliances</Label>
            <div className="flex flex-wrap gap-2">
              {ALLIANCE_OPTIONS.map((opt) => (
                <Badge
                  key={opt.value}
                  variant="outline"
                  className={`cursor-pointer ${preferredAlliances.includes(opt.value) ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-accent'}`}
                  onClick={() => {
                    const newAlliances = preferredAlliances.includes(opt.value)
                      ? preferredAlliances.filter(a => a !== opt.value)
                      : [...preferredAlliances, opt.value];
                    setPreferredAlliances(newAlliances);
                    // Delayed save
                    setTimeout(() => savePreferences(preferences), 100);
                  }}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Family Needs (Diet, Accessibility) - Visual Only for now */}
      <div className="space-y-3 pt-4 border-t">
        <Label className="text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Family & Safety Needs
        </Label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Utensils className="w-3 h-3" /> Dietary Allergies / Restrictions
            </Label>
            <Input
              placeholder="e.g. Peanut Allergy, Gluten Free..."
              value={dietaryRestrictions.join(", ")}
              onChange={(e) => setDietaryRestrictions(e.target.value ? e.target.value.split(",").map(s => s.trim()) : [])}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Accessibility className="w-3 h-3" /> Accessibility Needs
            </Label>
            <div className="flex gap-2">
              <Badge
                variant="outline"
                className={`cursor-pointer ${accessibilityNeeds.includes('Stroller') ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => setAccessibilityNeeds(p => p.includes('Stroller') ? p.filter(x => x !== 'Stroller') : [...p, 'Stroller'])}
              >Stroller</Badge>
              <Badge
                variant="outline"
                className={`cursor-pointer ${accessibilityNeeds.includes('Wheelchair') ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => setAccessibilityNeeds(p => p.includes('Wheelchair') ? p.filter(x => x !== 'Wheelchair') : [...p, 'Wheelchair'])}
              >Wheelchair</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelPreferencesStep;
