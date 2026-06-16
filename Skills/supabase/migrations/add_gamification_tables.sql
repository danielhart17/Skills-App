-- Athlete accountability & gamification tables
-- Apply via Supabase Dashboard SQL Editor or: supabase db push

-- =============================================
-- daily_checkins
-- =============================================
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.athlete_events(id) ON DELETE SET NULL,
  check_in_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'skipped', 'rescheduled')),
  energy_rating INT CHECK (energy_rating >= 1 AND energy_rating <= 5),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_athlete_date
  ON public.daily_checkins(athlete_id, check_in_date);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_event
  ON public.daily_checkins(event_id);

-- =============================================
-- athlete_streaks (one row per athlete)
-- =============================================
CREATE TABLE IF NOT EXISTS public.athlete_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_checkin_date DATE,
  total_xp INT NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Rookie',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- athlete_achievements
-- =============================================
CREATE TABLE IF NOT EXISTS public.athlete_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(athlete_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_athlete_achievements_athlete
  ON public.athlete_achievements(athlete_id);

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes manage own checkins" ON public.daily_checkins;
CREATE POLICY "Athletes manage own checkins" ON public.daily_checkins
  FOR ALL USING (auth.uid() = athlete_id) WITH CHECK (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes manage own streaks" ON public.athlete_streaks;
CREATE POLICY "Athletes manage own streaks" ON public.athlete_streaks
  FOR ALL USING (auth.uid() = athlete_id) WITH CHECK (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes manage own achievements" ON public.athlete_achievements;
CREATE POLICY "Athletes manage own achievements" ON public.athlete_achievements
  FOR ALL USING (auth.uid() = athlete_id) WITH CHECK (auth.uid() = athlete_id);
