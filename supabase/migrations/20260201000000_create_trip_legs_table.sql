-- Create trip_legs table for multi-country trip support
-- Each leg represents a country segment within a trip

CREATE TABLE public.trip_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  country_name text NOT NULL,
  country_code text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  number_of_days integer GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  order_index integer NOT NULL DEFAULT 0,
  cities text[],
  notes text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add comment for documentation
COMMENT ON TABLE public.trip_legs IS 'Stores individual country segments (legs) within a multi-country trip';
COMMENT ON COLUMN public.trip_legs.order_index IS 'Order of this leg within the trip (0-based)';
COMMENT ON COLUMN public.trip_legs.number_of_days IS 'Auto-calculated from end_date - start_date + 1';

-- Create indexes for common queries
CREATE INDEX idx_trip_legs_trip_id ON public.trip_legs(trip_id);
CREATE INDEX idx_trip_legs_country_id ON public.trip_legs(country_id);
CREATE INDEX idx_trip_legs_country_name ON public.trip_legs(country_name);
CREATE INDEX idx_trip_legs_user_id ON public.trip_legs(user_id);
CREATE INDEX idx_trip_legs_dates ON public.trip_legs(start_date, end_date);

-- Enable Row Level Security
ALTER TABLE public.trip_legs ENABLE ROW LEVEL SECURITY;

-- RLS policies (permissive, matching existing pattern in the codebase)
CREATE POLICY "Public can view trip legs" ON public.trip_legs 
  FOR SELECT USING (true);

CREATE POLICY "Public can insert trip legs" ON public.trip_legs 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update trip legs" ON public.trip_legs 
  FOR UPDATE USING (true);

CREATE POLICY "Public can delete trip legs" ON public.trip_legs 
  FOR DELETE USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_trip_legs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trip_legs_updated_at
  BEFORE UPDATE ON public.trip_legs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_legs_updated_at();
