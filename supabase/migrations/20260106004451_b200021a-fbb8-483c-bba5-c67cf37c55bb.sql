-- Create storage bucket for travel photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-photos', 'travel-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for travel-photos bucket
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'travel-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'travel-photos');

-- Create table for shareable highlight profiles
CREATE TABLE IF NOT EXISTS public.share_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_public BOOLEAN DEFAULT false,
  show_photos BOOLEAN DEFAULT true,
  show_stats BOOLEAN DEFAULT true,
  show_map BOOLEAN DEFAULT true,
  show_wishlist BOOLEAN DEFAULT false,
  custom_headline TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.share_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for share_profiles
CREATE POLICY "Users can manage their own share profile"
ON public.share_profiles FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public share profiles are viewable by everyone"
ON public.share_profiles FOR SELECT
USING (is_public = true);

-- Create index for share token lookup
CREATE INDEX idx_share_profiles_token ON public.share_profiles(share_token);
CREATE INDEX idx_share_profiles_user ON public.share_profiles(user_id);