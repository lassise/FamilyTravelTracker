-- Add country_visits creation to RPC (matching family-travel-tracker working behavior)

CREATE OR REPLACE FUNCTION public.insert_country_visit_detail(
  p_country_id uuid,
  p_trip_name text DEFAULT NULL,
  p_is_approximate boolean DEFAULT false,
  p_approximate_month integer DEFAULT NULL,
  p_approximate_year integer DEFAULT NULL,
  p_visit_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_number_of_days integer DEFAULT 1,
  p_notes text DEFAULT NULL,
  p_family_member_ids uuid[] DEFAULT '{}',
  p_cities text[] DEFAULT '{}'
)
RETURNS public.country_visit_details
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_row public.country_visit_details;
  v_member_id uuid;
  v_city text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = 'P0001';
  END IF;

  INSERT INTO public.country_visit_details (
    country_id, trip_name, is_approximate, approximate_month, approximate_year,
    visit_date, end_date, number_of_days, notes, user_id
  ) VALUES (
    p_country_id, p_trip_name, COALESCE(p_is_approximate, false),
    p_approximate_month, p_approximate_year, p_visit_date, p_end_date,
    COALESCE(p_number_of_days, 1), p_notes, v_user_id
  )
  RETURNING * INTO v_row;

  IF p_family_member_ids IS NOT NULL AND array_length(p_family_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_family_member_ids LOOP
      BEGIN
        INSERT INTO public.visit_family_members (visit_id, family_member_id, user_id)
        VALUES (v_row.id, v_member_id, v_user_id);
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END LOOP;
  END IF;

  IF p_cities IS NOT NULL AND array_length(p_cities, 1) > 0 THEN
    FOREACH v_city IN ARRAY p_cities LOOP
      INSERT INTO public.city_visits (country_id, city_name, user_id)
      VALUES (p_country_id, v_city, v_user_id);
    END LOOP;
  END IF;

  -- CRITICAL: country_visits (matching family-travel-tracker - ensures country shows in list)
  -- Use same members as visit_family_members; caller can pass all members when none selected
  IF p_family_member_ids IS NOT NULL AND array_length(p_family_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_family_member_ids LOOP
      BEGIN
        INSERT INTO public.country_visits (country_id, family_member_id, user_id)
        VALUES (p_country_id, v_member_id, v_user_id);
      EXCEPTION
        WHEN unique_violation THEN NULL;
        WHEN others THEN NULL; -- ignore other errors (e.g. RLS)
      END;
    END LOOP;
  END IF;

  RETURN v_row;
END;
$$;
