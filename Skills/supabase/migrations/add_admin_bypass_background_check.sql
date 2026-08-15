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
