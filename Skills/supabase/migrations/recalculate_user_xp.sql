-- Comprehensive XP Recalculation Script
-- This script recalculates XP from ALL sources:
-- 1. Completed lessons (from user_lesson_attempts where passed=true)
-- 2. Entry exam results (starting_xp)
-- 3. Completed challenges (from challenge_progress where is_completed=true)

-- First, let's see what tables exist and what data we have
DO $$
BEGIN
    RAISE NOTICE '=== Starting Comprehensive XP Recalculation ===';
END $$;

-- Main recalculation
DO $$
DECLARE
    user_record RECORD;
    v_lesson_xp INTEGER;
    v_exam_xp INTEGER;
    v_challenge_xp INTEGER;
    v_total_xp INTEGER;
    v_new_level INTEGER;
    v_lessons_completed INTEGER;
BEGIN
    -- Loop through ALL users in profiles
    FOR user_record IN 
        SELECT id, full_name, email FROM public.profiles
    LOOP
        v_lesson_xp := 0;
        v_exam_xp := 0;
        v_challenge_xp := 0;
        v_lessons_completed := 0;
        
        -- 1. Calculate XP from PASSED lessons (user_lesson_attempts)
        -- This is the primary source - lessons are "complete" when passed
        SELECT 
            COALESCE(SUM(COALESCE(l.xp_reward, 50)), 0),
            COUNT(DISTINCT ula.lesson_id)
        INTO v_lesson_xp, v_lessons_completed
        FROM public.user_lesson_attempts ula
        JOIN public.lessons l ON l.id = ula.lesson_id
        WHERE ula.user_id = user_record.id
          AND ula.passed = true;
        
        -- 2. Calculate XP from Entry Exam (if exists)
        BEGIN
            SELECT COALESCE(starting_xp, 0) INTO v_exam_xp
            FROM public.entry_exam_results
            WHERE user_id = user_record.id
            LIMIT 1;
        EXCEPTION WHEN undefined_table THEN
            v_exam_xp := 0;
        END;
        
        IF v_exam_xp IS NULL THEN
            v_exam_xp := 0;
        END IF;
        
        -- 3. Calculate XP from completed challenges (if table exists)
        BEGIN
            SELECT COALESCE(SUM(COALESCE(c.xp_reward, 100)), 0) INTO v_challenge_xp
            FROM public.challenge_progress cp
            JOIN public.challenges c ON c.id = cp.challenge_id
            WHERE cp.user_id = user_record.id
              AND cp.is_completed = true;
        EXCEPTION WHEN undefined_table THEN
            v_challenge_xp := 0;
        END;
        
        IF v_challenge_xp IS NULL THEN
            v_challenge_xp := 0;
        END IF;
        
        -- Calculate total XP
        v_total_xp := v_lesson_xp + v_exam_xp + v_challenge_xp;
        
        -- Calculate level based on total XP
        IF v_total_xp < 100 THEN
            v_new_level := 1;
        ELSIF v_total_xp < 250 THEN
            v_new_level := 2;
        ELSIF v_total_xp < 450 THEN
            v_new_level := 3;
        ELSIF v_total_xp < 700 THEN
            v_new_level := 4;
        ELSIF v_total_xp < 1000 THEN
            v_new_level := 5;
        ELSE
            v_new_level := 5 + ((v_total_xp - 1000) / 300) + 1;
        END IF;
        
        -- Update user's profile
        UPDATE public.profiles
        SET 
            total_xp = v_total_xp,
            current_level = v_new_level,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        -- Log details for users with any XP
        IF v_total_xp > 0 THEN
            RAISE NOTICE 'User % (%): Lessons=% XP (% completed), Exam=% XP, Challenges=% XP, TOTAL=% XP, Level=%', 
                user_record.full_name, 
                user_record.email,
                v_lesson_xp, 
                v_lessons_completed,
                v_exam_xp, 
                v_challenge_xp, 
                v_total_xp, 
                v_new_level;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== XP Recalculation Complete! ===';
END $$;

-- Also sync the user_progress table with user_lesson_attempts for consistency
-- This ensures both tables are in sync
-- Use a subquery to get unique user/lesson combinations first
INSERT INTO public.user_progress (user_id, item_type, item_id, completed, completed_at)
SELECT 
    user_id,
    'lesson' as item_type,
    lesson_id as item_id,
    true as completed,
    MAX(completed_at) as completed_at
FROM public.user_lesson_attempts
WHERE passed = true
GROUP BY user_id, lesson_id
ON CONFLICT (user_id, item_type, item_id) 
DO UPDATE SET 
    completed = true,
    completed_at = EXCLUDED.completed_at;

-- Show final results
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.total_xp,
    p.current_level,
    (SELECT COUNT(DISTINCT lesson_id) FROM public.user_lesson_attempts ula WHERE ula.user_id = p.id AND ula.passed = true) as lessons_passed,
    (SELECT COALESCE(starting_xp, 0) FROM public.entry_exam_results eer WHERE eer.user_id = p.id LIMIT 1) as exam_xp,
    (SELECT COUNT(*) FROM public.challenge_progress cp WHERE cp.user_id = p.id AND cp.is_completed = true) as challenges_completed
FROM public.profiles p
ORDER BY p.total_xp DESC;
