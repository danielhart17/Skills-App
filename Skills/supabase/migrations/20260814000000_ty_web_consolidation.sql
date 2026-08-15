-- Consolidation bundle: LockedInSports/skills-app web migrations.
-- Sources concatenated in dependency order; all statements idempotent.
-- Excludes rewrite_iq_questions_brief (already run, destructive) and the
-- video/runs migrations (already fully applied to prod).

-- ============ source: add_background_checks.sql ============
-- =============================================
-- Trainer background checks (schema only)
-- One current-state row per person (keyed on user_id).
-- Client writes intentionally denied via RLS (no insert/update/delete policies).
-- =============================================

-- Status enum for background-check lifecycle / discoverability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'background_check_status'
  ) THEN
    CREATE TYPE public.background_check_status AS ENUM (
      'not_started',  -- default; nothing initiated
      'pending',      -- submitted to a provider, awaiting result
      'clear',        -- provider returned clear (discoverable, until expires_at passes)
      'consider',     -- provider flagged records; needs admin adjudication (NOT discoverable)
      'bypassed',     -- admin manually approved a known/trusted trainer (discoverable)
      'expired',      -- a previously valid check has lapsed (NOT discoverable); needs renewal
      'rejected'      -- admin decided not to allow (NOT discoverable)
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.background_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  status public.background_check_status NOT NULL DEFAULT 'not_started',
  provider TEXT,                 -- 'yardstik' | 'checkr' | 'admin_bypass' (nullable for now)
  provider_candidate_id TEXT,
  provider_report_id TEXT,
  result_summary JSONB,          -- NON-PII summary/adjudication only; never raw SSN/DOB
  bypassed_by UUID REFERENCES public.profiles(id),
  bypass_reason TEXT,
  requested_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,        -- NULL = does not expire (e.g. admin bypass);
                                 -- a timestamp = valid only until this moment.
                                 -- Discoverability gate (later phase) treats a check as valid only when:
                                 --   status IN ('clear','bypassed')
                                 --   AND (expires_at IS NULL OR expires_at > now())
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_checks_user_id
  ON public.background_checks (user_id);

CREATE INDEX IF NOT EXISTS idx_background_checks_trainer_id
  ON public.background_checks (trainer_id);

CREATE INDEX IF NOT EXISTS idx_background_checks_status
  ON public.background_checks (status);

CREATE INDEX IF NOT EXISTS idx_background_checks_expires_at
  ON public.background_checks (expires_at);

-- Reuse the shared updated_at trigger function already used by profiles/drills/etc.
DROP TRIGGER IF EXISTS update_background_checks_updated_at ON public.background_checks;
CREATE TRIGGER update_background_checks_updated_at
  BEFORE UPDATE ON public.background_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.background_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own bg check read" ON public.background_checks;
CREATE POLICY "own bg check read" ON public.background_checks
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin bg check read" ON public.background_checks;
CREATE POLICY "admin bg check read" ON public.background_checks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- No INSERT / UPDATE / DELETE policies on purpose:
-- client role cannot write; only service role (webhooks) and future
-- SECURITY DEFINER RPCs (admin bypass) may mutate rows.

-- ============ source: add_trainer_discoverability_gate.sql ============
-- =============================================
-- Gate public trainer discoverability on a valid background check.
-- SELECT-only change on public.trainers; INSERT/UPDATE policies untouched.
-- =============================================

-- Helper: boolean clearance check only (no status/reason leak).
-- SECURITY DEFINER so the subquery is not blocked by background_checks RLS.
CREATE OR REPLACE FUNCTION public.is_trainer_discoverable(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public   -- REQUIRED hardening; do not remove
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.background_checks bc
    WHERE bc.user_id = p_user_id
      AND bc.status IN ('clear', 'bypassed')
      AND (bc.expires_at IS NULL OR bc.expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_trainer_discoverable(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trainer_discoverable(UUID) TO anon, authenticated;

-- Drop EVERY prior SELECT policy on trainers (both were effectively USING true).
DROP POLICY IF EXISTS "Trainers are viewable by everyone" ON public.trainers;
DROP POLICY IF EXISTS "Trainer users can view own trainer profile" ON public.trainers;
DROP POLICY IF EXISTS "trainers discoverable when cleared" ON public.trainers;

-- Single gated SELECT policy.
CREATE POLICY "trainers discoverable when cleared" ON public.trainers
  FOR SELECT
  USING (
    public.is_trainer_discoverable(user_id)          -- cleared/bypassed & not expired
    OR user_id = auth.uid()                          -- owner sees own row
    OR EXISTS (                                      -- admin sees all
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- ============ source: add_admin_bypass_background_check.sql ============
-- =============================================
-- Admin bypass for trainer background checks
-- SECURITY DEFINER RPC — only sanctioned client write path
-- (besides future service-role webhook) into background_checks.
-- =============================================

CREATE OR REPLACE FUNCTION public.admin_bypass_background_check(
  target_user_id UUID,
  reason TEXT
)
RETURNS public.background_checks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- REQUIRED: hardening against search_path hijacking
AS $$
DECLARE
  caller UUID := auth.uid();
  is_admin BOOLEAN;
  result public.background_checks;
BEGIN
  -- 1) Must be authenticated
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2) Caller must be an admin. Check the DB; never trust a passed-in identity.
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = caller
      AND p.role = 'admin'
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins may bypass a background check';
  END IF;

  -- 3) A reason is mandatory (audit trail for overriding a safety check)
  IF reason IS NULL OR length(trim(reason)) = 0 THEN
    RAISE EXCEPTION 'A bypass reason is required';
  END IF;

  -- 4) Upsert one row per person. Bypass does NOT expire (expires_at = null).
  INSERT INTO public.background_checks AS bc (
    user_id,
    trainer_id,
    status,
    provider,
    bypassed_by,
    bypass_reason,
    completed_at,
    expires_at
  )
  VALUES (
    target_user_id,
    (SELECT t.id FROM public.trainers t WHERE t.user_id = target_user_id),
    'bypassed',
    'admin_bypass',
    caller,
    reason,
    now(),
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status        = 'bypassed',
    provider      = 'admin_bypass',
    bypassed_by   = caller,
    bypass_reason = reason,
    completed_at  = now(),
    expires_at    = NULL,
    trainer_id    = coalesce(bc.trainer_id, excluded.trainer_id),
    updated_at    = now()
  RETURNING bc.* INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_bypass_background_check(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bypass_background_check(UUID, TEXT) TO authenticated;

-- ============ source: add_trainer_signup_fields.sql ============
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

-- ============ source: add_account_deletion.sql ============
-- =============================================
-- Account deletion anonymization
-- SECURITY DEFINER — service_role only.
-- Soft-deletes PII; leaves bookings intact for money/tax history.
-- Run this entire file in the Supabase SQL Editor.
-- =============================================

-- Profiles: allow null email after anonymization; add missing PII columns.
ALTER TABLE public.profiles
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.deleted_at IS
  'Set by anonymize_user_for_deletion when the account is soft-deleted.';

-- Trainers: inactive flag so deleted trainers stay undiscoverable.
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.trainers.is_active IS
  'False after account deletion anonymization; excluded from public discoverability.';

-- Tighten discoverability: inactive trainers are never publicly listable.
DROP POLICY IF EXISTS "trainers discoverable when cleared" ON public.trainers;
CREATE POLICY "trainers discoverable when cleared" ON public.trainers
  FOR SELECT
  USING (
    (
      is_active
      AND public.is_trainer_discoverable(user_id)
    )
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.anonymize_user_for_deletion(target_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- REQUIRED hardening; do not remove
AS $$
DECLARE
  upcoming_count INTEGER := 0;
  trainer_id UUID;
  profile_found BOOLEAN := false;
  trainer_updated BOOLEAN := false;
  bg_checks_deleted INTEGER := 0;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  -- 1) Block deletion while confirmed future bookings are still in flight
  --    (user as athlete OR as the trainer on the booking).
  SELECT COUNT(*)::INTEGER
  INTO upcoming_count
  FROM public.bookings b
  LEFT JOIN public.trainers t ON t.id = b.trainer_id
  WHERE b.status = 'confirmed'
    AND b.booking_datetime > now()
    AND (
      b.user_id = target_user_id
      OR t.user_id = target_user_id
    );

  IF upcoming_count > 0 THEN
    RAISE EXCEPTION
      'Cannot delete account: % upcoming confirmed booking(s) must be cancelled or completed first',
      upcoming_count;
  END IF;

  -- 2) Anonymize profile (keep the row; do not cascade-delete bookings).
  UPDATE public.profiles
  SET
    full_name = 'Deleted User',
    email = NULL,
    phone = NULL,
    avatar_url = NULL,
    bio = NULL,
    deleted_at = now(),
    updated_at = now()
  WHERE id = target_user_id;

  profile_found := FOUND;
  IF NOT profile_found THEN
    RAISE EXCEPTION 'Profile not found for user %', target_user_id;
  END IF;

  -- 3) Anonymize trainers row if present; clear Connect IDs (keep Stripe account
  --    itself — payout/tax records live there). Mark inactive/undiscoverable.
  SELECT t.id
  INTO trainer_id
  FROM public.trainers t
  WHERE t.user_id = target_user_id;

  IF trainer_id IS NOT NULL THEN
    UPDATE public.trainers
    SET
      name = 'Deleted User',
      bio = NULL,
      profile_image = NULL,
      is_active = false,
      stripe_account_id = NULL,
      stripe_onboarding_complete = false,
      stripe_charges_enabled = false,
      stripe_payouts_enabled = false
    WHERE id = trainer_id;

    trainer_updated := FOUND;
  END IF;

  -- 4) Remove background check rows (PII). Bookings are intentionally left alone.
  DELETE FROM public.background_checks
  WHERE user_id = target_user_id;

  GET DIAGNOSTICS bg_checks_deleted = ROW_COUNT;

  -- 5) Bookings: no delete / no cascade — rows remain for history & money trail.

  -- 6) Report what was affected.
  RETURN jsonb_build_object(
    'user_id', target_user_id,
    'profile_anonymized', profile_found,
    'trainer_id', trainer_id,
    'trainer_anonymized', trainer_updated,
    'background_checks_deleted', bg_checks_deleted,
    'bookings_preserved', true,
    'upcoming_confirmed_bookings_blocked', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.anonymize_user_for_deletion(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anonymize_user_for_deletion(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_user_for_deletion(UUID) TO service_role;

COMMENT ON FUNCTION public.anonymize_user_for_deletion(UUID) IS
  'Soft-deletes a user for account deletion: anonymizes profile/trainer PII, clears Connect flags, deletes background_checks. Blocks when confirmed future bookings exist. service_role only.';

-- ============ source: add_trainer_services_manage_policies.sql ============
-- Allow trainers to create/update/delete their own training sessions (trainer_services).
-- Athletes/parents still have public read via the existing SELECT policy.

DROP POLICY IF EXISTS "Trainers can insert own services" ON public.trainer_services;
DROP POLICY IF EXISTS "Trainers can update own services" ON public.trainer_services;
DROP POLICY IF EXISTS "Trainers can delete own services" ON public.trainer_services;

CREATE POLICY "Trainers can insert own services" ON public.trainer_services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainers t
      WHERE t.id = trainer_services.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Trainers can update own services" ON public.trainer_services
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainers t
      WHERE t.id = trainer_services.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Trainers can delete own services" ON public.trainer_services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainers t
      WHERE t.id = trainer_services.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============ source: add_trainer_session_recurrence_and_skill.sql ============
-- Recurring training sessions + skill level.
-- Sessions replace the weekly availability schedule for athlete booking.

ALTER TABLE public.trainer_services
  ADD COLUMN IF NOT EXISTS session_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'all_levels',
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_days JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.trainer_services
  DROP CONSTRAINT IF EXISTS trainer_services_skill_level_check;

ALTER TABLE public.trainer_services
  ADD CONSTRAINT trainer_services_skill_level_check
  CHECK (
    skill_level IS NULL OR skill_level IN (
      'all_levels',
      'beginner',
      'intermediate',
      'advanced'
    )
  );

-- Allow pending/confirmed/etc. Booking.create used pending_payment which violated older checks.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IS NULL OR status IN (
      'pending',
      'pending_payment',
      'confirmed',
      'cancelled',
      'completed'
    )
  );

-- Athletes need to know which slots are already taken without reading full booking rows.
CREATE OR REPLACE FUNCTION public.get_trainer_booked_slots(
  p_trainer_id UUID,
  p_day DATE
)
RETURNS TABLE(booking_datetime TIMESTAMPTZ, duration_minutes INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.booking_datetime, b.duration_minutes
  FROM public.bookings b
  WHERE b.trainer_id = p_trainer_id
    AND COALESCE(b.status, '') <> 'cancelled'
    AND (b.booking_datetime AT TIME ZONE 'UTC')::date = p_day;
$$;

GRANT EXECUTE ON FUNCTION public.get_trainer_booked_slots(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trainer_booked_slots(UUID, DATE) TO anon;

DROP FUNCTION IF EXISTS public.create_trainer_service(TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT);
DROP FUNCTION IF EXISTS public.update_trainer_service(UUID, TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT);

CREATE OR REPLACE FUNCTION public.create_trainer_service(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price NUMERIC DEFAULT 0,
  p_duration_minutes INTEGER DEFAULT 60,
  p_session_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_skill_level TEXT DEFAULT 'all_levels',
  p_is_recurring BOOLEAN DEFAULT false,
  p_recurrence_days JSONB DEFAULT '[]'::jsonb
)
RETURNS public.trainer_services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID;
  v_row public.trainer_services;
  v_skill TEXT;
  v_days JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_trainer_id
  FROM public.trainers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'No trainer profile found. Create your trainer profile first.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Session name is required';
  END IF;

  v_skill := COALESCE(NULLIF(btrim(p_skill_level), ''), 'all_levels');
  IF v_skill NOT IN ('all_levels', 'beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid skill level';
  END IF;

  v_days := COALESCE(p_recurrence_days, '[]'::jsonb);

  IF COALESCE(p_is_recurring, false) THEN
    IF jsonb_typeof(v_days) <> 'array' OR jsonb_array_length(v_days) = 0 THEN
      RAISE EXCEPTION 'Recurring sessions need at least one weekday';
    END IF;
    IF p_start_time IS NULL THEN
      RAISE EXCEPTION 'Start time is required for recurring sessions';
    END IF;
  END IF;

  INSERT INTO public.trainer_services (
    trainer_id,
    name,
    description,
    price,
    duration_minutes,
    session_date,
    start_time,
    location,
    skill_level,
    is_recurring,
    recurrence_days
  ) VALUES (
    v_trainer_id,
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    COALESCE(p_price, 0),
    COALESCE(p_duration_minutes, 60),
    CASE WHEN COALESCE(p_is_recurring, false) THEN NULL ELSE p_session_date END,
    p_start_time,
    NULLIF(btrim(COALESCE(p_location, '')), ''),
    v_skill,
    COALESCE(p_is_recurring, false),
    CASE WHEN COALESCE(p_is_recurring, false) THEN v_days ELSE '[]'::jsonb END
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_trainer_service(
  p_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price NUMERIC DEFAULT 0,
  p_duration_minutes INTEGER DEFAULT 60,
  p_session_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_skill_level TEXT DEFAULT 'all_levels',
  p_is_recurring BOOLEAN DEFAULT false,
  p_recurrence_days JSONB DEFAULT '[]'::jsonb
)
RETURNS public.trainer_services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID;
  v_row public.trainer_services;
  v_skill TEXT;
  v_days JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_trainer_id
  FROM public.trainers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'No trainer profile found';
  END IF;

  v_skill := COALESCE(NULLIF(btrim(p_skill_level), ''), 'all_levels');
  IF v_skill NOT IN ('all_levels', 'beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid skill level';
  END IF;

  v_days := COALESCE(p_recurrence_days, '[]'::jsonb);

  IF COALESCE(p_is_recurring, false) THEN
    IF jsonb_typeof(v_days) <> 'array' OR jsonb_array_length(v_days) = 0 THEN
      RAISE EXCEPTION 'Recurring sessions need at least one weekday';
    END IF;
    IF p_start_time IS NULL THEN
      RAISE EXCEPTION 'Start time is required for recurring sessions';
    END IF;
  END IF;

  UPDATE public.trainer_services
  SET
    name = btrim(p_name),
    description = NULLIF(btrim(COALESCE(p_description, '')), ''),
    price = COALESCE(p_price, 0),
    duration_minutes = COALESCE(p_duration_minutes, 60),
    session_date = CASE WHEN COALESCE(p_is_recurring, false) THEN NULL ELSE p_session_date END,
    start_time = p_start_time,
    location = NULLIF(btrim(COALESCE(p_location, '')), ''),
    skill_level = v_skill,
    is_recurring = COALESCE(p_is_recurring, false),
    recurrence_days = CASE WHEN COALESCE(p_is_recurring, false) THEN v_days ELSE '[]'::jsonb END
  WHERE id = p_id
    AND trainer_id = v_trainer_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Training session not found or not owned by you';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_trainer_service(TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT, TEXT, BOOLEAN, JSONB)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_trainer_service(UUID, TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT, TEXT, BOOLEAN, JSONB)
  TO authenticated;

-- ============ source: add_booking_to_athlete_schedule.sql ============
-- Link trainer bookings onto the athlete schedule (athlete_events).

ALTER TABLE public.athlete_events
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_events_booking_id_unique
  ON public.athlete_events(booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_athlete_events_booking_id
  ON public.athlete_events(booking_id);

-- Allow "training" as a first-class schedule type if a check constraint exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'athlete_events_event_type_check'
  ) THEN
    ALTER TABLE public.athlete_events DROP CONSTRAINT athlete_events_event_type_check;
    ALTER TABLE public.athlete_events
      ADD CONSTRAINT athlete_events_event_type_check
      CHECK (
        event_type IS NULL OR event_type IN (
          'game',
          'practice',
          'workout',
          'rest',
          'training'
        )
      );
  END IF;
END $$;

-- ============ prerequisite: drill_ratings/drill_progress from add_drills_system.sql ============
-- Prod only ever got the drills table from add_drills_system.sql; the
-- completion-count RPCs below reference drill_progress. Guarded extract.

CREATE TABLE IF NOT EXISTS public.drill_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  drill_id UUID REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, drill_id)
);

CREATE TABLE IF NOT EXISTS public.drill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  drill_id UUID REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, drill_id)
);

CREATE INDEX IF NOT EXISTS idx_drill_ratings_user_id ON public.drill_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_ratings_drill_id ON public.drill_ratings(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_progress_user_id ON public.drill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_progress_drill_id ON public.drill_progress(drill_id);

ALTER TABLE public.drill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all drill ratings" ON public.drill_ratings;
CREATE POLICY "Users can view all drill ratings" ON public.drill_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own drill ratings" ON public.drill_ratings;
CREATE POLICY "Users can manage their own drill ratings" ON public.drill_ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own drill progress" ON public.drill_progress;
CREATE POLICY "Users can view their own drill progress" ON public.drill_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own drill progress" ON public.drill_progress;
CREATE POLICY "Users can manage their own drill progress" ON public.drill_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ source: add_schedule_source_ids_and_completion_counts.sql ============
-- Link scheduled workouts/drills to source rows + public completion counts.

ALTER TABLE public.athlete_events
  ADD COLUMN IF NOT EXISTS drill_id UUID REFERENCES public.drills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_athlete_events_drill_id ON public.athlete_events(drill_id);
CREATE INDEX IF NOT EXISTS idx_athlete_events_challenge_id ON public.athlete_events(challenge_id);

-- Count how many distinct users completed a drill
CREATE OR REPLACE FUNCTION public.get_drill_completion_count(p_drill_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.drill_progress
  WHERE drill_id = p_drill_id
    AND is_completed = true;
$$;

-- Count how many distinct users completed a challenge/workout
CREATE OR REPLACE FUNCTION public.get_challenge_completion_count(p_challenge_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.challenge_progress
  WHERE challenge_id = p_challenge_id
    AND is_completed = true;
$$;

-- Batch counts for workout/drill list pages
CREATE OR REPLACE FUNCTION public.get_drill_completion_counts(p_drill_ids UUID[])
RETURNS TABLE(item_id UUID, completion_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id AS item_id, COUNT(dp.id)::INTEGER AS completion_count
  FROM unnest(p_drill_ids) AS d(id)
  LEFT JOIN public.drill_progress dp
    ON dp.drill_id = d.id AND dp.is_completed = true
  GROUP BY d.id;
$$;

CREATE OR REPLACE FUNCTION public.get_challenge_completion_counts(p_challenge_ids UUID[])
RETURNS TABLE(item_id UUID, completion_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id AS item_id, COUNT(cp.id)::INTEGER AS completion_count
  FROM unnest(p_challenge_ids) AS c(id)
  LEFT JOIN public.challenge_progress cp
    ON cp.challenge_id = c.id AND cp.is_completed = true
  GROUP BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_drill_completion_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_completion_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_drill_completion_counts(UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_completion_counts(UUID[]) TO anon, authenticated;

-- ============ source: add_athlete_follow_trainers.sql ============
-- Athlete follow trainers + in-app notifications when trainers post workouts.
-- Connections use auth user ids (trainer_id = trainers.user_id, athlete_id = athlete auth id).

-- =============================================
-- Follow policies (athletes can follow/unfollow)
-- =============================================
DROP POLICY IF EXISTS "Athletes insert follow connections" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes insert follow connections" ON public.trainer_athlete_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes delete own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes delete own connections" ON public.trainer_athlete_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes update own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes update own connections" ON public.trainer_athlete_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- Trainers can still manage connections they created
DROP POLICY IF EXISTS "Trainers update own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Trainers update own connections" ON public.trainer_athlete_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainers delete own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Trainers delete own connections" ON public.trainer_athlete_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = trainer_id);

-- =============================================
-- Notifications
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trainers notify all active followers when posting a workout
CREATE OR REPLACE FUNCTION public.notify_followers_of_workout(
  p_workout_title TEXT,
  p_workout_id UUID DEFAULT NULL,
  p_link TEXT DEFAULT '/workouts'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID := auth.uid();
  v_trainer_name TEXT;
  v_count INTEGER := 0;
BEGIN
  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workout_title IS NULL OR btrim(p_workout_title) = '' THEN
    RAISE EXCEPTION 'Workout title is required';
  END IF;

  SELECT COALESCE(NULLIF(btrim(p.full_name), ''), 'Your trainer')
  INTO v_trainer_name
  FROM public.profiles p
  WHERE p.id = v_trainer_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, meta)
  SELECT
    c.athlete_id,
    v_trainer_id,
    'trainer_workout',
    'New workout from ' || COALESCE(v_trainer_name, 'your trainer'),
    COALESCE(v_trainer_name, 'Your trainer') || ' posted "' || btrim(p_workout_title) || '"',
    COALESCE(NULLIF(btrim(p_link), ''), CASE WHEN p_workout_id IS NOT NULL THEN '/workouts/' || p_workout_id::text ELSE '/workouts' END),
    jsonb_build_object(
      'workout_id', p_workout_id,
      'workout_title', btrim(p_workout_title),
      'trainer_id', v_trainer_id
    )
  FROM public.trainer_athlete_connections c
  WHERE c.trainer_id = v_trainer_id
    AND c.status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_followers_of_workout(TEXT, UUID, TEXT) TO authenticated;

-- Reliable follow upsert for athletes
CREATE OR REPLACE FUNCTION public.follow_trainer(p_trainer_user_id UUID)
RETURNS public.trainer_athlete_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id UUID := auth.uid();
  v_row public.trainer_athlete_connections;
BEGIN
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_trainer_user_id IS NULL THEN
    RAISE EXCEPTION 'Trainer is required';
  END IF;

  IF p_trainer_user_id = v_athlete_id THEN
    RAISE EXCEPTION 'You cannot follow yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_trainer_user_id AND p.role IN ('trainer', 'admin')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.trainers t WHERE t.user_id = p_trainer_user_id
  ) THEN
    RAISE EXCEPTION 'Trainer not found';
  END IF;

  INSERT INTO public.trainer_athlete_connections (trainer_id, athlete_id, status)
  VALUES (p_trainer_user_id, v_athlete_id, 'active')
  ON CONFLICT (trainer_id, athlete_id)
  DO UPDATE SET status = 'active'
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_trainer(p_trainer_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id UUID := auth.uid();
BEGIN
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.trainer_athlete_connections
  WHERE trainer_id = p_trainer_user_id
    AND athlete_id = v_athlete_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.follow_trainer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unfollow_trainer(UUID) TO authenticated;

