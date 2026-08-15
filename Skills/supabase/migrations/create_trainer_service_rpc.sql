-- Reliable create/update path for trainer training sessions.
-- Prefer running add_trainer_session_recurrence_and_skill.sql for the full schema.

ALTER TABLE public.trainer_services
  ADD COLUMN IF NOT EXISTS session_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'all_levels',
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_days JSONB DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.create_trainer_service(TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT);
DROP FUNCTION IF EXISTS public.update_trainer_service(UUID, TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT);
DROP FUNCTION IF EXISTS public.create_trainer_service(TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT, TEXT, BOOLEAN, JSONB);
DROP FUNCTION IF EXISTS public.update_trainer_service(UUID, TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT, TEXT, BOOLEAN, JSONB);

CREATE OR REPLACE FUNCTION public.create_trainer_service(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price NUMERIC DEFAULT 0,
  p_duration_minutes INTEGER DEFAULT 60,
  p_session_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_skill_level TEXT DEFAULT 'all_levels',
  p_is_recurring BOOLEAN DEFAULT false,
  p_recurrence_days JSONB DEFAULT '[]'::jsonb
)
RETURNS public.trainer_services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID;
  v_row public.trainer_services;
  v_skill TEXT;
  v_days JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_trainer_id
  FROM public.trainers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'No trainer profile found. Create your trainer profile first.';
  END IF;

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Session name is required';
  END IF;

  v_skill := COALESCE(NULLIF(btrim(p_skill_level), ''), 'all_levels');
  IF v_skill NOT IN ('all_levels', 'beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid skill level';
  END IF;

  v_days := COALESCE(p_recurrence_days, '[]'::jsonb);

  IF COALESCE(p_is_recurring, false) THEN
    IF jsonb_typeof(v_days) <> 'array' OR jsonb_array_length(v_days) = 0 THEN
      RAISE EXCEPTION 'Recurring sessions need at least one weekday';
    END IF;
    IF p_start_time IS NULL THEN
      RAISE EXCEPTION 'Start time is required for recurring sessions';
    END IF;
  END IF;

  INSERT INTO public.trainer_services (
    trainer_id,
    name,
    description,
    price,
    duration_minutes,
    session_date,
    start_time,
    location,
    skill_level,
    is_recurring,
    recurrence_days
  ) VALUES (
    v_trainer_id,
    btrim(p_name),
    NULLIF(btrim(COALESCE(p_description, '')), ''),
    COALESCE(p_price, 0),
    COALESCE(p_duration_minutes, 60),
    CASE WHEN COALESCE(p_is_recurring, false) THEN NULL ELSE p_session_date END,
    p_start_time,
    NULLIF(btrim(COALESCE(p_location, '')), ''),
    v_skill,
    COALESCE(p_is_recurring, false),
    CASE WHEN COALESCE(p_is_recurring, false) THEN v_days ELSE '[]'::jsonb END
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_trainer_service(
  p_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_price NUMERIC DEFAULT 0,
  p_duration_minutes INTEGER DEFAULT 60,
  p_session_date DATE DEFAULT NULL,
  p_start_time TIME DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_skill_level TEXT DEFAULT 'all_levels',
  p_is_recurring BOOLEAN DEFAULT false,
  p_recurrence_days JSONB DEFAULT '[]'::jsonb
)
RETURNS public.trainer_services
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trainer_id UUID;
  v_row public.trainer_services;
  v_skill TEXT;
  v_days JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_trainer_id
  FROM public.trainers
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'No trainer profile found';
  END IF;

  v_skill := COALESCE(NULLIF(btrim(p_skill_level), ''), 'all_levels');
  IF v_skill NOT IN ('all_levels', 'beginner', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'Invalid skill level';
  END IF;

  v_days := COALESCE(p_recurrence_days, '[]'::jsonb);

  IF COALESCE(p_is_recurring, false) THEN
    IF jsonb_typeof(v_days) <> 'array' OR jsonb_array_length(v_days) = 0 THEN
      RAISE EXCEPTION 'Recurring sessions need at least one weekday';
    END IF;
    IF p_start_time IS NULL THEN
      RAISE EXCEPTION 'Start time is required for recurring sessions';
    END IF;
  END IF;

  UPDATE public.trainer_services
  SET
    name = btrim(p_name),
    description = NULLIF(btrim(COALESCE(p_description, '')), ''),
    price = COALESCE(p_price, 0),
    duration_minutes = COALESCE(p_duration_minutes, 60),
    session_date = CASE WHEN COALESCE(p_is_recurring, false) THEN NULL ELSE p_session_date END,
    start_time = p_start_time,
    location = NULLIF(btrim(COALESCE(p_location, '')), ''),
    skill_level = v_skill,
    is_recurring = COALESCE(p_is_recurring, false),
    recurrence_days = CASE WHEN COALESCE(p_is_recurring, false) THEN v_days ELSE '[]'::jsonb END
  WHERE id = p_id
    AND trainer_id = v_trainer_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Training session not found or not owned by you';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_trainer_service(TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT, TEXT, BOOLEAN, JSONB)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_trainer_service(UUID, TEXT, TEXT, NUMERIC, INTEGER, DATE, TIME, TEXT, TEXT, BOOLEAN, JSONB)
  TO authenticated;
