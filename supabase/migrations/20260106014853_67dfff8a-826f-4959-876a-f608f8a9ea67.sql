-- Create travel_preferences table for storing user preferences
CREATE TABLE public.travel_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  liked_countries TEXT[] DEFAULT '{}',
  disliked_countries TEXT[] DEFAULT '{}',
  travel_style TEXT[] DEFAULT '{}', -- e.g., 'adventure', 'relaxation', 'cultural', 'beach', 'mountain'
  budget_preference TEXT DEFAULT 'moderate', -- 'budget', 'moderate', 'luxury'
  pace_preference TEXT DEFAULT 'moderate', -- 'slow', 'moderate', 'fast'
  accommodation_preference TEXT[] DEFAULT '{}', -- 'hotels', 'hostels', 'airbnb', 'resorts', 'camping'
  interests TEXT[] DEFAULT '{}', -- 'history', 'food', 'nature', 'nightlife', 'art', 'sports'
  avoid_preferences TEXT[] DEFAULT '{}', -- 'crowded_places', 'long_flights', 'extreme_weather'
  travel_with TEXT DEFAULT 'family', -- 'solo', 'couple', 'family', 'friends'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own preferences" ON public.travel_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.travel_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.travel_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.travel_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Add trip_group_id to country_visit_details to link multiple countries to one trip
ALTER TABLE public.country_visit_details ADD COLUMN trip_group_id UUID;

-- Create index for trip grouping
CREATE INDEX idx_country_visit_details_trip_group ON public.country_visit_details(trip_group_id);

-- Update timestamp trigger for travel_preferences
CREATE TRIGGER update_travel_preferences_updated_at
  BEFORE UPDATE ON public.travel_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();