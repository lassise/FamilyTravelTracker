-- Add public access policies for shared dashboards

-- Family members: allow public to view when dashboard is shared and show_family_members is enabled
CREATE POLICY "Public can view shared family members"
ON public.family_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM share_profiles
    WHERE share_profiles.user_id = family_members.user_id
      AND share_profiles.is_public = true
      AND share_profiles.show_family_members = true
  )
);

-- Country visit details: allow public to view when dashboard is shared and show_timeline is enabled
CREATE POLICY "Public can view shared visit details"
ON public.country_visit_details
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM share_profiles
    WHERE share_profiles.user_id = country_visit_details.user_id
      AND share_profiles.is_public = true
      AND (share_profiles.show_timeline = true OR share_profiles.show_stats = true)
  )
);

-- Visit family members: allow public to view when dashboard is shared
CREATE POLICY "Public can view shared visit family members"
ON public.visit_family_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM share_profiles
    WHERE share_profiles.user_id = visit_family_members.user_id
      AND share_profiles.is_public = true
  )
);

-- State visits: allow public to view when dashboard is shared and show_stats is enabled
CREATE POLICY "Public can view shared state visits"
ON public.state_visits
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM share_profiles
    WHERE share_profiles.user_id = state_visits.user_id
      AND share_profiles.is_public = true
      AND share_profiles.show_stats = true
  )
);