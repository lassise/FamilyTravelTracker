-- =====================================================
-- CRITICAL SECURITY FIX: Drop overly permissive RLS policies
-- =====================================================

-- 1. Drop any remaining public profiles policy (issue: profiles_email_exposure)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2. Drop public share_profiles policy that exposes share_token (issue: share_token_exposure)
DROP POLICY IF EXISTS "Public share profiles are viewable by everyone" ON public.share_profiles;

-- 3. Drop ALL "Authenticated users can" policies that override user-scoped policies
-- (issue: user_scoped_policies_too_broad)

-- family_members table
DROP POLICY IF EXISTS "Authenticated users can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can insert family members" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can update family members" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can delete family members" ON public.family_members;

-- countries table
DROP POLICY IF EXISTS "Authenticated users can view countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can insert countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can update countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can delete countries" ON public.countries;

-- country_visits table
DROP POLICY IF EXISTS "Authenticated users can view country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Authenticated users can insert country visits" ON public.country_visits;
DROP POLICY IF EXISTS "Authenticated users can delete country visits" ON public.country_visits;

-- country_visit_details table
DROP POLICY IF EXISTS "Authenticated users can view visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can insert visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can update visit details" ON public.country_visit_details;
DROP POLICY IF EXISTS "Authenticated users can delete visit details" ON public.country_visit_details;

-- city_visits table
DROP POLICY IF EXISTS "Authenticated users can view city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can insert city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can update city visits" ON public.city_visits;
DROP POLICY IF EXISTS "Authenticated users can delete city visits" ON public.city_visits;

-- country_wishlist table
DROP POLICY IF EXISTS "Authenticated users can view wishlist" ON public.country_wishlist;
DROP POLICY IF EXISTS "Authenticated users can insert wishlist" ON public.country_wishlist;
DROP POLICY IF EXISTS "Authenticated users can delete wishlist" ON public.country_wishlist;

-- travel_settings table
DROP POLICY IF EXISTS "Authenticated users can view travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Authenticated users can insert travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Authenticated users can update travel settings" ON public.travel_settings;
DROP POLICY IF EXISTS "Authenticated users can delete travel settings" ON public.travel_settings;

-- travel_preferences table (also needs cleanup)
DROP POLICY IF EXISTS "Authenticated users can view travel preferences" ON public.travel_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert travel preferences" ON public.travel_preferences;
DROP POLICY IF EXISTS "Authenticated users can update travel preferences" ON public.travel_preferences;
DROP POLICY IF EXISTS "Authenticated users can delete travel preferences" ON public.travel_preferences;

-- travel_photos table
DROP POLICY IF EXISTS "Authenticated users can view travel photos" ON public.travel_photos;
DROP POLICY IF EXISTS "Authenticated users can insert travel photos" ON public.travel_photos;
DROP POLICY IF EXISTS "Authenticated users can update travel photos" ON public.travel_photos;
DROP POLICY IF EXISTS "Authenticated users can delete travel photos" ON public.travel_photos;

-- 4. Fix storage bucket security (issue: travel_photos_public)
-- Make bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'travel-photos';

-- Drop overly permissive storage policy
DROP POLICY IF EXISTS "Photos are publicly viewable" ON storage.objects;

-- Create proper user-scoped storage SELECT policy
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'travel-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy for shared profile photo access
CREATE POLICY "Shared profile photos are viewable"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'travel-photos'
  AND EXISTS (
    SELECT 1 FROM public.share_profiles sp
    WHERE sp.user_id::text = (storage.foldername(name))[1]
      AND sp.is_public = true
      AND sp.show_photos = true
  )
);