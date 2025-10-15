-- Migration: Replace modules with questions for lessons
-- This creates a questions table and user_question_progress table

-- =============================================
-- QUESTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'none')),
  media_url TEXT,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER QUESTION PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_question_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  selected_answer TEXT CHECK (selected_answer IN ('A', 'B', 'C', 'D')),
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- =============================================
-- USER LESSON ATTEMPTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_lesson_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  passed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON public.questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_question_progress_user_id ON public.user_question_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_progress_lesson_id ON public.user_question_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_attempts_user_id ON public.user_lesson_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_attempts_lesson_id ON public.user_lesson_attempts(lesson_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Questions: Everyone can read, only admins can modify
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are viewable by everyone" ON public.questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- User Question Progress: Users can only see and manage their own
ALTER TABLE public.user_question_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own question progress" ON public.user_question_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own question progress" ON public.user_question_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question progress" ON public.user_question_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- User Lesson Attempts: Users can only see and create their own
ALTER TABLE public.user_lesson_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson attempts" ON public.user_lesson_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lesson attempts" ON public.user_lesson_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp automatically
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically calculate percentage for lesson attempts
CREATE OR REPLACE FUNCTION calculate_lesson_attempt_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_questions > 0 THEN
    NEW.percentage = (NEW.correct_answers::DECIMAL / NEW.total_questions::DECIMAL) * 100;
    NEW.passed = NEW.percentage >= 80;
  ELSE
    NEW.percentage = 0;
    NEW.passed = false;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_lesson_attempt_percentage_trigger 
BEFORE INSERT OR UPDATE ON public.user_lesson_attempts
  FOR EACH ROW EXECUTE FUNCTION calculate_lesson_attempt_percentage();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get user's lesson attempt status
CREATE OR REPLACE FUNCTION get_user_lesson_status(p_user_id UUID, p_lesson_id UUID)
RETURNS TABLE (
  has_attempted BOOLEAN,
  last_percentage DECIMAL,
  passed BOOLEAN,
  attempts_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) > 0 as has_attempted,
    MAX(percentage) as last_percentage,
    BOOL_OR(passed) as passed,
    COUNT(*) as attempts_count
  FROM public.user_lesson_attempts
  WHERE user_id = p_user_id AND lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get lesson questions count
CREATE OR REPLACE FUNCTION get_lesson_questions_count(p_lesson_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM public.questions WHERE lesson_id = p_lesson_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

