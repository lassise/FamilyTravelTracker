-- Data migration: Convert existing single-destination trips to trip_legs
-- This migration creates a trip_leg for each existing trip that has:
-- 1. A destination but no existing trip_legs
-- 2. Start and end dates

-- First, create trip_legs for existing trips that have destination and dates
-- We'll try to match the destination to a country in the countries table

INSERT INTO public.trip_legs (
  trip_id,
  country_id,
  country_name,
  country_code,
  start_date,
  end_date,
  order_index,
  user_id,
  created_at,
  updated_at
)
SELECT 
  t.id as trip_id,
  c.id as country_id,
  COALESCE(c.name, t.destination) as country_name,
  CASE 
    WHEN c.flag ~ '^[A-Z]{2}$' THEN c.flag
    ELSE NULL
  END as country_code,
  t.start_date,
  t.end_date,
  0 as order_index,
  t.user_id,
  NOW() as created_at,
  NOW() as updated_at
FROM public.trips t
LEFT JOIN public.countries c ON (
  -- Try to match destination to country name (case insensitive, partial match)
  LOWER(c.name) = LOWER(t.destination)
  OR LOWER(c.name) LIKE '%' || LOWER(t.destination) || '%'
  OR LOWER(t.destination) LIKE '%' || LOWER(c.name) || '%'
)
WHERE 
  -- Only trips with destination and dates
  t.destination IS NOT NULL 
  AND t.destination != ''
  AND t.start_date IS NOT NULL
  AND t.end_date IS NOT NULL
  -- Only trips that don't already have legs
  AND NOT EXISTS (
    SELECT 1 FROM public.trip_legs tl WHERE tl.trip_id = t.id
  );

-- Add a comment to track the migration
COMMENT ON TABLE public.trip_legs IS 'Stores individual country segments (legs) within a multi-country trip. Existing single-destination trips were migrated on 2026-02-01.';
