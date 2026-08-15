-- Allow trainers to create/update/delete their own training sessions (trainer_services).
-- Athletes/parents still have public read via the existing SELECT policy.

DROP POLICY IF EXISTS "Trainers can insert own services" ON public.trainer_services;
DROP POLICY IF EXISTS "Trainers can update own services" ON public.trainer_services;
DROP POLICY IF EXISTS "Trainers can delete own services" ON public.trainer_services;

CREATE POLICY "Trainers can insert own services" ON public.trainer_services
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trainers t
      WHERE t.id = trainer_services.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Trainers can update own services" ON public.trainer_services
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainers t
      WHERE t.id = trainer_services.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Trainers can delete own services" ON public.trainer_services
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trainers t
      WHERE t.id = trainer_services.trainer_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
