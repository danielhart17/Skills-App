-- Migration: Remove mode column from lessons table
-- Since lessons are now exclusively for the "Learn" section and drills have their own table,
-- the mode column (iq/oncourt) is no longer needed.

-- Remove the mode column from lessons table
ALTER TABLE public.lessons DROP COLUMN IF EXISTS mode;

-- Note: This migration assumes you've already moved all "oncourt" lessons to the drills table
-- If you haven't done that yet, you should first:
-- 1. Export oncourt lessons
-- 2. Convert them to drills format
-- 3. Insert into drills table
-- 4. Then run this migration

