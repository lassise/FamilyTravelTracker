-- Ensure travel_settings table exists (fixes 404 when table missing from schema)
CREATE TABLE IF NOT EXISTS public.travel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_country text NOT NULL DEFAULT 'United States',
  home_country_code text NOT NULL DEFAULT 'US',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.travel_settings ENABLE ROW LEVEL SECURITY;

-- Policies: create permissive ones if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'travel_settings' LIMIT 1) THEN
    CREATE POLICY "Public can view travel settings" ON public.travel_settings FOR SELECT USING (true);
    CREATE POLICY "Public can insert travel settings" ON public.travel_settings FOR INSERT WITH CHECK (true);
    CREATE POLICY "Public can update travel settings" ON public.travel_settings FOR UPDATE USING (true);
    CREATE POLICY "Public can delete travel settings" ON public.travel_settings FOR DELETE USING (true);
  END IF;
END $$;

-- Default row
INSERT INTO public.travel_settings (home_country, home_country_code)
SELECT 'United States', 'US'
WHERE NOT EXISTS (SELECT 1 FROM public.travel_settings LIMIT 1);
