-- Create country_visit_details table to store detailed visit information per country
CREATE TABLE public.country_visit_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  visit_date date,
  end_date date,
  number_of_days integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create city_visits table to track cities visited within each country
CREATE TABLE public.city_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES public.countries(id) ON DELETE CASCADE NOT NULL,
  city_name text NOT NULL,
  visit_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add home_country column to a settings table for tracking days abroad
CREATE TABLE public.travel_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_country text NOT NULL DEFAULT 'United States',
  home_country_code text NOT NULL DEFAULT 'US',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.country_visit_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (consistent with existing tables)
CREATE POLICY "Public can view visit details" ON public.country_visit_details FOR SELECT USING (true);
CREATE POLICY "Public can insert visit details" ON public.country_visit_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update visit details" ON public.country_visit_details FOR UPDATE USING (true);
CREATE POLICY "Public can delete visit details" ON public.country_visit_details FOR DELETE USING (true);

CREATE POLICY "Public can view city visits" ON public.city_visits FOR SELECT USING (true);
CREATE POLICY "Public can insert city visits" ON public.city_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update city visits" ON public.city_visits FOR UPDATE USING (true);
CREATE POLICY "Public can delete city visits" ON public.city_visits FOR DELETE USING (true);

CREATE POLICY "Public can view travel settings" ON public.travel_settings FOR SELECT USING (true);
CREATE POLICY "Public can insert travel settings" ON public.travel_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update travel settings" ON public.travel_settings FOR UPDATE USING (true);
CREATE POLICY "Public can delete travel settings" ON public.travel_settings FOR DELETE USING (true);

-- Create trigger for updated_at on country_visit_details
CREATE TRIGGER update_country_visit_details_updated_at
BEFORE UPDATE ON public.country_visit_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on travel_settings
CREATE TRIGGER update_travel_settings_updated_at
BEFORE UPDATE ON public.travel_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default travel settings
INSERT INTO public.travel_settings (home_country, home_country_code) VALUES ('United States', 'US');