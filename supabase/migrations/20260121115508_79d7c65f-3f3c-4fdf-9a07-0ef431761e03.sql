-- Add more granular sharing permissions to share_profiles table
ALTER TABLE public.share_profiles
ADD COLUMN IF NOT EXISTS show_countries boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_cities boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_achievements boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_streaks boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_timeline boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_family_members boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_travel_dna boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS show_heatmap boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS theme_color text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS allow_downloads boolean NOT NULL DEFAULT false;