-- =============================================
-- Phase 1: Shooting session video uploads
-- Run this entire file in the Supabase SQL Editor.
-- Do NOT run from app code — apply manually.
-- =============================================

-- ---------------------------------------------
-- 1. shooting_session_videos table
-- ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.shooting_session_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  duration_seconds NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'processing', 'needs_review', 'complete', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shooting_session_videos_user_id
  ON public.shooting_session_videos(user_id);

CREATE INDEX IF NOT EXISTS idx_shooting_session_videos_status
  ON public.shooting_session_videos(status);

CREATE INDEX IF NOT EXISTS idx_shooting_session_videos_created_at
  ON public.shooting_session_videos(created_at DESC);

COMMENT ON TABLE public.shooting_session_videos IS
  'Uploaded practice videos for AI-assisted shot detection. Status progresses through analysis and review.';

-- ---------------------------------------------
-- 2. RLS on shooting_session_videos
-- ---------------------------------------------

ALTER TABLE public.shooting_session_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own session videos"
  ON public.shooting_session_videos;
DROP POLICY IF EXISTS "Users can insert own session videos"
  ON public.shooting_session_videos;
DROP POLICY IF EXISTS "Users can update own session videos"
  ON public.shooting_session_videos;

CREATE POLICY "Users can view own session videos"
  ON public.shooting_session_videos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session videos"
  ON public.shooting_session_videos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session videos"
  ON public.shooting_session_videos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------
-- 3. Private storage bucket: session-videos
-- Files are stored as: {user_id}/{uuid}.{ext}
-- ---------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'session-videos',
  'session-videos',
  false,
  209715200, -- 200 MB
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 209715200,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime'];

-- ---------------------------------------------
-- 4. Storage RLS — users can only access their folder
-- ---------------------------------------------

DROP POLICY IF EXISTS "Users can upload own session videos"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can read own session videos"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can update own session videos"
  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own session videos"
  ON storage.objects;

CREATE POLICY "Users can upload own session videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'session-videos'
    AND auth.role() = 'authenticated'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own session videos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'session-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own session videos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'session-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own session videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'session-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------
-- Verify (optional)
-- ---------------------------------------------

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'session-videos';

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('shooting_session_videos', 'objects')
  AND (
    policyname LIKE '%session video%'
    OR policyname LIKE '%session videos%'
  );
