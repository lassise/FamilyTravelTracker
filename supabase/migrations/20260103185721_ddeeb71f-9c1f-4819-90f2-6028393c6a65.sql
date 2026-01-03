-- Remove the unique constraint on countries.name to allow multiple users to have the same country
ALTER TABLE public.countries DROP CONSTRAINT IF EXISTS countries_name_key;

-- Add a composite unique constraint for name + user_id so a user can't add the same country twice
ALTER TABLE public.countries ADD CONSTRAINT countries_name_user_id_unique UNIQUE (name, user_id);