-- Create state_visits table for tracking visited states/provinces within countries
CREATE TABLE public.state_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES public.countries(id) ON DELETE CASCADE,
  country_code text NOT NULL, -- ISO 3166-1 alpha-2 (e.g., 'US', 'CA')
  state_code text NOT NULL, -- ISO 3166-2 subdivision code (e.g., 'US-CA', 'CA-ON')
  state_name text NOT NULL,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(state_code, family_member_id)
);

-- Add user_id column for RLS
ALTER TABLE public.state_visits 
  ADD CONSTRAINT state_visits_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.state_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own state visits"
ON public.state_visits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own state visits"
ON public.state_visits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own state visits"
ON public.state_visits
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for state_visits
ALTER PUBLICATION supabase_realtime ADD TABLE public.state_visits;