-- Fix 1: Add missing INSERT policy for profiles table
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Fix 2: Add public access policies for shared profile viewing

-- Allow unauthenticated users to view public share_profiles
CREATE POLICY "Public can view public share profiles"
ON public.share_profiles FOR SELECT
TO public
USING (is_public = true);

-- Allow unauthenticated users to view profiles when shared publicly
CREATE POLICY "Public can view shared profiles"
ON public.profiles FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.share_profiles
    WHERE share_profiles.user_id = profiles.id
    AND share_profiles.is_public = true
  )
);

-- Allow public to view countries when shared and show_map = true
CREATE POLICY "Public can view shared countries"
ON public.countries FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.share_profiles
    WHERE share_profiles.user_id = countries.user_id
    AND share_profiles.is_public = true
    AND share_profiles.show_map = true
  )
);

-- Allow public to view country_visits when shared
CREATE POLICY "Public can view shared visits"
ON public.country_visits FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.share_profiles
    WHERE share_profiles.user_id = country_visits.user_id
    AND share_profiles.is_public = true
    AND share_profiles.show_map = true
  )
);

-- Allow public to view photos when shared and show_photos = true
CREATE POLICY "Public can view shared photos"
ON public.travel_photos FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.share_profiles
    WHERE share_profiles.user_id = travel_photos.user_id
    AND share_profiles.is_public = true
    AND share_profiles.show_photos = true
  )
);

-- Fix 3: Update storage bucket to public and fix storage policies
UPDATE storage.buckets SET public = true WHERE id = 'travel-photos';

-- Drop the existing shared photos policy and recreate with public access
DROP POLICY IF EXISTS "Shared profile photos are viewable" ON storage.objects;

CREATE POLICY "Photos viewable by owner or when shared"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'travel-photos'
  AND (
    -- Owner viewing own photos
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Public viewing shared photos
    EXISTS (
      SELECT 1 FROM public.share_profiles sp
      WHERE sp.user_id::text = (storage.foldername(name))[1]
        AND sp.is_public = true
        AND sp.show_photos = true
    )
  )
);