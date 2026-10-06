CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NULL OR NEW.role NOT IN ('user', 'athlete', 'parent', 'trainer', 'coach') THEN
      NEW.role := 'user';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    IF (OLD.role IS NULL OR OLD.role = 'user')
       AND NEW.role IN ('athlete', 'parent', 'trainer', 'coach') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Only an admin can change a user role'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_guard ON public.profiles;
CREATE TRIGGER profiles_role_guard
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_affirmed BOOLEAN;
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('user', 'athlete', 'parent', 'trainer', 'coach')
      THEN (NEW.raw_user_meta_data->>'role')::public.user_role
    ELSE 'user'::public.user_role
  END;

  v_affirmed := COALESCE(
    (NEW.raw_user_meta_data->>'trainer_safety_affirmed')::boolean,
    false
  );

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    phone,
    instagram_url,
    social_media,
    website,
    trainer_experience_summary,
    trainer_safety_affirmed_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'instagram_url', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'social_media', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'website', '')), ''),
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'trainer_experience_summary', '')), ''),
    CASE WHEN v_role = 'trainer' AND v_affirmed THEN now() ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    instagram_url = COALESCE(EXCLUDED.instagram_url, public.profiles.instagram_url),
    social_media = COALESCE(EXCLUDED.social_media, public.profiles.social_media),
    website = COALESCE(EXCLUDED.website, public.profiles.website),
    trainer_experience_summary = COALESCE(
      EXCLUDED.trainer_experience_summary,
      public.profiles.trainer_experience_summary
    ),
    trainer_safety_affirmed_at = COALESCE(
      EXCLUDED.trainer_safety_affirmed_at,
      public.profiles.trainer_safety_affirmed_at
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

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
    WHEN v_user.raw_user_meta_data->>'role' IN ('user', 'athlete', 'parent', 'trainer', 'coach')
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
