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
