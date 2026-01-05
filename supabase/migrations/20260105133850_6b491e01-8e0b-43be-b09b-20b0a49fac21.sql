-- Create junction table for tracking family members on each visit
CREATE TABLE public.visit_family_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES public.country_visit_details(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(visit_id, family_member_id)
);

-- Enable RLS
ALTER TABLE public.visit_family_members ENABLE ROW LEVEL SECURITY;

-- Create user-scoped policies
CREATE POLICY "Users can view own visit family members" 
  ON public.visit_family_members FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visit family members" 
  ON public.visit_family_members FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own visit family members" 
  ON public.visit_family_members FOR DELETE 
  USING (auth.uid() = user_id);