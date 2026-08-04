-- =============================================
-- Run Tracker (Beta)
-- Run this entire file in the Supabase SQL Editor.
-- =============================================

CREATE TABLE IF NOT EXISTS public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),

  -- Metrics (imperial)
  distance_miles NUMERIC(10, 4) NOT NULL CHECK (distance_miles >= 0),
  avg_pace_min_per_mile NUMERIC(8, 3), -- null if distance ~0
  max_speed_mph NUMERIC(8, 3),

  -- Full GPS track for a future route map
  -- Example point: { "lat": 40.7, "lng": -74.0, "t": 1710000000000, "accuracy": 8 }
  path JSONB NOT NULL DEFAULT '[]'::jsonb,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_user_id
  ON public.runs(user_id);

CREATE INDEX IF NOT EXISTS idx_runs_started_at
  ON public.runs(user_id, started_at DESC);

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own runs" ON public.runs;
DROP POLICY IF EXISTS "Users can insert own runs" ON public.runs;
DROP POLICY IF EXISTS "Users can update own runs" ON public.runs;
DROP POLICY IF EXISTS "Users can delete own runs" ON public.runs;

CREATE POLICY "Users can view own runs"
  ON public.runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own runs"
  ON public.runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own runs"
  ON public.runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own runs"
  ON public.runs FOR DELETE
  USING (auth.uid() = user_id);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'runs'
ORDER BY ordinal_position;
