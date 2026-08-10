-- athlete_events: personal schedule entries for athletes.
-- This table was originally created by hand in the Supabase dashboard;
-- add_gamification_tables.sql FK-references it and add_athlete_events_rls.sql
-- assumes it exists. Run this BEFORE both on a fresh database; no-op on prod.

CREATE TABLE IF NOT EXISTS public.athlete_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('game', 'practice', 'workout', 'rest')),
  event_date DATE NOT NULL,
  start_time TIME,
  opponent TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athlete_events_athlete_date
  ON public.athlete_events(athlete_id, event_date);
