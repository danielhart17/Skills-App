-- Add Fundamentals Chapter IQ Mode Lessons
-- Modules 2-5: Advanced Basketball IQ Concepts

INSERT INTO public.lessons (title, description, mode, chapter, difficulty, level, estimated_time, xp_reward)
VALUES
  (
    'Reading the Defense',
    'Discover how to identify defensive formations like man-to-man, zone, and press. Learn visual cues to recognize traps, switches, and help defense — and what decisions to make in each situation.

Key Lessons:
• How to spot a zone vs. man defense
• Reading defender body language
• Recognizing gaps in defensive coverage
• When to drive, pass, or pull up',
    'iq',
    'Fundamentals',
    'intermediate',
    2,
    12,
    60
  ),
  (
    'Off-Ball Movement & Timing',
    'Learn how great players impact the game even without the ball. Study movement patterns like cuts, flares, and backdoors, and how to use screens effectively to create space and open shots.

Key Lessons:
• Using screens (on-ball and off-ball)
• Timing your cuts to the rhythm of the play
• How to keep your defender occupied
• Creating lanes for teammates',
    'iq',
    'Fundamentals',
    'intermediate',
    3,
    15,
    75
  ),
  (
    'Decision Making Under Pressure',
    'Basketball IQ shines when the clock is ticking down. This module focuses on quick decision-making in transition, recognizing mismatches, and adapting plays in real time.

Key Lessons:
• Fast-break decision flow
• Recognizing mismatches and exploiting them
• Late-game situational awareness
• Maintaining composure when pressured',
    'iq',
    'Fundamentals',
    'advanced',
    4,
    18,
    100
  ),
  (
    'Anticipation & Play Prediction',
    'Elite players don''t just react — they anticipate. This final module teaches you to read tendencies, predict plays, and think one step ahead both offensively and defensively.

Key Lessons:
• Studying opponents'' patterns
• Anticipating passes and rotations
• Using "one-ahead thinking"
• Developing mental quickness',
    'iq',
    'Fundamentals',
    'advanced',
    5,
    20,
    120
  );

-- Verify the inserted lessons
SELECT 
  id,
  title,
  difficulty,
  level,
  estimated_time,
  xp_reward,
  chapter
FROM public.lessons
WHERE chapter = 'Fundamentals' AND mode = 'iq'
ORDER BY level;

