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
