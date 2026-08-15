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
