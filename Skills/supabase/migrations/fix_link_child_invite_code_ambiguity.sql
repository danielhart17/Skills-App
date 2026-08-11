-- Fix ambiguous child_id references in the parent-child linking RPC.

CREATE OR REPLACE FUNCTION public.link_child_invite_code(p_code TEXT)
RETURNS TABLE(
  child_id UUID,
  child_name TEXT,
  child_email TEXT
) AS $$
DECLARE
  v_code TEXT;
  v_code_id UUID;
  v_child_id UUID;
  v_child_name TEXT;
  v_child_email TEXT;
  v_profile_role TEXT;
  v_metadata_role TEXT;
BEGIN
  v_code := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');

  IF length(v_code) < 4 THEN
    RAISE EXCEPTION 'Please enter a valid invite code';
  END IF;

  SELECT p.role::TEXT
  INTO v_profile_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  SELECT auth.jwt() -> 'user_metadata' ->> 'role'
  INTO v_metadata_role;

  IF coalesce(v_profile_role, '') <> 'parent'
    AND coalesce(v_metadata_role, '') <> 'parent' THEN
    RAISE EXCEPTION 'Only parent accounts can link to children. Current profile role is "%".', coalesce(v_profile_role, 'missing');
  END IF;

  SELECT ic.id, ic.child_id
  INTO v_code_id, v_child_id
  FROM public.child_invite_codes ic
  WHERE ic.code = v_code
    AND ic.used_at IS NULL
    AND ic.expires_at > now()
  FOR UPDATE;

  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code. Generate a fresh code from the athlete profile and try again.';
  END IF;

  IF v_child_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot link your parent account to itself';
  END IF;

  SELECT p.full_name, coalesce(p.email, au.email)
  INTO v_child_name, v_child_email
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE au.id = v_child_id;

  UPDATE public.parent_child_links pcl
  SET
    status = 'linked',
    linked_at = now(),
    revoked_at = NULL
  WHERE pcl.parent_id = auth.uid()
    AND pcl.child_id = v_child_id;

  IF NOT FOUND THEN
    INSERT INTO public.parent_child_links (parent_id, child_id, status, linked_at, revoked_at)
    VALUES (auth.uid(), v_child_id, 'linked', now(), NULL);
  END IF;

  UPDATE public.child_invite_codes ic
  SET used_at = now(),
      used_by_parent_id = auth.uid()
  WHERE ic.id = v_code_id;

  RETURN QUERY SELECT v_child_id, v_child_name, v_child_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.link_child_invite_code(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
