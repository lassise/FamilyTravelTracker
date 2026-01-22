-- Fix public dashboard data visibility: allow required reads when sharing stats/countries/memories (not only map)

-- countries
DROP POLICY IF EXISTS "Public can view shared countries" ON public.countries;
CREATE POLICY "Public can view shared countries"
ON public.countries
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.share_profiles sp
    WHERE sp.user_id = countries.user_id
      AND sp.is_public = true
      AND (
        sp.show_stats = true
        OR sp.show_map = true
        OR sp.show_countries = true
        OR sp.show_timeline = true
        OR sp.show_photos = true
      )
  )
);

-- country_visits (needed to mark countries as visited)
DROP POLICY IF EXISTS "Public can view shared visits" ON public.country_visits;
CREATE POLICY "Public can view shared visits"
ON public.country_visits
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.share_profiles sp
    WHERE sp.user_id = country_visits.user_id
      AND sp.is_public = true
      AND (
        sp.show_stats = true
        OR sp.show_map = true
        OR sp.show_countries = true
        OR sp.show_timeline = true
      )
  )
);

-- family_members (needed to render visited-by and per-member stats when sharing hero/countries)
DROP POLICY IF EXISTS "Public can view shared family members" ON public.family_members;
CREATE POLICY "Public can view shared family members"
ON public.family_members
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.share_profiles sp
    WHERE sp.user_id = family_members.user_id
      AND sp.is_public = true
      AND (
        sp.show_stats = true
        OR sp.show_map = true
        OR sp.show_countries = true
        OR sp.show_timeline = true
      )
  )
);
