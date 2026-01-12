-- Drop and recreate flight_preferences with all the comprehensive fields
DROP TABLE IF EXISTS public.flight_preferences;

CREATE TABLE public.flight_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Home airports (primary and secondary with drive times)
  home_airports JSONB DEFAULT '[]'::jsonb,
  
  -- Preferred airlines and alliances
  preferred_airlines TEXT[] DEFAULT '{}',
  avoided_airlines TEXT[] DEFAULT '{}',
  preferred_alliances TEXT[] DEFAULT '{}',
  
  -- Seat preferences
  seat_preference TEXT DEFAULT 'window', -- window, aisle, middle
  needs_window_for_car_seat BOOLEAN DEFAULT false,
  
  -- Cabin class preference
  cabin_class TEXT DEFAULT 'economy', -- economy, premium_economy, business, first
  
  -- Layover preferences
  max_stops INTEGER DEFAULT 0,
  prefer_nonstop BOOLEAN DEFAULT true,
  max_layover_hours INTEGER DEFAULT 4,
  min_connection_minutes INTEGER DEFAULT 60,
  
  -- Time preferences
  max_total_travel_hours INTEGER DEFAULT 24,
  preferred_departure_times TEXT[] DEFAULT '{}',
  red_eye_allowed BOOLEAN DEFAULT false,
  
  -- Family mode
  family_mode BOOLEAN DEFAULT false,
  family_min_connection_minutes INTEGER DEFAULT 90,
  
  -- Alternative airports
  willing_to_drive_further BOOLEAN DEFAULT true,
  max_extra_drive_minutes INTEGER DEFAULT 60,
  min_savings_for_further_airport INTEGER DEFAULT 200,
  
  -- Baggage
  default_checked_bags INTEGER DEFAULT 0,
  carry_on_only BOOLEAN DEFAULT false,
  
  -- Points/cash
  search_mode TEXT DEFAULT 'cash', -- cash, points, hybrid
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.flight_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own flight preferences" 
ON public.flight_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flight preferences" 
ON public.flight_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flight preferences" 
ON public.flight_preferences FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flight preferences" 
ON public.flight_preferences FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_flight_preferences_updated_at
BEFORE UPDATE ON public.flight_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Saved flights table for price alerts
CREATE TABLE public.saved_flights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  outbound_date DATE,
  return_date DATE,
  trip_type TEXT DEFAULT 'roundtrip',
  passengers INTEGER DEFAULT 1,
  cabin_class TEXT DEFAULT 'economy',
  target_price DECIMAL(10,2),
  last_price DECIMAL(10,2),
  price_alert_enabled BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_flights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_flights
CREATE POLICY "Users can view their own saved flights" 
ON public.saved_flights FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved flights" 
ON public.saved_flights FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved flights" 
ON public.saved_flights FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved flights" 
ON public.saved_flights FOR DELETE 
USING (auth.uid() = user_id);

-- Traveler profiles table
CREATE TABLE public.traveler_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  traveler_type TEXT NOT NULL DEFAULT 'adult', -- adult, child, infant, lap_infant
  date_of_birth DATE,
  known_traveler_number TEXT,
  redress_number TEXT,
  passport_country TEXT,
  passport_expiry DATE,
  seat_preference TEXT DEFAULT 'window',
  meal_preference TEXT,
  special_assistance TEXT[],
  frequent_flyer_programs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traveler_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for traveler_profiles
CREATE POLICY "Users can view their own traveler profiles" 
ON public.traveler_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own traveler profiles" 
ON public.traveler_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own traveler profiles" 
ON public.traveler_profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own traveler profiles" 
ON public.traveler_profiles FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for traveler_profiles updated_at
CREATE TRIGGER update_traveler_profiles_updated_at
BEFORE UPDATE ON public.traveler_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for saved_flights updated_at
CREATE TRIGGER update_saved_flights_updated_at
BEFORE UPDATE ON public.saved_flights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();