-- Fix 403 on travel_goals insert: add permissive RLS policies

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can view own travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Users can insert own travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Users can update own travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Users can delete own travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Authenticated users can view travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Authenticated users can insert travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Authenticated users can update travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Authenticated users can delete travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Public can view travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Public can insert travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Public can update travel goals" ON public.travel_goals;
DROP POLICY IF EXISTS "Public can delete travel goals" ON public.travel_goals;

-- Create permissive policies (matching working version pattern)
CREATE POLICY "Public can view travel goals" ON public.travel_goals 
  FOR SELECT USING (true);
CREATE POLICY "Public can insert travel goals" ON public.travel_goals 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update travel goals" ON public.travel_goals 
  FOR UPDATE USING (true);
CREATE POLICY "Public can delete travel goals" ON public.travel_goals 
  FOR DELETE USING (true);
