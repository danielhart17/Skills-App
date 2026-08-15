-- =============================================
-- Phase 2: AI-detected shots from video analysis
-- Run in Supabase SQL Editor after Phase 1 migration.
-- =============================================

CREATE TABLE IF NOT EXISTS public.detected_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.shooting_session_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  timestamp_seconds NUMERIC(10, 2) NOT NULL,
  result TEXT NOT NULL
    CHECK (result IN ('make', 'miss', 'unclear')),
  confidence NUMERIC(4, 3) NOT NULL
    CHECK (confidence >= 0 AND confidence <= 1),
  shot_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (shot_type IN ('layup', 'midrange', 'three', 'freethrow', 'unknown')),
  court_x NUMERIC(5, 2)
    CHECK (court_x IS NULL OR (court_x >= 0 AND court_x <= 100)),
  court_y NUMERIC(5, 2)
    CHECK (court_y IS NULL OR (court_y >= 0 AND court_y <= 100)),
  batch_index INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detected_shots_video_id
  ON public.detected_shots(video_id);

CREATE INDEX IF NOT EXISTS idx_detected_shots_user_id
  ON public.detected_shots(user_id);

CREATE INDEX IF NOT EXISTS idx_detected_shots_timestamp
  ON public.detected_shots(video_id, timestamp_seconds);

ALTER TABLE public.detected_shots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own detected shots"
  ON public.detected_shots;
DROP POLICY IF EXISTS "Users can insert own detected shots"
  ON public.detected_shots;
DROP POLICY IF EXISTS "Users can delete own detected shots"
  ON public.detected_shots;

CREATE POLICY "Users can view own detected shots"
  ON public.detected_shots
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own detected shots"
  ON public.detected_shots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own detected shots"
  ON public.detected_shots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to delete their own video rows' shots during dedup finalize
-- (edge function uses user JWT, so RLS applies)

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'detected_shots'
ORDER BY ordinal_position;
