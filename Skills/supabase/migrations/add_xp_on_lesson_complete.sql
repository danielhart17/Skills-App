-- =============================================
-- HELPER FUNCTION: Calculate level from XP
-- =============================================
CREATE OR REPLACE FUNCTION calculate_level_from_xp(p_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF p_xp < 100 THEN RETURN 1;
    ELSIF p_xp < 250 THEN RETURN 2;
    ELSIF p_xp < 450 THEN RETURN 3;
    ELSIF p_xp < 700 THEN RETURN 4;
    ELSIF p_xp < 1000 THEN RETURN 5;
    ELSE RETURN 5 + ((p_xp - 1000) / 300) + 1;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- TRIGGER 1: Add XP when lesson is passed via user_lesson_attempts
-- This is used by iOS app
-- =============================================
CREATE OR REPLACE FUNCTION add_lesson_attempt_xp()
RETURNS TRIGGER AS $$
DECLARE
    v_lesson_xp INTEGER;
    v_current_xp INTEGER;
    v_new_xp INTEGER;
    v_already_passed BOOLEAN;
BEGIN
    -- Only process if this attempt passed
    IF NEW.passed = true THEN
        -- Check if user already passed this lesson before (to avoid double XP)
        SELECT EXISTS(
            SELECT 1 FROM public.user_lesson_attempts
            WHERE user_id = NEW.user_id 
              AND lesson_id = NEW.lesson_id 
              AND passed = true
              AND id != NEW.id
        ) INTO v_already_passed;
        
        -- Only add XP if this is the FIRST time passing
        IF NOT v_already_passed THEN
            -- Get the lesson's XP reward
            SELECT COALESCE(xp_reward, 50) INTO v_lesson_xp
            FROM public.lessons
            WHERE id = NEW.lesson_id;
            
            -- Get user's current XP
            SELECT COALESCE(total_xp, 0) INTO v_current_xp
            FROM public.profiles
            WHERE id = NEW.user_id;
            
            -- Calculate new XP
            v_new_xp := v_current_xp + v_lesson_xp;
            
            -- Update user's profile
            UPDATE public.profiles
            SET 
                total_xp = v_new_xp,
                current_level = calculate_level_from_xp(v_new_xp),
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
            RAISE NOTICE 'Lesson XP: Added % XP to user %. New total: %', 
                v_lesson_xp, NEW.user_id, v_new_xp;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_lesson_attempts
DROP TRIGGER IF EXISTS lesson_attempt_xp_trigger ON public.user_lesson_attempts;
CREATE TRIGGER lesson_attempt_xp_trigger
AFTER INSERT ON public.user_lesson_attempts
FOR EACH ROW
EXECUTE FUNCTION add_lesson_attempt_xp();

-- =============================================
-- TRIGGER 2: Add XP when challenge is completed
-- =============================================
CREATE OR REPLACE FUNCTION add_challenge_xp()
RETURNS TRIGGER AS $$
DECLARE
    v_challenge_xp INTEGER;
    v_current_xp INTEGER;
    v_new_xp INTEGER;
BEGIN
    -- Only process if newly completed
    IF NEW.is_completed = true AND (OLD IS NULL OR OLD.is_completed = false) THEN
        -- Get the challenge's XP reward
        SELECT COALESCE(xp_reward, 100) INTO v_challenge_xp
        FROM public.challenges
        WHERE id = NEW.challenge_id;
        
        -- Get user's current XP
        SELECT COALESCE(total_xp, 0) INTO v_current_xp
        FROM public.profiles
        WHERE id = NEW.user_id;
        
        -- Calculate new XP
        v_new_xp := v_current_xp + v_challenge_xp;
        
        -- Update user's profile
        UPDATE public.profiles
        SET 
            total_xp = v_new_xp,
            current_level = calculate_level_from_xp(v_new_xp),
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        RAISE NOTICE 'Challenge XP: Added % XP to user %. New total: %', 
            v_challenge_xp, NEW.user_id, v_new_xp;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on challenge_progress (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_progress') THEN
        DROP TRIGGER IF EXISTS challenge_xp_trigger ON public.challenge_progress;
        CREATE TRIGGER challenge_xp_trigger
        AFTER INSERT OR UPDATE ON public.challenge_progress
        FOR EACH ROW
        EXECUTE FUNCTION add_challenge_xp();
    END IF;
END $$;

-- =============================================
-- NOTE: XP for lessons comes ONLY from user_lesson_attempts trigger
-- The user_progress table is for tracking completion status (UI purposes)
-- We don't add XP from user_progress to avoid double counting
-- =============================================

-- Remove any existing lesson XP trigger from user_progress to prevent double XP
DROP TRIGGER IF EXISTS lesson_xp_trigger ON public.user_progress;

-- Also remove from lesson_progress if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lesson_progress') THEN
        DROP TRIGGER IF EXISTS lesson_progress_xp_trigger ON public.lesson_progress;
    END IF;
END $$;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON FUNCTION calculate_level_from_xp IS 'Calculate user level based on total XP';
COMMENT ON FUNCTION add_lesson_attempt_xp IS 'Adds XP when lesson is passed via user_lesson_attempts (primary source)';
COMMENT ON FUNCTION add_challenge_xp IS 'Adds XP when challenge is completed';
