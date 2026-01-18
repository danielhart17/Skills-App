-- Add last_activity_date column for streak tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Add completed_lessons array if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS completed_lessons UUID[] DEFAULT '{}';

-- Add favorite_position column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS favorite_position VARCHAR(50);

-- Create function to update user activity streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_last_activity DATE;
    v_today DATE := CURRENT_DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Get user's current streak data
    SELECT 
        last_activity_date,
        current_streak,
        longest_streak
    INTO 
        v_last_activity,
        v_current_streak,
        v_longest_streak
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Initialize if null
    IF v_current_streak IS NULL THEN
        v_current_streak := 0;
    END IF;
    
    IF v_longest_streak IS NULL THEN
        v_longest_streak := 0;
    END IF;
    
    -- Check if this is a new day of activity
    IF v_last_activity IS NULL THEN
        -- First activity ever
        v_current_streak := 1;
    ELSIF v_last_activity = v_today THEN
        -- Already active today, no change needed
        RETURN;
    ELSIF v_last_activity = v_today - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        v_current_streak := v_current_streak + 1;
    ELSE
        -- Streak broken (missed a day or more)
        v_current_streak := 1;
    END IF;
    
    -- Update longest streak if current exceeds it
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;
    
    -- Update the profile
    UPDATE public.profiles
    SET 
        last_activity_date = v_today,
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_streak(UUID) TO authenticated;

-- Create trigger function to automatically update streak on various activities
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_streak(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on activity tables

-- Trigger when shooting session is saved
DROP TRIGGER IF EXISTS shooting_session_streak_trigger ON public.shooting_sessions;
CREATE TRIGGER shooting_session_streak_trigger
AFTER INSERT ON public.shooting_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_update_streak();

-- Trigger when lesson is completed (lesson_progress)
DROP TRIGGER IF EXISTS lesson_progress_streak_trigger ON public.lesson_progress;
CREATE TRIGGER lesson_progress_streak_trigger
AFTER INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW
WHEN (NEW.is_completed = true)
EXECUTE FUNCTION trigger_update_streak();

-- Trigger when challenge is completed (challenge_progress)
DROP TRIGGER IF EXISTS challenge_progress_streak_trigger ON public.challenge_progress;
CREATE TRIGGER challenge_progress_streak_trigger
AFTER INSERT OR UPDATE ON public.challenge_progress
FOR EACH ROW
WHEN (NEW.is_completed = true)
EXECUTE FUNCTION trigger_update_streak();

-- Comment explaining the streak system
COMMENT ON FUNCTION update_user_streak IS 'Updates user activity streak. Called when user completes a lesson, challenge, or shooting session. Increments streak if consecutive day, resets if gap.';
