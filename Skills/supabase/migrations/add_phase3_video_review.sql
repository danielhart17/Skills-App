-- =============================================
-- Phase 3: Video review confirm & save
-- Run this entire file in the Supabase SQL Editor.
-- =============================================

ALTER TABLE public.shooting_sessions
  ADD COLUMN IF NOT EXISTS zone_stats JSONB;

ALTER TABLE public.shooting_sessions
  ADD COLUMN IF NOT EXISTS source_video_id UUID
  REFERENCES public.shooting_session_videos(id) ON DELETE SET NULL;

ALTER TABLE public.shooting_session_videos
  ADD COLUMN IF NOT EXISTS shooting_session_id UUID
  REFERENCES public.shooting_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shooting_sessions_source_video_id
  ON public.shooting_sessions(source_video_id);

CREATE INDEX IF NOT EXISTS idx_shooting_session_videos_shooting_session_id
  ON public.shooting_session_videos(shooting_session_id);

DROP POLICY IF EXISTS "Users can update own detected shots"
  ON public.detected_shots;

CREATE POLICY "Users can update own detected shots"
  ON public.detected_shots
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('shooting_sessions', 'shooting_session_videos', 'detected_shots')
  AND column_name IN (
    'zone_stats',
    'source_video_id',
    'shooting_session_id'
  )
ORDER BY table_name, column_name;
