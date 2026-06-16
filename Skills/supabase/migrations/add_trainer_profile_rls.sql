-- Allow trainer users to create and manage their own trainer profile.
-- The base schema enables RLS on public.trainers, but only includes public SELECT.

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainer users can create own trainer profile" ON public.trainers;
CREATE POLICY "Trainer users can create own trainer profile"
  ON public.trainers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainer users can update own trainer profile" ON public.trainers;
CREATE POLICY "Trainer users can update own trainer profile"
  ON public.trainers
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Trainer users can view own trainer profile" ON public.trainers;
CREATE POLICY "Trainer users can view own trainer profile"
  ON public.trainers
  FOR SELECT
  TO authenticated
  USING (
    true
    OR user_id = auth.uid()
  );
