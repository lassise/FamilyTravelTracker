-- Fix SHARED_DATA_EXPOSURE: Add user_id columns and user-scoped RLS policies

-- 1. Add user_id column to family_members
ALTER TABLE public.family_members ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id column to countries
ALTER TABLE public.countries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add user_id column to country_wishlist
ALTER TABLE public.country_wishlist ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Add user_id column to travel_settings
ALTER TABLE public.travel_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Add user_id column to country_visit_details
ALTER TABLE public.country_visit_details ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Add user_id column to city_visits
ALTER TABLE public.city_visits ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop old overly permissive policies for family_members
DROP POLICY IF EXISTS "Authenticated users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can insert family members" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can update family members" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can delete family members" ON public.family_members;

-- Create user-scoped policies for family_members
CREATE POLICY "Users can view own family members" 
  ON public.family_members FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family members" 
  ON public.family_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family members" 
  ON public.family_members FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own family members" 
  ON public.family_members FOR DELETE 
  USING (auth.uid() = user_id);

-- Drop old overly permissive policies for countries
DROP POLICY IF EXISTS "Authenticated users can view countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can insert countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can update countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can delete countries" ON public.countries;

-- Create user-scoped policies for countries
CREATE POLICY "Users can view own countries" 
  ON public.countries FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own countries" 
  ON public.countries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own countries" 
  ON public.countries FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own countries" 
  ON public.countries FOR DELETE 
  USING (auth.uid() = user_id);

-- Drop old overly permissive policies for country_wishlist
DROP POLICY IF EXISTS "Authenticated users can view wishlist" ON public.country_wishlist;
DROP POLICY IF EXISTS "Authenticated users can insert wishlist" ON public.country_wishlist;
DROP POLICY IF EXISTS "Authenticated users can delete wishlist" ON public.country_wishlist;

-- Create user-scoped policies for country_wishlist
CREATE POLICY "Users can view own wishlist" 
  ON public.country_wishlist FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishlist" 
  ON public.country_wishlist FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishlist" 
  ON public.country_wishlist FOR DELETE 
  USING (auth.uid() = user_id);

-- Drop old overly permissive policies for travel_settings
DROP POLICY IF EXISTS "Authenticated users can view travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Authenticated users can insert travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Authenticated users can update travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Authenticated users can delete travel settings" ON public.travel_settings;

-- Create user-scoped policies for travel_settings
CREATE POLICY "Users can view own travel settings" 
  ON public.travel_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own travel settings" 
  ON public.travel_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own travel settings" 
  ON public.travel_settings FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own travel settings" 
  ON public.travel_settings FOR DELETE 
  USING (auth.uid() = user_id);

-- Drop old overly permissive policies for country_visit_details
DROP POLICY IF EXISTS "Authenticated users can view visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can insert visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can update visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can delete visit details" ON public.country_visit_details;

-- Create user-scoped policies for country_visit_details
CREATE POLICY "Users can view own visit details" 
  ON public.country_visit_details FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visit details" 
  ON public.country_visit_details FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visit details" 
  ON public.country_visit_details FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own visit details" 
  ON public.country_visit_details FOR DELETE 
  USING (auth.uid() = user_id);

-- Drop old overly permissive policies for city_visits
DROP POLICY IF EXISTS "Authenticated users can view city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can insert city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can update city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can delete city visits" ON public.city_visits;

-- Create user-scoped policies for city_visits
CREATE POLICY "Users can view own city visits" 
  ON public.city_visits FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own city visits" 
  ON public.city_visits FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own city visits" 
  ON public.city_visits FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own city visits" 
  ON public.city_visits FOR DELETE 
  USING (auth.uid() = user_id);

-- Drop old overly permissive policies for country_visits
DROP POLICY IF EXISTS "Authenticated users can view country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Authenticated users can insert country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Authenticated users can delete country visits" ON public.country_visits;

-- Add user_id to country_visits and create user-scoped policies
ALTER TABLE public.country_visits ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can view own country visits" 
  ON public.country_visits FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own country visits" 
  ON public.country_visits FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own country visits" 
  ON public.country_visits FOR DELETE 
  USING (auth.uid() = user_id);