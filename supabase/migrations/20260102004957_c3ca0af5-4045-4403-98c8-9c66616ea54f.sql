-- Drop all existing public policies on travel-related tables
DROP POLICY IF EXISTS "Public can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Public can insert family members" ON public.family_members;
DROP POLICY IF EXISTS "Public can update family members" ON public.family_members;
DROP POLICY IF EXISTS "Public can delete family members" ON public.family_members;

DROP POLICY IF EXISTS "Public can view countries" ON public.countries;
DROP POLICY IF EXISTS "Public can insert countries" ON public.countries;
DROP POLICY IF EXISTS "Public can update countries" ON public.countries;
DROP POLICY IF EXISTS "Public can delete countries" ON public.countries;

DROP POLICY IF EXISTS "Public can view country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Public can insert country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Public can delete country visits" ON public.country_visits;

DROP POLICY IF EXISTS "Public can view visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Public can insert visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Public can update visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Public can delete visit details" ON public.country_visit_details;

DROP POLICY IF EXISTS "Public can view city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Public can insert city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Public can update city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Public can delete city visits" ON public.city_visits;

DROP POLICY IF EXISTS "Public can view wishlist" ON public.country_wishlist;
DROP POLICY IF EXISTS "Public can insert wishlist" ON public.country_wishlist;
DROP POLICY IF EXISTS "Public can delete wishlist" ON public.country_wishlist;

DROP POLICY IF EXISTS "Public can view travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Public can insert travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Public can update travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Public can delete travel settings" ON public.travel_settings;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create new authenticated-only policies for family_members
CREATE POLICY "Authenticated users can view family members" ON public.family_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert family members" ON public.family_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update family members" ON public.family_members
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete family members" ON public.family_members
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create new authenticated-only policies for countries
CREATE POLICY "Authenticated users can view countries" ON public.countries
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert countries" ON public.countries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update countries" ON public.countries
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete countries" ON public.countries
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create new authenticated-only policies for country_visits
CREATE POLICY "Authenticated users can view country visits" ON public.country_visits
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert country visits" ON public.country_visits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete country visits" ON public.country_visits
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create new authenticated-only policies for country_visit_details
CREATE POLICY "Authenticated users can view visit details" ON public.country_visit_details
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert visit details" ON public.country_visit_details
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update visit details" ON public.country_visit_details
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete visit details" ON public.country_visit_details
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create new authenticated-only policies for city_visits
CREATE POLICY "Authenticated users can view city visits" ON public.city_visits
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert city visits" ON public.city_visits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update city visits" ON public.city_visits
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete city visits" ON public.city_visits
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create new authenticated-only policies for country_wishlist
CREATE POLICY "Authenticated users can view wishlist" ON public.country_wishlist
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert wishlist" ON public.country_wishlist
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete wishlist" ON public.country_wishlist
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Create new authenticated-only policies for travel_settings
CREATE POLICY "Authenticated users can view travel settings" ON public.travel_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert travel settings" ON public.travel_settings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update travel settings" ON public.travel_settings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete travel settings" ON public.travel_settings
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Fix profiles table - users can only view their own profile (not all profiles)
-- Keep the existing "Users can view own profile" policy, just remove the public one