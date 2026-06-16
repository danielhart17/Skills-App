-- Fix parent-child invite linking RPC compatibility and code normalization.
-- This migration is safe to run after add_parent_child_system.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS public.link_parent_to_child_by_code(TEXT);

CREATE OR REPLACE FUNCTION public.link_parent_to_child_by_code(p_code TEXT)
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
    RAISE EXCEPTION 'Only parent accounts can link to children';
  END IF;

  SELECT ic.id, ic.child_id
  INTO v_code_id, v_child_id
  FROM public.child_invite_codes ic
  WHERE ic.code = v_code
    AND ic.used_at IS NULL
    AND ic.expires_at > now()
  FOR UPDATE;

  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  IF v_child_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot link your account to itself';
  END IF;

  SELECT p.full_name, coalesce(p.email, au.email)
  INTO v_child_name, v_child_email
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE au.id = v_child_id;

  INSERT INTO public.parent_child_links (parent_id, child_id, status, linked_at, revoked_at)
  VALUES (auth.uid(), v_child_id, 'linked', now(), NULL)
  ON CONFLICT (parent_id, child_id)
  DO UPDATE SET
    status = 'linked',
    linked_at = now(),
    revoked_at = NULL;

  UPDATE public.child_invite_codes
  SET used_at = now(),
      used_by_parent_id = auth.uid()
  WHERE id = v_code_id;

  RETURN QUERY SELECT v_child_id, v_child_name, v_child_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP FUNCTION IF EXISTS public.create_child_invite_code(UUID);

CREATE OR REPLACE FUNCTION public.create_child_invite_code(p_child_id UUID)
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  IF p_child_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only create invite codes for your own athlete account';
  END IF;

  RETURN QUERY SELECT * FROM public.create_child_invite_code();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.create_child_invite_code()
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_profile_role TEXT;
  v_metadata_role TEXT;
BEGIN
  SELECT p.role::TEXT
  INTO v_profile_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  SELECT auth.jwt() -> 'user_metadata' ->> 'role'
  INTO v_metadata_role;

  IF coalesce(v_profile_role, '') NOT IN ('user', 'athlete')
    AND coalesce(v_metadata_role, '') NOT IN ('user', 'athlete') THEN
    RAISE EXCEPTION 'Only athlete accounts can create invite codes';
  END IF;

  LOOP
    v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.child_invite_codes ic WHERE ic.code = v_code
    );
  END LOOP;

  v_expires_at := now() + INTERVAL '15 minutes';

  UPDATE public.child_invite_codes
  SET expires_at = now()
  WHERE child_id = auth.uid()
    AND used_at IS NULL
    AND expires_at > now();

  INSERT INTO public.child_invite_codes (child_id, code, expires_at)
  VALUES (auth.uid(), v_code, v_expires_at);

  RETURN QUERY SELECT v_code, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.link_parent_to_child_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_child_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_child_invite_code(UUID) TO authenticated;
