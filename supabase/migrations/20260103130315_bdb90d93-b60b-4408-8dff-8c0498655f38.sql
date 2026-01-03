-- Add columns for approximate date tracking
ALTER TABLE public.country_visit_details
ADD COLUMN IF NOT EXISTS is_approximate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approximate_month integer CHECK (approximate_month >= 1 AND approximate_month <= 12),
ADD COLUMN IF NOT EXISTS approximate_year integer CHECK (approximate_year >= 1900 AND approximate_year <= 2100),
ADD COLUMN IF NOT EXISTS trip_name text;