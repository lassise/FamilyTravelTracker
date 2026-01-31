-- FIX: Reset RLS policies to match working family-travel-tracker
-- The working version uses USING (true) for all operations
-- This allows the SELECT query to return data after RPC inserts

-- ============================================
-- country_visit_details - CRITICAL FIX
-- ============================================
DROP POLICY IF EXISTS "Users can view own visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Users can insert own visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Users can update own visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Users can delete own visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can view visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can insert visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can update visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can delete visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Public can view visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Public can insert visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Public can update visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Public can delete visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Allow all select on visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Allow all insert on visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Allow all update on visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Allow all delete on visit details" ON public.country_visit_details;

-- Create permissive policies (matching working version)
CREATE POLICY "Public can view visit details" ON public.country_visit_details 
  FOR SELECT USING (true);
CREATE POLICY "Public can insert visit details" ON public.country_visit_details 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update visit details" ON public.country_visit_details 
  FOR UPDATE USING (true);
CREATE POLICY "Public can delete visit details" ON public.country_visit_details 
  FOR DELETE USING (true);

-- ============================================
-- city_visits - same fix
-- ============================================
DROP POLICY IF EXISTS "Users can view own city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Users can insert own city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Users can update own city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Users can delete own city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can view city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can insert city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can update city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can delete city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Public can view city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Public can insert city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Public can update city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Public can delete city visits" ON public.city_visits;

CREATE POLICY "Public can view city visits" ON public.city_visits 
  FOR SELECT USING (true);
CREATE POLICY "Public can insert city visits" ON public.city_visits 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update city visits" ON public.city_visits 
  FOR UPDATE USING (true);
CREATE POLICY "Public can delete city visits" ON public.city_visits 
  FOR DELETE USING (true);

-- ============================================
-- visit_family_members - same fix
-- ============================================
DROP POLICY IF EXISTS "Users can view own visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Users can insert own visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Users can delete own visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Authenticated users can view visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Authenticated users can insert visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Authenticated users can delete visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Public can view visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Public can insert visit family members" ON public.visit_family_members;
DROP POLICY IF EXISTS "Public can delete visit family members" ON public.visit_family_members;

CREATE POLICY "Public can view visit family members" ON public.visit_family_members 
  FOR SELECT USING (true);
CREATE POLICY "Public can insert visit family members" ON public.visit_family_members 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can delete visit family members" ON public.visit_family_members 
  FOR DELETE USING (true);

-- ============================================
-- travel_settings - same fix
-- ============================================
DROP POLICY IF EXISTS "Users can view own travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Users can insert own travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Users can update own travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Users can delete own travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Public can view travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Public can insert travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Public can update travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Public can delete travel settings" ON public.travel_settings;

CREATE POLICY "Public can view travel settings" ON public.travel_settings 
  FOR SELECT USING (true);
CREATE POLICY "Public can insert travel settings" ON public.travel_settings 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update travel settings" ON public.travel_settings 
  FOR UPDATE USING (true);
CREATE POLICY "Public can delete travel settings" ON public.travel_settings 
  FOR DELETE USING (true);
