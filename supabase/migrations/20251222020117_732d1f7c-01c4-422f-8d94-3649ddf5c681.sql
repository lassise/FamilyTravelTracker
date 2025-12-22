-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'viewer');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

-- Create family groups table
CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Create family group members table (with roles)
CREATE TABLE public.family_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_group_id, user_id)
);

ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_group_members
    WHERE user_id = _user_id AND family_group_id = _group_id
  );
$$;

-- Security definer function to check group role
CREATE OR REPLACE FUNCTION public.has_group_role(_user_id UUID, _group_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_group_members
    WHERE user_id = _user_id AND family_group_id = _group_id AND role = _role
  );
$$;

-- Family groups RLS policies
CREATE POLICY "Users can view groups they belong to" ON public.family_groups
  FOR SELECT USING (public.is_group_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Users can create groups" ON public.family_groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their groups" ON public.family_groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their groups" ON public.family_groups
  FOR DELETE USING (auth.uid() = owner_id);

-- Family group members RLS policies
CREATE POLICY "Members can view group members" ON public.family_group_members
  FOR SELECT USING (public.is_group_member(auth.uid(), family_group_id));

CREATE POLICY "Owners can manage members" ON public.family_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.family_groups 
      WHERE id = family_group_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups" ON public.family_group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  cover_image TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'upcoming', 'active', 'completed')),
  trip_type TEXT,
  budget_total DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  kids_ages INTEGER[],
  pace_preference TEXT CHECK (pace_preference IN ('relaxed', 'moderate', 'packed')),
  interests TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trips RLS policies
CREATE POLICY "Users can view own trips" ON public.trips
  FOR SELECT USING (
    auth.uid() = user_id OR 
    public.is_group_member(auth.uid(), family_group_id)
  );

CREATE POLICY "Users can create trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- Create itinerary days table
CREATE TABLE public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  title TEXT,
  notes TEXT,
  weather_notes TEXT,
  plan_b TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, day_number)
);

ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;

-- Create itinerary items table
CREATE TABLE public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  time_slot TEXT CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'custom')),
  start_time TIME,
  end_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  location_address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  category TEXT,
  duration_minutes INTEGER,
  cost_estimate DECIMAL(10,2),
  is_kid_friendly BOOLEAN DEFAULT true,
  is_stroller_friendly BOOLEAN,
  requires_reservation BOOLEAN DEFAULT false,
  reservation_info TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- Itinerary days RLS
CREATE POLICY "Users can manage itinerary days via trip" ON public.itinerary_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = trip_id AND (user_id = auth.uid() OR public.is_group_member(auth.uid(), family_group_id))
    )
  );

-- Itinerary items RLS
CREATE POLICY "Users can manage itinerary items via trip" ON public.itinerary_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days d
      JOIN public.trips t ON t.id = d.trip_id
      WHERE d.id = itinerary_day_id AND (t.user_id = auth.uid() OR public.is_group_member(auth.uid(), t.family_group_id))
    )
  );

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('flight', 'hotel', 'car', 'activity', 'restaurant', 'other')),
  title TEXT NOT NULL,
  confirmation_number TEXT,
  provider TEXT,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  location_name TEXT,
  location_address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  cost DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  attachment_urls TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage bookings via trip" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = trip_id AND (user_id = auth.uid() OR public.is_group_member(auth.uid(), family_group_id))
    )
  );

-- Create packing lists table
CREATE TABLE public.packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main List',
  template_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packing_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage packing lists via trip" ON public.packing_lists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = trip_id AND (user_id = auth.uid() OR public.is_group_member(auth.uid(), family_group_id))
    )
  );

-- Create packing items table
CREATE TABLE public.packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id UUID NOT NULL REFERENCES public.packing_lists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  is_packed BOOLEAN DEFAULT false,
  assigned_to TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage packing items via list" ON public.packing_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.packing_lists pl
      JOIN public.trips t ON t.id = pl.trip_id
      WHERE pl.id = packing_list_id AND (t.user_id = auth.uid() OR public.is_group_member(auth.uid(), t.family_group_id))
    )
  );

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  paid_by UUID REFERENCES public.profiles(id),
  expense_date DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage expenses via trip" ON public.expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = trip_id AND (user_id = auth.uid() OR public.is_group_member(auth.uid(), family_group_id))
    )
  );

-- Create trip notes table for collaboration
CREATE TABLE public.trip_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  itinerary_day_id UUID REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  itinerary_item_id UUID REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage notes via trip" ON public.trip_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = trip_id AND (user_id = auth.uid() OR public.is_group_member(auth.uid(), family_group_id))
    )
  );

-- Create saved places table (for favorites/recommendations)
CREATE TABLE public.saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  location_address TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  category TEXT,
  is_kid_friendly BOOLEAN DEFAULT true,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved places" ON public.saved_places
  FOR ALL USING (auth.uid() = user_id);

-- Create emergency info table
CREATE TABLE public.trip_emergency_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  emergency_number TEXT,
  police_number TEXT,
  hospital_name TEXT,
  hospital_address TEXT,
  hospital_phone TEXT,
  pharmacy_name TEXT,
  pharmacy_address TEXT,
  embassy_info TEXT,
  insurance_info TEXT,
  custom_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_emergency_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage emergency info via trip" ON public.trip_emergency_info
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips 
      WHERE id = trip_id AND (user_id = auth.uid() OR public.is_group_member(auth.uid(), family_group_id))
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_family_groups_updated_at BEFORE UPDATE ON public.family_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_itinerary_days_updated_at BEFORE UPDATE ON public.itinerary_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_itinerary_items_updated_at BEFORE UPDATE ON public.itinerary_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trip_notes_updated_at BEFORE UPDATE ON public.trip_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trip_emergency_info_updated_at BEFORE UPDATE ON public.trip_emergency_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();