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
