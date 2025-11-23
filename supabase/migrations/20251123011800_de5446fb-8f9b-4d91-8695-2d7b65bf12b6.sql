-- Enable realtime for family_members table
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;

-- Enable realtime for countries table
ALTER PUBLICATION supabase_realtime ADD TABLE public.countries;

-- Enable realtime for country_visits table
ALTER PUBLICATION supabase_realtime ADD TABLE public.country_visits;