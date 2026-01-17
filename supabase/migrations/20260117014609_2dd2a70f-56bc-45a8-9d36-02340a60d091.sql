-- Create a secure function to join a family group using an invite code
-- This function validates the invite code and adds the user as a member
-- without exposing the ability to enumerate invite codes

CREATE OR REPLACE FUNCTION public.join_family_group_by_invite_code(
  _invite_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _group_id UUID;
  _group_name TEXT;
  _existing_member BOOLEAN;
BEGIN
  -- Get the current user
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Find the group by invite code (case-insensitive for better UX)
  SELECT id, name INTO _group_id, _group_name
  FROM public.family_groups
  WHERE LOWER(invite_code) = LOWER(_invite_code);
  
  -- Return generic error to prevent enumeration attacks
  IF _group_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;
  
  -- Check if user is already a member
  SELECT EXISTS (
    SELECT 1 FROM public.family_group_members
    WHERE user_id = _user_id AND family_group_id = _group_id
  ) INTO _existing_member;
  
  IF _existing_member THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this group');
  END IF;
  
  -- Add user as a member with 'member' role
  INSERT INTO public.family_group_members (user_id, family_group_id, role)
  VALUES (_user_id, _group_id, 'member');
  
  RETURN json_build_object(
    'success', true, 
    'group_id', _group_id,
    'group_name', _group_name,
    'message', 'Successfully joined the group'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this group');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'An error occurred while joining the group');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_family_group_by_invite_code(TEXT) TO authenticated;

-- Revoke execute from anon to prevent unauthenticated access
REVOKE EXECUTE ON FUNCTION public.join_family_group_by_invite_code(TEXT) FROM anon;

-- Add a comment explaining the security design
COMMENT ON FUNCTION public.join_family_group_by_invite_code IS 
'Securely joins a user to a family group using an invite code. 
This function prevents invite code enumeration by returning a generic error 
for invalid codes and requires authentication. The invite code lookup 
bypasses RLS (via SECURITY DEFINER) only for the purpose of joining, 
without exposing group details until the user is a member.';