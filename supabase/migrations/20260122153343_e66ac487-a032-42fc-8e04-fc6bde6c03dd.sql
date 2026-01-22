
-- Fix the ambiguous column reference by using a different parameter name
DROP FUNCTION IF EXISTS public.get_shared_dashboard_data(text);

CREATE OR REPLACE FUNCTION public.get_shared_dashboard_data(p_share_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  share_record record;
  owner_id uuid;
BEGIN
  -- Validate token format (32 hex characters)
  IF p_share_token IS NULL OR length(p_share_token) != 32 OR p_share_token !~ '^[a-f0-9]+$' THEN
    RETURN json_build_object('error', 'invalid_token', 'message', 'Invalid share link');
  END IF;

  -- Get share profile
  SELECT 
    sp.id,
    sp.user_id,
    sp.is_public,
    sp.show_stats,
    sp.show_map,
    sp.show_countries,
    sp.show_photos,
    sp.show_timeline,
    sp.show_family_members,
    sp.show_achievements,
    sp.show_wishlist
  INTO share_record
  FROM public.share_profiles sp
  WHERE sp.dashboard_share_token = p_share_token
    AND sp.is_public = true;

  IF share_record IS NULL THEN
    RETURN json_build_object('error', 'not_found', 'message', 'Dashboard not found or is private');
  END IF;

  owner_id := share_record.user_id;

  -- Build complete response
  SELECT json_build_object(
    'success', true,
    'shareSettings', json_build_object(
      'show_stats', share_record.show_stats,
      'show_map', share_record.show_map,
      'show_countries', share_record.show_countries,
      'show_photos', share_record.show_photos,
      'show_timeline', share_record.show_timeline,
      'show_family_members', share_record.show_family_members,
      'show_achievements', share_record.show_achievements,
      'show_wishlist', share_record.show_wishlist
    ),
    'profile', (
      SELECT json_build_object(
        'full_name', p.full_name,
        'home_country', p.home_country
      )
      FROM public.profiles p
      WHERE p.id = owner_id
    ),
    'countries', COALESCE((
      SELECT json_agg(json_build_object(
        'id', c.id,
        'name', c.name,
        'flag', c.flag,
        'continent', c.continent
      ))
      FROM public.countries c
      WHERE c.user_id = owner_id
    ), '[]'::json),
    'countryVisits', COALESCE((
      SELECT json_agg(json_build_object(
        'country_id', cv.country_id,
        'family_member_id', cv.family_member_id
      ))
      FROM public.country_visits cv
      WHERE cv.user_id = owner_id
    ), '[]'::json),
    'familyMembers', CASE 
      WHEN share_record.show_family_members THEN COALESCE((
        SELECT json_agg(json_build_object(
          'id', fm.id,
          'name', fm.name,
          'role', fm.role,
          'avatar', fm.avatar,
          'color', fm.color
        ))
        FROM public.family_members fm
        WHERE fm.user_id = owner_id
      ), '[]'::json)
      ELSE '[]'::json
    END,
    'visitDetails', COALESCE((
      SELECT json_agg(json_build_object(
        'id', cvd.id,
        'country_id', cvd.country_id,
        'visit_date', cvd.visit_date,
        'approximate_year', cvd.approximate_year,
        'approximate_month', cvd.approximate_month,
        'is_approximate', cvd.is_approximate,
        'trip_name', cvd.trip_name,
        'highlight', cvd.highlight
      ) ORDER BY cvd.visit_date DESC NULLS LAST)
      FROM public.country_visit_details cvd
      WHERE cvd.user_id = owner_id
    ), '[]'::json),
    'visitFamilyMembers', COALESCE((
      SELECT json_agg(json_build_object(
        'visit_id', vfm.visit_id,
        'family_member_id', vfm.family_member_id
      ))
      FROM public.visit_family_members vfm
      WHERE vfm.user_id = owner_id
    ), '[]'::json),
    'stateVisits', COALESCE((
      SELECT json_agg(json_build_object(
        'id', sv.id,
        'state_code', sv.state_code,
        'state_name', sv.state_name,
        'country_code', sv.country_code,
        'family_member_id', sv.family_member_id
      ))
      FROM public.state_visits sv
      WHERE sv.user_id = owner_id
    ), '[]'::json),
    'photos', CASE 
      WHEN share_record.show_photos THEN COALESCE((
        SELECT json_agg(json_build_object(
          'id', tp.id,
          'photo_url', tp.photo_url,
          'caption', tp.caption,
          'country_id', tp.country_id,
          'taken_at', tp.taken_at
        ) ORDER BY tp.taken_at DESC NULLS LAST)
        FROM public.travel_photos tp
        WHERE tp.user_id = owner_id
      ), '[]'::json)
      ELSE '[]'::json
    END,
    'wishlist', CASE 
      WHEN share_record.show_wishlist THEN COALESCE((
        SELECT json_agg(json_build_object(
          'country_id', cw.country_id
        ))
        FROM public.country_wishlist cw
        WHERE cw.user_id = owner_id
      ), '[]'::json)
      ELSE '[]'::json
    END
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_shared_dashboard_data(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_dashboard_data(text) TO authenticated;
