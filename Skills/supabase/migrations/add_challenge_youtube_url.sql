-- Migration: Add optional YouTube video URL to challenges (workouts)
-- Used by ChallengeDetail to embed a demo video and by AdminDashboard to edit it.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

COMMENT ON COLUMN public.challenges.youtube_url IS 'Optional YouTube video URL rendered as embedded demo in ChallengeDetail';
