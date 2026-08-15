-- Scheduled date/time/location for trainer training sessions (trainer_services).
-- Also harden insert/update/delete RLS so trainers can manage their own sessions.

ALTER TABLE public.trainer_services
  ADD COLUMN IF NOT EXISTS session_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS location TEXT;

CREATE INDEX IF NOT EXISTS idx_trainer_services_session_date
  ON public.trainer_services(session_date);

DROP POLICY IF EXISTS "Trainers can insert own services" ON public.trainer_services;
DROP POLICY IF EXISTS "Trainers can update own services" ON public.trainer_services;
DROP POLICY IF EXISTS "Trainers can delete own services" ON public.trainer_services;

CREATE POLICY "Trainers can insert own services" ON public.trainer_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trainer_id IN (
      SELECT t.id FROM public.trainers t WHERE t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Trainers can update own services" ON public.trainer_services
  FOR UPDATE
  TO authenticated
  USING (
    trainer_id IN (
      SELECT t.id FROM public.trainers t WHERE t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    trainer_id IN (
      SELECT t.id FROM public.trainers t WHERE t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Trainers can delete own services" ON public.trainer_services
  FOR DELETE
  TO authenticated
  USING (
    trainer_id IN (
      SELECT t.id FROM public.trainers t WHERE t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
