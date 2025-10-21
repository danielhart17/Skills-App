-- Migration Script: Move Drills to Challenges
-- This script adds new columns to challenges table and migrates drills data

-- =============================================
-- STEP 1: Add new columns to challenges table
-- =============================================

-- Add setup column (text field for drill setup instructions)
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS setup TEXT;

-- Add instructions column (text field for step-by-step instructions)
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Add space_required column (text field for space requirements)
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS space_required TEXT;

-- Add players_needed column (might be useful to keep)
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS players_needed INTEGER DEFAULT 1;

-- Add purpose column (to preserve the purpose field from drills)
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS purpose TEXT;

-- Add focus column (to preserve the focus areas from drills)
ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS focus TEXT;

-- Update the challenges table comment
COMMENT ON COLUMN public.challenges.setup IS 'Setup instructions for the drill/challenge';
COMMENT ON COLUMN public.challenges.instructions IS 'Step-by-step instructions for completing the drill/challenge';
COMMENT ON COLUMN public.challenges.space_required IS 'Description of space requirements (e.g., "Full court", "Half court", "10x10 area")';
COMMENT ON COLUMN public.challenges.players_needed IS 'Number of players needed for the drill/challenge';
COMMENT ON COLUMN public.challenges.purpose IS 'The purpose or objective of the drill/challenge';
COMMENT ON COLUMN public.challenges.focus IS 'Focus areas or key skills being developed';

-- =============================================
-- STEP 2: Migrate drills to challenges
-- =============================================

-- Insert all drills into challenges table
INSERT INTO public.challenges (
    title,
    description,
    category,
    difficulty,
    duration_minutes,
    xp_reward,
    equipment_needed,
    is_featured,
    trainer_id,
    setup,
    instructions,
    space_required,
    players_needed,
    purpose,
    focus,
    created_at,
    updated_at
)
SELECT 
    d.title,
    -- Combine description with any additional context
    d.description,
    d.category,
    d.difficulty,
    d.duration_minutes,
    -- Calculate XP reward based on difficulty and duration
    CASE 
        WHEN d.difficulty = 'beginner' THEN d.duration_minutes * 5
        WHEN d.difficulty = 'intermediate' THEN d.duration_minutes * 7
        WHEN d.difficulty = 'advanced' THEN d.duration_minutes * 10
        ELSE d.duration_minutes * 5
    END as xp_reward,
    d.equipment_needed,
    false as is_featured, -- Default to not featured
    d.created_by as trainer_id,
    d.setup,
    d.instructions,
    d.space_required,
    d.players_needed,
    d.purpose,
    d.focus,
    d.created_at,
    d.updated_at
FROM public.drills d
WHERE d.is_active = true -- Only migrate active drills
ON CONFLICT DO NOTHING; -- Skip if somehow already exists

-- =============================================
-- STEP 3: Verification queries
-- =============================================

-- Show count of drills migrated
DO $$
DECLARE
    drills_count INTEGER;
    challenges_added INTEGER;
BEGIN
    SELECT COUNT(*) INTO drills_count FROM public.drills WHERE is_active = true;
    SELECT COUNT(*) INTO challenges_added FROM public.challenges WHERE purpose IS NOT NULL; -- Purpose only exists in migrated drills
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  Active drills in drills table: %', drills_count;
    RAISE NOTICE '  Drills migrated to challenges: %', challenges_added;
END $$;

-- =============================================
-- OPTIONAL: Drop drills-related tables
-- =============================================
-- Uncomment these lines ONLY after verifying the migration was successful
-- and you're ready to remove the old drills system

-- Drop drill_progress table
-- DROP TABLE IF EXISTS public.drill_progress CASCADE;

-- Drop drill_ratings table  
-- DROP TABLE IF EXISTS public.drill_ratings CASCADE;

-- Drop drills table
-- DROP TABLE IF EXISTS public.drills CASCADE;

-- =============================================
-- NOTES:
-- =============================================
-- 1. This script only migrates ACTIVE drills (is_active = true)
-- 2. XP rewards are calculated as: duration * multiplier (5/7/10 based on difficulty)
-- 3. All drills are set to is_featured = false by default
-- 4. The drills table is NOT dropped automatically - you must manually drop it after verification
-- 5. If you want to migrate inactive drills too, remove the WHERE clause in the INSERT
-- 6. The drill_ratings and drill_progress tables can be dropped if no longer needed

