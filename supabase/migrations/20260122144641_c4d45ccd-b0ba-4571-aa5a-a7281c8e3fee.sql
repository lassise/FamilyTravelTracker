-- Fix the check_anonymous_rate_limit function to properly use the lookup_key parameter
CREATE OR REPLACE FUNCTION public.check_anonymous_rate_limit(
  lookup_key text,
  max_requests integer DEFAULT 100,
  window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_window timestamp with time zone;
  current_count integer;
BEGIN
  -- Calculate the current window start (truncate to minute for simplicity)
  current_window := date_trunc('minute', now());
  
  -- Try to get the current count for this key
  SELECT request_count INTO current_count
  FROM public.api_rate_limits
  WHERE function_name = lookup_key
    AND user_id = '00000000-0000-0000-0000-000000000000'::uuid
    AND window_start = current_window;
  
  IF current_count IS NULL THEN
    -- First request in this window
    INSERT INTO public.api_rate_limits (function_name, user_id, window_start, request_count)
    VALUES (lookup_key, '00000000-0000-0000-0000-000000000000'::uuid, current_window, 1)
    ON CONFLICT (user_id, function_name, window_start) 
    DO UPDATE SET request_count = api_rate_limits.request_count + 1;
    RETURN true;
  ELSIF current_count >= max_requests THEN
    -- Rate limit exceeded
    RETURN false;
  ELSE
    -- Increment counter
    UPDATE public.api_rate_limits
    SET request_count = request_count + 1
    WHERE function_name = lookup_key
      AND user_id = '00000000-0000-0000-0000-000000000000'::uuid
      AND window_start = current_window;
    RETURN true;
  END IF;
END;
$$;

-- Recreate the get_dashboard_share_profile_by_token function with SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_dashboard_share_profile_by_token(text);

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
SECURITY DEFINER
SET search_path = public
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
GRANT EXECUTE ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_share_profile_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_share_profile_by_token(text) TO authenticated;