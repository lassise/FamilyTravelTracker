-- Add accessibility and distance fields to itinerary_items
ALTER TABLE public.itinerary_items
ADD COLUMN IF NOT EXISTS distance_from_previous numeric,
ADD COLUMN IF NOT EXISTS distance_unit text DEFAULT 'km',
ADD COLUMN IF NOT EXISTS travel_time_minutes integer,
ADD COLUMN IF NOT EXISTS recommended_transit_mode text,
ADD COLUMN IF NOT EXISTS transit_details text,
ADD COLUMN IF NOT EXISTS accessibility_notes text,
ADD COLUMN IF NOT EXISTS is_wheelchair_accessible boolean,
ADD COLUMN IF NOT EXISTS stroller_notes text;

-- Add accessibility preferences to trips table
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS needs_wheelchair_access boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_stroller boolean DEFAULT false;