-- Ensure trainers can create and manage training events tied to their trainer profile.

ALTER TABLE public.training_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainer users can insert own training events" ON public.training_events;
CREATE POLICY "Trainer users can insert own training events"
  ON public.training_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
        AND p.role IN ('trainer', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainer users can update own training events" ON public.training_events;
CREATE POLICY "Trainer users can update own training events"
  ON public.training_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainer users can delete own training events" ON public.training_events;
CREATE POLICY "Trainer users can delete own training events"
  ON public.training_events
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trainers t
      WHERE t.id = training_events.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );
