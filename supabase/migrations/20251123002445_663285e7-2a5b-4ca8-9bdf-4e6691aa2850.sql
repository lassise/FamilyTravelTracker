-- Create family_members table
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  avatar text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create countries table
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  flag text NOT NULL,
  continent text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create country_visits table (many-to-many relationship)
CREATE TABLE public.country_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES public.countries(id) ON DELETE CASCADE,
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(country_id, family_member_id)
);

-- Enable Row Level Security
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_visits ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (anyone can read/write)
-- This is a family app for Instagram, so making it public for simplicity
CREATE POLICY "Public can view family members"
  ON public.family_members FOR SELECT
  USING (true);

CREATE POLICY "Public can insert family members"
  ON public.family_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update family members"
  ON public.family_members FOR UPDATE
  USING (true);

CREATE POLICY "Public can delete family members"
  ON public.family_members FOR DELETE
  USING (true);

CREATE POLICY "Public can view countries"
  ON public.countries FOR SELECT
  USING (true);

CREATE POLICY "Public can insert countries"
  ON public.countries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update countries"
  ON public.countries FOR UPDATE
  USING (true);

CREATE POLICY "Public can delete countries"
  ON public.countries FOR DELETE
  USING (true);

CREATE POLICY "Public can view country visits"
  ON public.country_visits FOR SELECT
  USING (true);

CREATE POLICY "Public can insert country visits"
  ON public.country_visits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can delete country visits"
  ON public.country_visits FOR DELETE
  USING (true);

-- Insert initial family members
INSERT INTO public.family_members (name, role, avatar, color) VALUES
  ('Mom', 'Chief Planner', '👩', 'bg-gradient-to-r from-primary to-primary/60'),
  ('Dad', 'Adventure Seeker', '👨', 'bg-gradient-to-r from-secondary to-secondary/60'),
  ('Alex', 'Young Explorer', '🧒', 'bg-gradient-to-r from-accent to-accent/60'),
  ('Sophie', 'Culture Enthusiast', '👧', 'bg-gradient-to-r from-primary to-secondary');

-- Insert initial countries
INSERT INTO public.countries (name, flag, continent) VALUES
  ('Japan', '🇯🇵', 'Asia'),
  ('France', '🇫🇷', 'Europe'),
  ('Thailand', '🇹🇭', 'Asia'),
  ('Italy', '🇮🇹', 'Europe'),
  ('Australia', '🇦🇺', 'Oceania'),
  ('Spain', '🇪🇸', 'Europe'),
  ('USA', '🇺🇸', 'North America'),
  ('Canada', '🇨🇦', 'North America');