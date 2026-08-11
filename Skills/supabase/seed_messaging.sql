-- Messaging seed data (dev / QA only)
-- Run AFTER: add_messaging_system.sql
--
-- You need two auth users (one trainer, one athlete). This script wires them
-- together with an active connection, a conversation, and sample messages.

-- =============================================
-- STEP 1: Look up user IDs (run this first)
-- =============================================
-- SELECT u.id, u.email, p.role, p.full_name
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- ORDER BY u.created_at DESC;

-- =============================================
-- STEP 2: Set emails for your test accounts
-- =============================================
-- Change these to match accounts you can sign in with in the app.
-- The trainer account should have profiles.role = 'trainer'
-- The athlete account should have profiles.role = 'athlete' or 'user'

DO $$
DECLARE
  v_trainer_email TEXT := 'trainer@skills.test';   -- <-- change me
  v_athlete_email TEXT := 'athlete@skills.test';   -- <-- change me

  v_trainer_id UUID;
  v_athlete_id UUID;
  v_conv_id UUID;
  v_msg_id UUID;
  v_tomorrow DATE := (CURRENT_DATE + INTERVAL '1 day')::DATE;
BEGIN
  SELECT id INTO v_trainer_id FROM auth.users WHERE email = v_trainer_email;
  SELECT id INTO v_athlete_id FROM auth.users WHERE email = v_athlete_email;

  IF v_trainer_id IS NULL THEN
    RAISE EXCEPTION 'Trainer not found for email: %. Create the user in Supabase Auth first.', v_trainer_email;
  END IF;
  IF v_athlete_id IS NULL THEN
    RAISE EXCEPTION 'Athlete not found for email: %. Create the user in Supabase Auth first.', v_athlete_email;
  END IF;

  -- Ensure profile roles (safe if profiles already exist from signup trigger)
  INSERT INTO public.profiles (id, email, full_name, role)
  SELECT v_trainer_id, v_trainer_email, 'Coach Test', 'trainer'
  ON CONFLICT (id) DO UPDATE SET role = 'trainer';

  INSERT INTO public.profiles (id, email, full_name, role)
  SELECT v_athlete_id, v_athlete_email, 'Player Test', 'athlete'
  ON CONFLICT (id) DO UPDATE SET role = 'athlete';

  -- Active connection
  INSERT INTO public.trainer_athlete_connections (trainer_id, athlete_id, status)
  VALUES (v_trainer_id, v_athlete_id, 'active')
  ON CONFLICT (trainer_id, athlete_id) DO UPDATE SET status = 'active';

  -- Conversation
  INSERT INTO public.conversations (trainer_id, athlete_id, last_message_at)
  VALUES (v_trainer_id, v_athlete_id, NOW())
  ON CONFLICT (trainer_id, athlete_id) DO UPDATE SET last_message_at = NOW()
  RETURNING id INTO v_conv_id;

  IF v_conv_id IS NULL THEN
    SELECT id INTO v_conv_id FROM public.conversations
    WHERE trainer_id = v_trainer_id AND athlete_id = v_athlete_id;
  END IF;

  -- Clear old seed messages (re-runnable)
  DELETE FROM public.messages WHERE conversation_id = v_conv_id;

  -- 1) Trainer welcome text
  INSERT INTO public.messages (
    conversation_id, sender_id, receiver_id, body, message_type, created_at
  ) VALUES (
    v_conv_id,
    v_trainer_id,
    v_athlete_id,
    'Hey! Welcome to Skills messaging. Check out the workout I sent below.',
    'text',
    NOW() - INTERVAL '2 hours'
  );

  -- 2) Trainer workout message
  INSERT INTO public.messages (
    conversation_id, sender_id, receiver_id, body, message_type, workout_payload, created_at
  ) VALUES (
    v_conv_id,
    v_trainer_id,
    v_athlete_id,
    NULL,
    'workout',
    jsonb_build_object(
      'title', 'Ball Handling & Finishing',
      'scheduled_date', v_tomorrow::TEXT,
      'scheduled_time', '09:00',
      'intensity', 'Medium',
      'drills', jsonb_build_array(
        jsonb_build_object('name', 'Two-Ball Pound', 'sets', '3x30 sec', 'notes', 'Eyes up'),
        jsonb_build_object('name', 'Mikan Layups', 'sets', '3x10 each side', 'notes', 'Soft touch'),
        jsonb_build_object('name', 'Cone Attack', 'sets', '4x full court', 'notes', 'Change pace')
      ),
      'trainer_notes', 'Focus on weak-hand finishes today. Film yourself on the last set if you can.'
    ),
    NOW() - INTERVAL '90 minutes'
  );

  -- 3) Athlete reply
  INSERT INTO public.messages (
    conversation_id, sender_id, receiver_id, body, message_type, created_at
  ) VALUES (
    v_conv_id,
    v_athlete_id,
    v_trainer_id,
    'Got it coach — I''ll add it to my calendar and hit it tomorrow morning.',
    'text',
    NOW() - INTERVAL '45 minutes'
  );

  -- 4) Film feedback (unread for athlete if you open as trainer last — swap read_at as needed)
  INSERT INTO public.messages (
    conversation_id, sender_id, receiver_id, body, message_type, created_at, read_at
  ) VALUES (
    v_conv_id,
    v_trainer_id,
    v_athlete_id,
    E'Game: vs CT Blackout 6/7\n\nTimestamp: 2:34 — defensive rotation\n\nYou were late on the weak-side closeout. Jump to the ball earlier on the pass.',
    'film_feedback',
    NOW() - INTERVAL '10 minutes',
    NULL
  ) RETURNING id INTO v_msg_id;

  -- Optional: seed athlete streak row for trainer athletes page
  INSERT INTO public.athlete_streaks (athlete_id, current_streak, longest_streak, last_checkin_date, total_xp, level)
  VALUES (v_athlete_id, 3, 5, CURRENT_DATE - 1, 275, 'Starter')
  ON CONFLICT (athlete_id) DO UPDATE SET
    current_streak = EXCLUDED.current_streak,
    longest_streak = EXCLUDED.longest_streak,
    last_checkin_date = EXCLUDED.last_checkin_date,
    total_xp = EXCLUDED.total_xp,
    level = EXCLUDED.level;

  UPDATE public.conversations
  SET last_message_at = NOW()
  WHERE id = v_conv_id;

  RAISE NOTICE 'Messaging seed complete.';
  RAISE NOTICE 'Trainer: % (%)', v_trainer_email, v_trainer_id;
  RAISE NOTICE 'Athlete: % (%)', v_athlete_email, v_athlete_id;
  RAISE NOTICE 'Conversation: %', v_conv_id;
END $$;

-- =============================================
-- Verify
-- =============================================
-- SELECT c.*, p1.full_name AS trainer, p2.full_name AS athlete
-- FROM conversations c
-- JOIN profiles p1 ON p1.id = c.trainer_id
-- JOIN profiles p2 ON p2.id = c.athlete_id;
--
-- SELECT message_type, body, workout_payload, created_at, read_at
-- FROM messages
-- ORDER BY created_at;
