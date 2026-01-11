-- Create rate limiting table for Edge Functions
CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, function_name)
);

-- Create index for efficient lookups
CREATE INDEX idx_rate_limits_user_function ON public.api_rate_limits(user_id, function_name);
CREATE INDEX idx_rate_limits_window ON public.api_rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own rate limit data
CREATE POLICY "Users can view own rate limits"
ON public.api_rate_limits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow service role to manage rate limits (Edge Functions use service role)
CREATE POLICY "Service role can manage rate limits"
ON public.api_rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add function to clean old rate limit records (older than 2 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE window_start < now() - INTERVAL '2 hours';
END;
$$;