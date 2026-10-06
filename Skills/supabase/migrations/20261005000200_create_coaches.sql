CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
  organization text CHECK (organization IS NULL OR char_length(organization) <= 120),
  city text CHECK (city IS NULL OR char_length(city) <= 80),
  state text CHECK (state IS NULL OR char_length(state) <= 40),
  age_groups text[] NOT NULL DEFAULT '{}'
    CHECK (age_groups <@ ARRAY['6U','8U','10U','12U','14U','HS']::text[]),
  bio text CHECK (bio IS NULL OR char_length(bio) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach reads own row" ON public.coaches
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "admin reads coaches" ON public.coaches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE POLICY "coach creates own row" ON public.coaches
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'coach'
    )
  );

CREATE POLICY "coach updates own row" ON public.coaches
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin updates coaches" ON public.coaches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.is_coach_cleared(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.background_checks bc ON bc.user_id = p.id
    WHERE p.id = p_user_id
      AND p.role = 'coach'
      AND p.deleted_at IS NULL
      AND bc.status IN ('clear', 'bypassed')
      AND (bc.expires_at IS NULL OR bc.expires_at > now())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_coach_cleared(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_coach_cleared(uuid) TO authenticated;
