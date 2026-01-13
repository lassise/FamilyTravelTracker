-- Add amenity preference fields to flight_preferences table
ALTER TABLE public.flight_preferences
ADD COLUMN IF NOT EXISTS entertainment_seatback TEXT DEFAULT 'nice_to_have',
ADD COLUMN IF NOT EXISTS entertainment_mobile TEXT DEFAULT 'nice_to_have',
ADD COLUMN IF NOT EXISTS usb_charging TEXT DEFAULT 'nice_to_have',
ADD COLUMN IF NOT EXISTS legroom_preference TEXT DEFAULT 'nice_to_have',
ADD COLUMN IF NOT EXISTS min_legroom_inches INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.flight_preferences.entertainment_seatback IS 'Priority for seatback entertainment: none, nice_to_have, must_have';
COMMENT ON COLUMN public.flight_preferences.entertainment_mobile IS 'Priority for mobile/streaming entertainment: none, nice_to_have, must_have';
COMMENT ON COLUMN public.flight_preferences.usb_charging IS 'Priority for USB/power outlets: none, nice_to_have, must_have';
COMMENT ON COLUMN public.flight_preferences.legroom_preference IS 'Priority for above-average legroom: none, nice_to_have, must_have';
COMMENT ON COLUMN public.flight_preferences.min_legroom_inches IS 'Minimum legroom in inches (optional specific requirement)';