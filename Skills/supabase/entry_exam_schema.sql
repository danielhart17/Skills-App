-- =============================================
-- ENTRY EXAM DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- Table for exam questions (separate from lesson questions)
CREATE TABLE IF NOT EXISTS exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    media_type TEXT CHECK (media_type IN ('image', 'video', NULL)),
    media_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store user exam results
CREATE TABLE IF NOT EXISTS entry_exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Score breakdown by difficulty
    beginner_correct INTEGER NOT NULL DEFAULT 0,
    beginner_total INTEGER NOT NULL DEFAULT 4,
    intermediate_correct INTEGER NOT NULL DEFAULT 0,
    intermediate_total INTEGER NOT NULL DEFAULT 4,
    advanced_correct INTEGER NOT NULL DEFAULT 0,
    advanced_total INTEGER NOT NULL DEFAULT 4,
    
    -- Overall stats
    total_correct INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 12,
    percentage INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated starting level and XP
    starting_level INTEGER NOT NULL DEFAULT 1,
    starting_xp INTEGER NOT NULL DEFAULT 0,
    
    -- Time spent (seconds)
    time_spent INTEGER DEFAULT 0,
    
    -- Store individual question responses as JSONB
    question_responses JSONB DEFAULT '[]',
    
    UNIQUE(user_id) -- Each user can only have one entry exam result
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exam_questions_difficulty ON exam_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_questions_active ON exam_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_entry_exam_results_user ON entry_exam_results(user_id);

-- RLS Policies
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_exam_results ENABLE ROW LEVEL SECURITY;

-- Everyone can read exam questions (they're public)
CREATE POLICY "Anyone can read active exam questions"
    ON exam_questions FOR SELECT
    USING (is_active = true);

-- Only admins can insert/update/delete exam questions
CREATE POLICY "Admins can manage exam questions"
    ON exam_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can only see their own exam results
CREATE POLICY "Users can view their own exam results"
    ON entry_exam_results FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own exam result (only once)
CREATE POLICY "Users can insert their own exam result"
    ON entry_exam_results FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add entry_exam_completed flag to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS entry_exam_completed BOOLEAN DEFAULT false;

-- =============================================
-- SAMPLE EXAM QUESTIONS (You can modify these)
-- =============================================

-- BEGINNER QUESTIONS (4)
INSERT INTO exam_questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, order_index) VALUES
('What is the standard height of an NBA basketball hoop?', '9 feet', '10 feet', '11 feet', '12 feet', 'B', 'The NBA regulation hoop height is 10 feet (3.05 meters) from the floor to the top of the rim.', 'beginner', 1),
('How many players from each team are on the court during a basketball game?', '4', '5', '6', '7', 'B', 'Each team has 5 players on the court at a time: typically a point guard, shooting guard, small forward, power forward, and center.', 'beginner', 2),
('What is a "dribble" in basketball?', 'Passing the ball to a teammate', 'Bouncing the ball while moving', 'Shooting the ball', 'Blocking a shot', 'B', 'Dribbling is bouncing the ball continuously with one hand while moving around the court.', 'beginner', 3),
('How many points is a shot worth from behind the three-point line?', '1 point', '2 points', '3 points', '4 points', 'C', 'Shots made from beyond the three-point arc are worth 3 points.', 'beginner', 4);

-- INTERMEDIATE QUESTIONS (4)
INSERT INTO exam_questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, order_index) VALUES
('What is a "pick and roll" play?', 'A player picks up the ball and rolls it to a teammate', 'A screen is set and the screener rolls to the basket', 'A player rolls on the ground to get the ball', 'The ball is picked up after it rolls out of bounds', 'B', 'In a pick and roll, one player sets a screen (pick) for the ball handler, then cuts (rolls) toward the basket looking for a pass.', 'intermediate', 1),
('What is the "key" or "paint" area on a basketball court?', 'The three-point line', 'The rectangular area near the basket', 'The half-court line', 'The area behind the backboard', 'B', 'The key (or paint) is the rectangular area extending from the baseline under the basket to the free-throw line.', 'intermediate', 2),
('What happens when a player commits a "travel" violation?', 'They get a free throw', 'The opposing team gets the ball', 'They are ejected from the game', 'The shot still counts', 'B', 'A travel (moving without dribbling) results in a turnover - the opposing team gets possession.', 'intermediate', 3),
('What is a "triple-double" in basketball?', 'Scoring 30+ points in a game', 'Making 3 three-pointers in a row', 'Recording double digits in 3 statistical categories', 'Playing 3 games in a row', 'C', 'A triple-double is when a player records double-digit numbers in three of these categories: points, rebounds, assists, steals, or blocks.', 'intermediate', 4);

-- ADVANCED QUESTIONS (4)
INSERT INTO exam_questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, order_index) VALUES
('In the "horns" offensive set, where are the two big men positioned?', 'Both at the low blocks', 'Both at the elbows (free-throw line extended)', 'One at each corner', 'Both at half-court', 'B', 'In the horns set, two big men position at each elbow (the corners where the free-throw line meets the lane), creating spacing for drives or pick options.', 'advanced', 1),
('What defensive principle does "weak side help" refer to?', 'The closest defender helps on the ball', 'Defenders away from the ball position to help stop drives', 'Double-teaming the post player', 'Pressing the inbound pass', 'B', 'Weak side help means defenders on the opposite side of the ball sag toward the paint to help defend penetration while still being able to recover to their man.', 'advanced', 2),
('What is the purpose of a "zone 2-3 defense"?', 'Man-to-man coverage with switching', 'Protecting the paint with 3 players near the basket', 'Full-court press defense', 'Trapping in the corners', 'B', 'A 2-3 zone has 2 players up top and 3 across the baseline/low blocks, prioritizing paint protection and contesting perimeter shots.', 'advanced', 3),
('In transition offense, what does "rim running" mean?', 'Running around the three-point line', 'A big man sprinting to the basket for easy scores', 'Running the ball up the sideline', 'Practicing layup drills', 'B', 'Rim running is when a big man sprints directly toward the rim in transition, looking for lob passes or offensive rebounds.', 'advanced', 4);

-- =============================================
-- FUNCTION TO CALCULATE STARTING LEVEL/XP
-- =============================================
CREATE OR REPLACE FUNCTION calculate_exam_rewards(
    p_beginner_correct INTEGER,
    p_intermediate_correct INTEGER,
    p_advanced_correct INTEGER
) RETURNS TABLE(starting_level INTEGER, starting_xp INTEGER) AS $$
DECLARE
    v_xp INTEGER := 0;
    v_level INTEGER := 1;
BEGIN
    -- XP Calculation:
    -- Beginner correct: 10 XP each
    -- Intermediate correct: 25 XP each
    -- Advanced correct: 50 XP each
    v_xp := (p_beginner_correct * 10) + 
            (p_intermediate_correct * 25) + 
            (p_advanced_correct * 50);
    
    -- Level Calculation based on total XP:
    -- 0-50 XP: Level 1
    -- 51-150 XP: Level 2
    -- 151-300 XP: Level 3
    -- 301+ XP: Level 4
    IF v_xp <= 50 THEN
        v_level := 1;
    ELSIF v_xp <= 150 THEN
        v_level := 2;
    ELSIF v_xp <= 300 THEN
        v_level := 3;
    ELSE
        v_level := 4;
    END IF;
    
    RETURN QUERY SELECT v_level, v_xp;
END;
$$ LANGUAGE plpgsql;
