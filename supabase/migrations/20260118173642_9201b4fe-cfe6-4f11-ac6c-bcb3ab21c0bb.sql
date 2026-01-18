-- Create travel_profiles table for saveable preference profiles
CREATE TABLE public.travel_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  -- Trip characteristics
  trip_length_min INTEGER DEFAULT 1,
  trip_length_max INTEGER DEFAULT 14,
  domestic_vs_international TEXT DEFAULT 'both', -- 'domestic', 'international', 'both'
  -- Flight preferences
  preferred_seat_types TEXT[] DEFAULT '{}', -- 'economy', 'premium_economy', 'business', 'first'
  preferred_seat_features TEXT[] DEFAULT '{}', -- 'lie_flat', 'pod', 'extra_legroom', 'window', 'aisle'
  prefer_nonstop BOOLEAN DEFAULT true,
  max_stops INTEGER DEFAULT 1,
  -- Itinerary style
  pace TEXT DEFAULT 'moderate', -- 'relaxed', 'moderate', 'packed'
  budget_level TEXT DEFAULT 'moderate', -- 'budget', 'moderate', 'luxury'
  kid_friendly_priority TEXT DEFAULT 'moderate', -- 'low', 'moderate', 'high'
  -- Custom preferences stored as JSON
  custom_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own travel profiles"
ON public.travel_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own travel profiles"
ON public.travel_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own travel profiles"
ON public.travel_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own travel profiles"
ON public.travel_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_travel_profiles_updated_at
BEFORE UPDATE ON public.travel_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one profile is active per user
CREATE OR REPLACE FUNCTION public.ensure_single_active_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.travel_profiles
    SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER ensure_single_active_profile_trigger
BEFORE INSERT OR UPDATE OF is_active ON public.travel_profiles
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION public.ensure_single_active_profile();

-- Insert default profiles for existing users (will be created on-demand via the app)
-- Add index for common queries
CREATE INDEX idx_travel_profiles_user_id ON public.travel_profiles(user_id);
CREATE INDEX idx_travel_profiles_active ON public.travel_profiles(user_id, is_active) WHERE is_active = true;