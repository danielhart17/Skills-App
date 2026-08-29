-- get_child_progress_summary counted public.lesson_progress, but nothing
-- writes that table: the iOS app records lesson completions in
-- user_lesson_attempts (passed = true) and the web app never writes
-- lesson_progress either. Parents therefore always saw "0 lessons".
--
-- Count distinct passed lessons from user_lesson_attempts instead, and
-- source recent lesson activity from the same table.

CREATE OR REPLACE FUNCTION public.get_child_progress_summary(p_child_id UUID)
RETURNS TABLE(
  total_lessons_completed INTEGER,
  total_challenges_completed INTEGER,
  total_xp INTEGER,
  current_level INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  recent_activity JSONB
) AS $$
DECLARE
  v_is_linked BOOLEAN;
BEGIN
  v_is_linked := is_parent_linked_to_child(auth.uid(), p_child_id);

  IF NOT v_is_linked THEN
    RAISE EXCEPTION 'You are not linked to this child';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((
      SELECT COUNT(DISTINCT ula.lesson_id)::INTEGER
      FROM public.user_lesson_attempts ula
      WHERE ula.user_id = p_child_id AND ula.passed = true
    ), 0),
    COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.challenge_progress cp
      WHERE cp.user_id = p_child_id AND cp.is_completed = true
    ), 0),
    p.total_xp,
    p.current_level,
    p.current_streak,
    p.longest_streak,
    (
      SELECT jsonb_agg(activity ORDER BY activity_date DESC)
      FROM (
        SELECT 'lesson' AS type, MAX(ula.created_at) AS activity_date, l.title AS item_title
        FROM public.user_lesson_attempts ula
        JOIN public.lessons l ON l.id = ula.lesson_id
        WHERE ula.user_id = p_child_id AND ula.passed = true
        GROUP BY l.title
        UNION ALL
        SELECT 'challenge' AS type, cp.completed_at AS activity_date, c.title AS item_title
        FROM public.challenge_progress cp
        JOIN public.challenges c ON c.id = cp.challenge_id
        WHERE cp.user_id = p_child_id AND cp.is_completed = true
        ORDER BY activity_date DESC
        LIMIT 10
      ) activity
    )
  FROM public.profiles p
  WHERE p.id = p_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_child_progress_summary(UUID) TO authenticated;
