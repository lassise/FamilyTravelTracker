-- Add dashboard_share_token column to share_profiles table
ALTER TABLE public.share_profiles
ADD COLUMN IF NOT EXISTS dashboard_share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Create index for dashboard share token lookup
CREATE INDEX IF NOT EXISTS idx_share_profiles_dashboard_token ON public.share_profiles(dashboard_share_token);

-- Update the get_share_profile_by_token function to also support dashboard tokens
-- We'll create a separate function for dashboard lookups
CREATE OR REPLACE FUNCTION public.get_dashboard_share_profile_by_token(token text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  is_public boolean,
  show_stats boolean,
  show_map boolean,
  show_wishlist boolean,
  show_photos boolean,
  show_countries boolean,
  show_cities boolean,
  show_achievements boolean,
  show_streaks boolean,
  show_timeline boolean,
  show_family_members boolean,
  show_travel_dna boolean,
  show_heatmap boolean,
  allow_downloads boolean,
  custom_headline text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check rate limit (100 requests per minute globally for anonymous lookups)
  IF NOT check_anonymous_rate_limit('dashboard_token_lookup', 100, 60) THEN
    -- Return empty result when rate limited (don't reveal rate limiting)
    RETURN;
  END IF;

  -- Validate token format (must be 32 hex characters)
  IF token IS NULL OR length(token) != 32 OR token !~ '^[a-f0-9]+$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    sp.id,
    sp.user_id,
    sp.is_public,
    sp.show_stats,
    sp.show_map,
    sp.show_wishlist,
    sp.show_photos,
    sp.show_countries,
    sp.show_cities,
    sp.show_achievements,
    sp.show_streaks,
    sp.show_timeline,
    sp.show_family_members,
    sp.show_travel_dna,
    sp.show_heatmap,
    sp.allow_downloads,
    sp.custom_headline
  FROM public.share_profiles sp
  WHERE sp.dashboard_share_token = token
    AND sp.is_public = true;
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public.get_dashboard_share_profile_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_share_profile_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_share_profile_by_token(text) TO anon;
