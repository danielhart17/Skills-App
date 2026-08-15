-- Athlete follow trainers + in-app notifications when trainers post workouts.
-- Connections use auth user ids (trainer_id = trainers.user_id, athlete_id = athlete auth id).

-- =============================================
-- Follow policies (athletes can follow/unfollow)
-- =============================================
DROP POLICY IF EXISTS "Athletes insert follow connections" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes insert follow connections" ON public.trainer_athlete_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes delete own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes delete own connections" ON public.trainer_athlete_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Athletes update own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes update own connections" ON public.trainer_athlete_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = athlete_id)
  WITH CHECK (auth.uid() = athlete_id);

-- Trainers can still manage connections they created
DROP POLICY IF EXISTS "Trainers update own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Trainers update own connections" ON public.trainer_athlete_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Trainers delete own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Trainers delete own connections" ON public.trainer_athlete_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = trainer_id);

-- =============================================
-- Notifications
-- =============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trainers notify all active followers when posting a workout
CREATE OR REPLACE FUNCTION public.notify_followers_of_workout(
  p_workout_title TEXT,
  p_workout_id UUID DEFAULT NULL,
  p_link TEXT DEFAULT '/workouts'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID := auth.uid();
  v_trainer_name TEXT;
  v_count INTEGER := 0;
BEGIN
  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_workout_title IS NULL OR btrim(p_workout_title) = '' THEN
    RAISE EXCEPTION 'Workout title is required';
  END IF;

  SELECT COALESCE(NULLIF(btrim(p.full_name), ''), 'Your trainer')
  INTO v_trainer_name
  FROM public.profiles p
  WHERE p.id = v_trainer_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, body, link, meta)
  SELECT
    c.athlete_id,
    v_trainer_id,
    'trainer_workout',
    'New workout from ' || COALESCE(v_trainer_name, 'your trainer'),
    COALESCE(v_trainer_name, 'Your trainer') || ' posted "' || btrim(p_workout_title) || '"',
    COALESCE(NULLIF(btrim(p_link), ''), CASE WHEN p_workout_id IS NOT NULL THEN '/workouts/' || p_workout_id::text ELSE '/workouts' END),
    jsonb_build_object(
      'workout_id', p_workout_id,
      'workout_title', btrim(p_workout_title),
      'trainer_id', v_trainer_id
    )
  FROM public.trainer_athlete_connections c
  WHERE c.trainer_id = v_trainer_id
    AND c.status = 'active';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_followers_of_workout(TEXT, UUID, TEXT) TO authenticated;

-- Reliable follow upsert for athletes
CREATE OR REPLACE FUNCTION public.follow_trainer(p_trainer_user_id UUID)
RETURNS public.trainer_athlete_connections
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id UUID := auth.uid();
  v_row public.trainer_athlete_connections;
BEGIN
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_trainer_user_id IS NULL THEN
    RAISE EXCEPTION 'Trainer is required';
  END IF;

  IF p_trainer_user_id = v_athlete_id THEN
    RAISE EXCEPTION 'You cannot follow yourself';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_trainer_user_id AND p.role IN ('trainer', 'admin')
  ) AND NOT EXISTS (
    SELECT 1 FROM public.trainers t WHERE t.user_id = p_trainer_user_id
  ) THEN
    RAISE EXCEPTION 'Trainer not found';
  END IF;

  INSERT INTO public.trainer_athlete_connections (trainer_id, athlete_id, status)
  VALUES (p_trainer_user_id, v_athlete_id, 'active')
  ON CONFLICT (trainer_id, athlete_id)
  DO UPDATE SET status = 'active'
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_trainer(p_trainer_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete_id UUID := auth.uid();
BEGIN
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.trainer_athlete_connections
  WHERE trainer_id = p_trainer_user_id
    AND athlete_id = v_athlete_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.follow_trainer(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unfollow_trainer(UUID) TO authenticated;
