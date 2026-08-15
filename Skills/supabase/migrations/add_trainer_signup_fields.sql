-- =============================================
-- Trainer signup contact + safety affirmation fields
-- Stored on profiles at account creation (before trainers row exists).
-- Run this entire file in the Supabase SQL Editor.
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS social_media TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS trainer_experience_summary TEXT,
  ADD COLUMN IF NOT EXISTS trainer_safety_affirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.instagram_url IS
  'Trainer Instagram profile URL or handle collected at signup.';
COMMENT ON COLUMN public.profiles.social_media IS
  'Additional social media link/handle collected at trainer signup.';
COMMENT ON COLUMN public.profiles.website IS
  'Optional trainer website URL.';
COMMENT ON COLUMN public.profiles.trainer_experience_summary IS
  'Short summary of youth/training experience from trainer signup.';
COMMENT ON COLUMN public.profiles.trainer_safety_affirmed_at IS
  'When the trainer affirmed the safety/conduct statement at signup.';

-- Persist trainer signup metadata from auth.users onto profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_affirmed BOOLEAN;
BEGIN
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('user', 'athlete', 'parent', 'trainer', 'admin')
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
