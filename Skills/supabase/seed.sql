-- Skills Mock Data - Seed Script
-- Run this AFTER schema.sql to populate the database with sample data
-- Note: You'll need to create a user account first, then update the user_id references

-- =============================================
-- INSERT LESSONS
-- =============================================
INSERT INTO public.lessons (id, title, description, mode, chapter, difficulty, level, estimated_time, xp_reward)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Understanding Court Spacing', 'Learn the fundamentals of proper court spacing in basketball', 'iq', 'Fundamentals', 'beginner', 1, 10, 50),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Pick and Roll Defense', 'Master defensive strategies for pick and roll situations', 'iq', 'Defense', 'intermediate', 3, 15, 75),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'Ball Handling Drills', 'Improve your dribbling with these essential drills', 'oncourt', 'Skills', 'beginner', 1, 20, 60);

-- =============================================
-- INSERT TRAINERS
-- =============================================
INSERT INTO public.trainers (id, name, bio, specializations, years_experience, location, profile_image, verified, hourly_rate, rating)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'Coach Mike Johnson', 'Former NBA player with 15 years of coaching experience', ARRAY['shooting', 'offense'], 15, 'Los Angeles, CA', 'https://ui-avatars.com/api/?name=Mike+Johnson&size=200', true, 100.00, 4.80),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'Sarah Williams', 'College basketball coach specializing in defensive fundamentals', ARRAY['defense', 'fundamentals'], 10, 'New York, NY', 'https://ui-avatars.com/api/?name=Sarah+Williams&size=200', true, 85.00, 4.90);

-- =============================================
-- INSERT CHALLENGES
-- =============================================
INSERT INTO public.challenges (id, title, description, category, difficulty, duration_minutes, xp_reward, equipment_needed, is_featured, trainer_id)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, 'Perfect Form Shooter', 'Make 50 shots with perfect shooting form', 'shooting', 'beginner', 20, 100, ARRAY['Basketball', 'Hoop'], false, NULL),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'Elite Ball Handler', 'Complete advanced dribbling drills without losing control', 'dribbling', 'advanced', 30, 150, ARRAY['Basketball', 'Cones'], true, '10000000-0000-0000-0000-000000000001'::uuid);

-- =============================================
-- INSERT TRAINER SERVICES
-- =============================================
INSERT INTO public.trainer_services (id, trainer_id, name, description, price, duration_minutes)
VALUES
  ('30000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '1-on-1 Shooting Session', 'Personalized shooting technique and form improvement', 100.00, 60),
  ('30000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Group Skills Training', 'Small group training for offensive skills', 150.00, 90),
  ('30000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, 'Defensive Fundamentals', 'Master the basics of lockdown defense', 85.00, 60);

-- =============================================
-- INSERT TRAINING EVENTS
-- =============================================
INSERT INTO public.training_events (id, trainer_id, title, date, location, price, spots_available)
VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'Saturday Skills Camp', NOW() + INTERVAL '3 days', 'LA Sports Center', 50.00, 12);

-- =============================================
-- INSERT REVIEWS (without user_id for now)
-- =============================================
INSERT INTO public.reviews (id, trainer_id, user_id, user_name, rating, comment, date)
VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, NULL, 'John D.', 5, 'Excellent coach! Really helped improve my shooting form.', NOW() - INTERVAL '7 days'),
  ('50000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, NULL, 'Emily R.', 5, 'Very knowledgeable and patient. Highly recommend!', NOW() - INTERVAL '14 days');

-- =============================================
-- DEMO USER PROFILE
-- Note: First create a user via Supabase Auth, then use their ID here
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from auth.users
-- =============================================

-- Example (uncomment and replace with actual user ID after signup):
-- INSERT INTO public.profiles (id, email, full_name, current_level, total_xp, current_streak, longest_streak)
-- VALUES
--   ('YOUR_USER_ID_HERE'::uuid, 'demo@Skills.app', 'Demo Player', 5, 1250, 7, 14);

-- =============================================
-- DEMO SHOOTING SESSIONS (linked to user)
-- Note: Replace 'YOUR_USER_ID_HERE' with actual user ID
-- =============================================

-- Example (uncomment and replace with actual user ID):
-- INSERT INTO public.shooting_sessions (id, user_id, date, total_shots, made_shots, duration_seconds)
-- VALUES
--   ('session_001'::uuid, 'YOUR_USER_ID_HERE'::uuid, NOW() - INTERVAL '1 day', 50, 35, 1200),
--   ('session_002'::uuid, 'YOUR_USER_ID_HERE'::uuid, NOW() - INTERVAL '2 days', 40, 28, 900);

-- =============================================
-- HELPFUL QUERIES
-- =============================================

-- View all tables
-- SELECT * FROM public.lessons;
-- SELECT * FROM public.trainers;
-- SELECT * FROM public.challenges;
-- SELECT * FROM public.trainer_services;
-- SELECT * FROM public.training_events;
-- SELECT * FROM public.reviews;

-- Get your user ID after signup:
-- SELECT id, email FROM auth.users;

-- Check profile was created:
-- SELECT * FROM public.profiles;

