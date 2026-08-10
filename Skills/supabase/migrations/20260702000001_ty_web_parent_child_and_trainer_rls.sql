-- Allow trainer users to create and manage their own trainer profile.
-- The base schema enables RLS on public.trainers, but only includes public SELECT.

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainer users can create own trainer profile" ON public.trainers;
CREATE POLICY "Trainer users can create own trainer profile"
  ON public.trainers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainer users can update own trainer profile" ON public.trainers;
CREATE POLICY "Trainer users can update own trainer profile"
  ON public.trainers
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainer users can view own trainer profile" ON public.trainers;
CREATE POLICY "Trainer users can view own trainer profile"
  ON public.trainers
  FOR SELECT
  TO authenticated
  USING (
    true
    OR user_id = auth.uid()
  );

-- Ensure trainers can create and manage training events tied to their trainer profile.

ALTER TABLE public.training_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainer users can insert own training events" ON public.training_events;
CREATE POLICY "Trainer users can insert own training events"
  ON public.training_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
        AND p.role IN ('trainer', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainer users can update own training events" ON public.training_events;
CREATE POLICY "Trainer users can update own training events"
  ON public.training_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainer users can delete own training events" ON public.training_events;
CREATE POLICY "Trainer users can delete own training events"
  ON public.training_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- Ensure athletes can generate and read their own parent-link invite codes.
-- Parents still cannot browse invite codes; linking should use the RPC.

ALTER TABLE public.child_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Children can view their own invite codes" ON public.child_invite_codes;
CREATE POLICY "Children can view their own invite codes"
  ON public.child_invite_codes
  FOR SELECT
  TO authenticated
  USING (child_id = auth.uid());

DROP POLICY IF EXISTS "Children can create their own invite codes" ON public.child_invite_codes;
CREATE POLICY "Children can create their own invite codes"
  ON public.child_invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (child_id = auth.uid());

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

-- Clean parent-child linking RPC with a new function name to avoid stale
-- PostgREST signatures for link_parent_to_child_by_code.

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

  UPDATE public.child_invite_codes
  SET used_at = now(),
      used_by_parent_id = auth.uid()
  WHERE id = v_code_id;

  RETURN QUERY SELECT v_child_id, v_child_name, v_child_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.link_child_invite_code(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

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

-- Repair auth profile bootstrap and parent-child linking for existing accounts.
-- Run after the parent-child migrations.

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS public.profiles AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_role public.user_role;
  v_profile public.profiles%ROWTYPE;
BEGIN
  SELECT *
  INTO v_user
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_role := CASE
    WHEN v_user.raw_user_meta_data->>'role' IN ('user', 'athlete', 'parent', 'trainer', 'admin')
      THEN (v_user.raw_user_meta_data->>'role')::public.user_role
    ELSE 'user'::public.user_role
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    v_user.id,
    v_user.email,
    COALESCE(v_user.raw_user_meta_data->>'full_name', v_user.email),
    v_role
  )
  ON CONFLICT (id)
  DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    role = CASE
      WHEN public.profiles.role IS NULL OR public.profiles.role = 'user'::public.user_role
        THEN EXCLUDED.role
      ELSE public.profiles.role
    END
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('user', 'athlete', 'parent', 'trainer', 'admin')
      THEN (NEW.raw_user_meta_data->>'role')::public.user_role
    ELSE 'user'::public.user_role
  END;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.get_linked_children()
RETURNS TABLE(
  child_id UUID,
  child_name TEXT,
  child_email TEXT,
  child_level INTEGER,
  child_xp INTEGER,
  child_streak INTEGER,
  linked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  PERFORM public.ensure_current_user_profile();

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.current_level,
    p.total_xp,
    p.current_streak,
    pcl.linked_at
  FROM public.parent_child_links pcl
  JOIN public.profiles p ON p.id = pcl.child_id
  WHERE pcl.parent_id = auth.uid()
    AND pcl.status = 'linked'
  ORDER BY pcl.linked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_linked_children() TO authenticated;
