import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Heart, Settings2, ThumbsUp, ThumbsDown, X } from "lucide-react";
import { useTravelPreferences } from "@/hooks/useTravelPreferences";
import { useFamilyData } from "@/hooks/useFamilyData";
import { cn } from "@/lib/utils";

const TRAVEL_STYLES = [
  { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
  { id: 'relaxation', label: 'Relaxation', emoji: '🏖️' },
  { id: 'cultural', label: 'Cultural', emoji: '🏛️' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'urban', label: 'Urban', emoji: '🌆' },
  { id: 'roadtrip', label: 'Road Trip', emoji: '🚗' },
];

const INTERESTS = [
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'food', label: 'Food & Cuisine', emoji: '🍜' },
  { id: 'art', label: 'Art & Museums', emoji: '🎨' },
  { id: 'nature', label: 'Wildlife', emoji: '🦁' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
];

const ACCOMMODATIONS = [
  { id: 'hotels', label: 'Hotels' },
  { id: 'resorts', label: 'Resorts' },
  { id: 'airbnb', label: 'Vacation Rentals' },
  { id: 'hostels', label: 'Hostels' },
  { id: 'camping', label: 'Camping' },
];

const AVOID_OPTIONS = [
  { id: 'crowded_places', label: 'Crowded Tourist Spots' },
  { id: 'long_flights', label: 'Long Flights (8+ hours)' },
  { id: 'extreme_weather', label: 'Extreme Weather' },
  { id: 'high_altitude', label: 'High Altitude' },
];

const TravelPreferencesSection = () => {
  const { preferences, loading, updatePreferences, toggleCountryPreference } = useTravelPreferences();
  const { countries } = useFamilyData();
  const [saving, setSaving] = useState(false);

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0);

  const toggleArrayItem = async (field: string, item: string) => {
    if (!preferences) return;
    setSaving(true);
    
    const currentArray = (preferences as any)[field] || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i: string) => i !== item)
      : [...currentArray, item];
    
    await updatePreferences({ [field]: newArray });
    setSaving(false);
  };

  const updateField = async (field: string, value: string) => {
    if (!preferences) return;
    setSaving(true);
    await updatePreferences({ [field]: value });
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Travel Preferences
        </CardTitle>
        <CardDescription>
          Help us recommend better destinations and itineraries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Travel Style */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Travel Style</Label>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_STYLES.map((style) => (
              <Badge
                key={style.id}
                variant={preferences?.travel_style?.includes(style.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all",
                  preferences?.travel_style?.includes(style.id) && "bg-primary"
                )}
                onClick={() => toggleArrayItem('travel_style', style.id)}
              >
                {style.emoji} {style.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Interests</Label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <Badge
                key={interest.id}
                variant={preferences?.interests?.includes(interest.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all",
                  preferences?.interests?.includes(interest.id) && "bg-primary"
                )}
                onClick={() => toggleArrayItem('interests', interest.id)}
              >
                {interest.emoji} {interest.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Budget Preference</Label>
          <div className="flex gap-2">
            {['budget', 'moderate', 'luxury'].map((budget) => (
              <Button
                key={budget}
                variant={preferences?.budget_preference === budget ? "default" : "outline"}
                size="sm"
                onClick={() => updateField('budget_preference', budget)}
                className="capitalize"
              >
                {budget === 'budget' && '💰'} 
                {budget === 'moderate' && '💵'} 
                {budget === 'luxury' && '💎'} 
                {budget}
              </Button>
            ))}
          </div>
        </div>

        {/* Pace */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Travel Pace</Label>
          <div className="flex gap-2">
            {['slow', 'moderate', 'fast'].map((pace) => (
              <Button
                key={pace}
                variant={preferences?.pace_preference === pace ? "default" : "outline"}
                size="sm"
                onClick={() => updateField('pace_preference', pace)}
                className="capitalize"
              >
                {pace === 'slow' && '🐢'} 
                {pace === 'moderate' && '🚶'} 
                {pace === 'fast' && '🏃'} 
                {pace}
              </Button>
            ))}
          </div>
        </div>

        {/* Accommodation */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Accommodation</Label>
          <div className="flex flex-wrap gap-2">
            {ACCOMMODATIONS.map((acc) => (
              <Badge
                key={acc.id}
                variant={preferences?.accommodation_preference?.includes(acc.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all",
                  preferences?.accommodation_preference?.includes(acc.id) && "bg-primary"
                )}
                onClick={() => toggleArrayItem('accommodation_preference', acc.id)}
              >
                {acc.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Avoid */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Prefer to Avoid</Label>
          <div className="flex flex-wrap gap-2">
            {AVOID_OPTIONS.map((opt) => (
              <Badge
                key={opt.id}
                variant={preferences?.avoid_preferences?.includes(opt.id) ? "destructive" : "outline"}
                className="cursor-pointer transition-all"
                onClick={() => toggleArrayItem('avoid_preferences', opt.id)}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Liked/Disliked Countries from visits */}
        {visitedCountries.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Rate Countries You've Visited</Label>
            <p className="text-xs text-muted-foreground">
              Tap to mark as liked or disliked - helps improve recommendations
            </p>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {visitedCountries.map((country) => {
                const isLiked = preferences?.liked_countries?.includes(country.name);
                const isDisliked = preferences?.disliked_countries?.includes(country.name);
                
                return (
                  <div key={country.id} className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
                    <span className="text-sm">{country.flag} {country.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn("h-6 w-6", isLiked && "text-green-500")}
                      onClick={() => toggleCountryPreference(country.name, 'liked')}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn("h-6 w-6", isDisliked && "text-red-500")}
                      onClick={() => toggleCountryPreference(country.name, 'disliked')}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Display liked countries */}
        {preferences?.liked_countries && preferences.liked_countries.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs text-muted-foreground mr-1">Loved:</span>
            {preferences.liked_countries.map((country) => (
              <Badge key={country} variant="secondary" className="text-green-600 bg-green-100 dark:bg-green-900/30">
                <Heart className="h-3 w-3 mr-1 fill-current" /> {country}
              </Badge>
            ))}
          </div>
        )}

        {saving && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TravelPreferencesSection;
