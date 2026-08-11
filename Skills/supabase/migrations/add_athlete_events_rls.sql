-- RLS for athlete_events (run if inserts/selects fail for logged-in users)

ALTER TABLE public.athlete_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athletes can view own events" ON public.athlete_events;
CREATE POLICY "Athletes can view own events" ON public.athlete_events
  FOR SELECT USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes can insert own events" ON public.athlete_events;
CREATE POLICY "Athletes can insert own events" ON public.athlete_events
  FOR INSERT WITH CHECK (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes can update own events" ON public.athlete_events;
CREATE POLICY "Athletes can update own events" ON public.athlete_events
  FOR UPDATE USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes can delete own events" ON public.athlete_events;
CREATE POLICY "Athletes can delete own events" ON public.athlete_events
  FOR DELETE USING (auth.uid() = athlete_id);
