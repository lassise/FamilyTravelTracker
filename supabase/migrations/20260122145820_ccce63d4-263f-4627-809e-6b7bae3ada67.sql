-- Fix anonymous rate limiting to never break public sharing when write access is unavailable
-- In some environments anonymous RPCs may run in a read-only transaction; in that case we fail-open.

CREATE OR REPLACE FUNCTION public.check_anonymous_rate_limit(
  lookup_key text,
  max_requests integer DEFAULT 100,
  window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    BEGIN
      INSERT INTO public.api_rate_limits (function_name, user_id, window_start, request_count)
      VALUES (lookup_key, '00000000-0000-0000-0000-000000000000'::uuid, current_window, 1)
      ON CONFLICT (user_id, function_name, window_start)
      DO UPDATE SET request_count = api_rate_limits.request_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Fail-open if writes are blocked (e.g., read-only transaction)
      RETURN true;
    END;

    RETURN true;
  ELSIF current_count >= max_requests THEN
    -- Rate limit exceeded
    RETURN false;
  ELSE
    -- Increment counter
    BEGIN
      UPDATE public.api_rate_limits
      SET request_count = request_count + 1
      WHERE function_name = lookup_key
        AND user_id = '00000000-0000-0000-0000-000000000000'::uuid
        AND window_start = current_window;
    EXCEPTION WHEN OTHERS THEN
      -- Fail-open if writes are blocked
      RETURN true;
    END;

    RETURN true;
  END IF;
END;
$$;

-- Ensure execute remains available
REVOKE ALL ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_anonymous_rate_limit(text, integer, integer) TO anon;
