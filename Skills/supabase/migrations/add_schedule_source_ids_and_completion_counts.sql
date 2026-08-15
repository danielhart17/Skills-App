-- Link scheduled workouts/drills to source rows + public completion counts.

ALTER TABLE public.athlete_events
  ADD COLUMN IF NOT EXISTS drill_id UUID REFERENCES public.drills(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_athlete_events_drill_id ON public.athlete_events(drill_id);
CREATE INDEX IF NOT EXISTS idx_athlete_events_challenge_id ON public.athlete_events(challenge_id);

-- Count how many distinct users completed a drill
CREATE OR REPLACE FUNCTION public.get_drill_completion_count(p_drill_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.drill_progress
  WHERE drill_id = p_drill_id
    AND is_completed = true;
$$;

-- Count how many distinct users completed a challenge/workout
CREATE OR REPLACE FUNCTION public.get_challenge_completion_count(p_challenge_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.challenge_progress
  WHERE challenge_id = p_challenge_id
    AND is_completed = true;
$$;

-- Batch counts for workout/drill list pages
CREATE OR REPLACE FUNCTION public.get_drill_completion_counts(p_drill_ids UUID[])
RETURNS TABLE(item_id UUID, completion_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id AS item_id, COUNT(dp.id)::INTEGER AS completion_count
  FROM unnest(p_drill_ids) AS d(id)
  LEFT JOIN public.drill_progress dp
    ON dp.drill_id = d.id AND dp.is_completed = true
  GROUP BY d.id;
$$;

CREATE OR REPLACE FUNCTION public.get_challenge_completion_counts(p_challenge_ids UUID[])
RETURNS TABLE(item_id UUID, completion_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id AS item_id, COUNT(cp.id)::INTEGER AS completion_count
  FROM unnest(p_challenge_ids) AS c(id)
  LEFT JOIN public.challenge_progress cp
    ON cp.challenge_id = c.id AND cp.is_completed = true
  GROUP BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_drill_completion_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_completion_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_drill_completion_counts(UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_completion_counts(UUID[]) TO anon, authenticated;
