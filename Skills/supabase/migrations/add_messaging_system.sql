-- Messaging system: connections, conversations, messages, attachments
-- Run in Supabase SQL Editor before using messaging features

-- =============================================
-- trainer_athlete_connections
-- =============================================
CREATE TABLE IF NOT EXISTS public.trainer_athlete_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trainer_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_tac_trainer ON public.trainer_athlete_connections(trainer_id, status);
CREATE INDEX IF NOT EXISTS idx_tac_athlete ON public.trainer_athlete_connections(athlete_id, status);

-- =============================================
-- conversations (before messages)
-- =============================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trainer_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_trainer ON public.conversations(trainer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_athlete ON public.conversations(athlete_id, last_message_at DESC);

-- =============================================
-- messages
-- =============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'workout', 'film_feedback', 'media')),
  workout_payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages(receiver_id) WHERE read_at IS NULL;

-- =============================================
-- message_attachments
-- =============================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  file_name TEXT,
  file_size_bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments(message_id);

-- =============================================
-- RLS: trainer_athlete_connections
-- =============================================
ALTER TABLE public.trainer_athlete_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers view own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Trainers view own connections" ON public.trainer_athlete_connections
  FOR SELECT USING (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Athletes view own connections" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes view own connections" ON public.trainer_athlete_connections
  FOR SELECT USING (auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Trainers insert connections" ON public.trainer_athlete_connections;
CREATE POLICY "Trainers insert connections" ON public.trainer_athlete_connections
  FOR INSERT WITH CHECK (auth.uid() = trainer_id);

DROP POLICY IF EXISTS "Athletes update connection status" ON public.trainer_athlete_connections;
CREATE POLICY "Athletes update connection status" ON public.trainer_athlete_connections
  FOR UPDATE USING (auth.uid() = athlete_id);

-- =============================================
-- RLS: conversations
-- =============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read conversations" ON public.conversations;
CREATE POLICY "Participants read conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = trainer_id OR auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Participants insert conversations" ON public.conversations;
CREATE POLICY "Participants insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = trainer_id OR auth.uid() = athlete_id);

DROP POLICY IF EXISTS "Participants update conversations" ON public.conversations;
CREATE POLICY "Participants update conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = trainer_id OR auth.uid() = athlete_id);

-- =============================================
-- RLS: messages
-- =============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sender or receiver read messages" ON public.messages;
CREATE POLICY "Sender or receiver read messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Sender insert messages" ON public.messages;
CREATE POLICY "Sender insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Receiver update read_at" ON public.messages;
CREATE POLICY "Receiver update read_at" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- =============================================
-- RLS: message_attachments (via parent message)
-- =============================================
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read attachments" ON public.message_attachments;
CREATE POLICY "Participants read attachments" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Sender insert attachments" ON public.message_attachments;
CREATE POLICY "Sender insert attachments" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );

-- =============================================
-- Trainers read connected athlete streaks & check-ins
-- =============================================
DROP POLICY IF EXISTS "Trainers read connected athlete streaks" ON public.athlete_streaks;
CREATE POLICY "Trainers read connected athlete streaks" ON public.athlete_streaks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections c
      WHERE c.trainer_id = auth.uid()
        AND c.athlete_id = athlete_streaks.athlete_id
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Trainers read connected athlete checkins" ON public.daily_checkins;
CREATE POLICY "Trainers read connected athlete checkins" ON public.daily_checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trainer_athlete_connections c
      WHERE c.trainer_id = auth.uid()
        AND c.athlete_id = daily_checkins.athlete_id
        AND c.status = 'active'
    )
  );

-- =============================================
-- Storage bucket: message-media
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-media', 'message-media', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own message media" ON storage.objects;
CREATE POLICY "Users upload own message media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'message-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read message media they participate in" ON storage.objects;
CREATE POLICY "Users read message media they participate in" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.message_attachments ma
        JOIN public.messages m ON m.id = ma.message_id
        WHERE ma.file_url = storage.objects.name
        AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
      )
    )
  );

-- Enable Realtime (run if not already enabled for these tables)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
