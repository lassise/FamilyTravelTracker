-- Add distance_unit column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN distance_unit TEXT DEFAULT 'miles' CHECK (distance_unit IN ('miles', 'kilometers'));