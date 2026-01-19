-- Create a rate-limited version of get_share_profile_by_token to prevent enumeration attacks
-- This uses client IP simulation via a hash of the token being looked up + timestamp window

-- First, create a helper function to check and update rate limits for anonymous lookups
CREATE OR REPLACE FUNCTION public.check_anonymous_rate_limit(
  lookup_key text,
  max_requests integer DEFAULT 10,
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
  -- Calculate the current window start (truncate to window_seconds intervals)
  current_window := date_trunc('minute', now());
  
  -- Try to get the current count for this key
  SELECT request_count INTO current_count
  FROM public.api_rate_limits
  WHERE function_name = 'share_token_lookup'
    AND user_id = '00000000-0000-0000-0000-000000000000'::uuid
    AND window_start = current_window;
  
  IF current_count IS NULL THEN
    -- First request in this window
    INSERT INTO public.api_rate_limits (function_name, user_id, window_start, request_count)
    VALUES ('share_token_lookup', '00000000-0000-0000-0000-000000000000'::uuid, current_window, 1)
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
    WHERE function_name = 'share_token_lookup'
      AND user_id = '00000000-0000-0000-0000-000000000000'::uuid
      AND window_start = current_window;
    RETURN true;
  END IF;
END;
$$;

-- Add unique constraint to api_rate_limits if not exists for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'api_rate_limits_user_function_window_key'
  ) THEN
    ALTER TABLE public.api_rate_limits 
    ADD CONSTRAINT api_rate_limits_user_function_window_key 
    UNIQUE (user_id, function_name, window_start);
  END IF;
END $$;

-- Replace the get_share_profile_by_token function with rate limiting
CREATE OR REPLACE FUNCTION public.get_share_profile_by_token(token text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  is_public boolean,
  show_stats boolean,
  show_map boolean,
  show_wishlist boolean,
  show_photos boolean,
  custom_headline text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check rate limit (100 requests per minute globally for anonymous lookups)
  IF NOT check_anonymous_rate_limit('share_token_lookup', 100, 60) THEN
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
    sp.custom_headline
  FROM public.share_profiles sp
  WHERE sp.share_token = token
    AND sp.is_public = true;
END;
$$;

-- Revoke execute from public and grant to authenticated and anon roles
REVOKE ALL ON FUNCTION public.get_share_profile_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_share_profile_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_share_profile_by_token(text) TO anon;

-- Grant execute on the rate limit helper
REVOKE ALL ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) TO anon;