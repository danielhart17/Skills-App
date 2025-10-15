-- Migration: Add Chapter and Module System with Enhanced Progress Tracking
-- This creates a hierarchical structure: Chapters > Lessons > Modules
-- and tracks user progress at each level

-- =============================================
-- 1. CREATE CHAPTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('iq', 'oncourt')),
  order_index INTEGER NOT NULL, -- For ordering chapters
  icon TEXT, -- Icon name or URL
  estimated_time INTEGER, -- Total estimated time in minutes
  total_xp INTEGER DEFAULT 0, -- Total XP available in this chapter
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. CREATE MODULES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  module_type TEXT NOT NULL CHECK (module_type IN ('video', 'quiz', 'reading', 'interactive', 'practice')),
  order_index INTEGER NOT NULL, -- Order within the lesson
  content JSONB, -- Flexible storage for module-specific content (video URL, quiz questions, etc.)
  estimated_time INTEGER, -- Time in minutes
  xp_reward INTEGER DEFAULT 0,
  passing_score INTEGER, -- For quizzes (percentage needed to pass)
  is_required BOOLEAN DEFAULT true, -- Whether module must be completed to complete lesson
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. UPDATE LESSONS TABLE
-- =============================================
-- Add foreign key to chapters table and remove the TEXT chapter field
ALTER TABLE public.lessons 
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS order_index INTEGER,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON public.lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_modules_lesson_id ON public.modules(lesson_id);

-- =============================================
-- 4. CREATE CHAPTER PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.chapter_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_lessons INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

-- =============================================
-- 5. CREATE LESSON PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_modules INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- =============================================
-- 6. CREATE MODULE PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_spent_seconds INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  -- Quiz-specific fields
  score DECIMAL(5,2), -- Percentage score for quizzes
  answers JSONB, -- Store quiz answers
  -- Video-specific fields
  video_progress_seconds INTEGER DEFAULT 0,
  video_watched_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- =============================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_chapter_progress_user_id ON public.chapter_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_progress_chapter_id ON public.chapter_progress(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_chapter_id ON public.lesson_progress(chapter_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_user_id ON public.module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module_id ON public.module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_lesson_id ON public.module_progress(lesson_id);

-- =============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

-- Chapters: Public read access
CREATE POLICY "Chapters are viewable by everyone" ON public.chapters
  FOR SELECT USING (true);

-- Admins can manage chapters
CREATE POLICY "Admins can manage chapters" ON public.chapters
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Modules: Public read access
CREATE POLICY "Modules are viewable by everyone" ON public.modules
  FOR SELECT USING (true);

-- Admins can manage modules
CREATE POLICY "Admins can manage modules" ON public.modules
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Chapter Progress: Users can only see and manage their own
CREATE POLICY "Users can view own chapter progress" ON public.chapter_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chapter progress" ON public.chapter_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chapter progress" ON public.chapter_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Lesson Progress: Users can only see and manage their own
CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Module Progress: Users can only see and manage their own
CREATE POLICY "Users can view own module progress" ON public.module_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own module progress" ON public.module_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own module progress" ON public.module_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 9. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =============================================

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapter_progress_updated_at BEFORE UPDATE ON public.chapter_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_progress_updated_at BEFORE UPDATE ON public.module_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 10. FUNCTIONS FOR PROGRESS CALCULATION
-- =============================================

-- Function to update lesson progress when a module is completed
CREATE OR REPLACE FUNCTION update_lesson_progress_on_module_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_total_modules INTEGER;
  v_completed_modules INTEGER;
  v_completion_percentage DECIMAL(5,2);
  v_total_xp INTEGER;
BEGIN
  -- Count total and completed modules for this lesson
  SELECT COUNT(*) INTO v_total_modules
  FROM public.modules
  WHERE lesson_id = NEW.lesson_id;

  SELECT COUNT(*) INTO v_completed_modules
  FROM public.module_progress
  WHERE lesson_id = NEW.lesson_id 
    AND user_id = NEW.user_id 
    AND is_completed = true;

  -- Calculate completion percentage
  v_completion_percentage := (v_completed_modules::DECIMAL / v_total_modules::DECIMAL) * 100;

  -- Calculate total XP earned
  SELECT COALESCE(SUM(m.xp_reward), 0) INTO v_total_xp
  FROM public.module_progress mp
  JOIN public.modules m ON m.id = mp.module_id
  WHERE mp.lesson_id = NEW.lesson_id 
    AND mp.user_id = NEW.user_id 
    AND mp.is_completed = true;

  -- Update or insert lesson progress
  INSERT INTO public.lesson_progress (
    user_id, 
    lesson_id, 
    chapter_id,
    completed_modules, 
    total_modules, 
    completion_percentage,
    xp_earned,
    is_completed,
    completed_at,
    last_accessed_at
  )
  VALUES (
    NEW.user_id,
    NEW.lesson_id,
    (SELECT chapter_id FROM public.lessons WHERE id = NEW.lesson_id),
    v_completed_modules,
    v_total_modules,
    v_completion_percentage,
    v_total_xp,
    (v_completed_modules = v_total_modules),
    CASE WHEN v_completed_modules = v_total_modules THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, lesson_id) 
  DO UPDATE SET
    completed_modules = v_completed_modules,
    total_modules = v_total_modules,
    completion_percentage = v_completion_percentage,
    xp_earned = v_total_xp,
    is_completed = (v_completed_modules = v_total_modules),
    completed_at = CASE WHEN v_completed_modules = v_total_modules THEN COALESCE(public.lesson_progress.completed_at, NOW()) ELSE NULL END,
    last_accessed_at = NOW();

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER module_progress_completed_trigger
AFTER INSERT OR UPDATE ON public.module_progress
  FOR EACH ROW 
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION update_lesson_progress_on_module_complete();

-- Function to update chapter progress when a lesson is completed
CREATE OR REPLACE FUNCTION update_chapter_progress_on_lesson_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_chapter_id UUID;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_completion_percentage DECIMAL(5,2);
  v_total_xp INTEGER;
BEGIN
  -- Get chapter_id from lesson
  SELECT chapter_id INTO v_chapter_id
  FROM public.lessons
  WHERE id = NEW.lesson_id;

  IF v_chapter_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total and completed lessons for this chapter
  SELECT COUNT(*) INTO v_total_lessons
  FROM public.lessons
  WHERE chapter_id = v_chapter_id AND is_active = true;

  SELECT COUNT(*) INTO v_completed_lessons
  FROM public.lesson_progress
  WHERE chapter_id = v_chapter_id 
    AND user_id = NEW.user_id 
    AND is_completed = true;

  -- Calculate completion percentage
  v_completion_percentage := (v_completed_lessons::DECIMAL / v_total_lessons::DECIMAL) * 100;

  -- Calculate total XP earned in this chapter
  SELECT COALESCE(SUM(xp_earned), 0) INTO v_total_xp
  FROM public.lesson_progress
  WHERE chapter_id = v_chapter_id 
    AND user_id = NEW.user_id 
    AND is_completed = true;

  -- Update or insert chapter progress
  INSERT INTO public.chapter_progress (
    user_id,
    chapter_id,
    completed_lessons,
    total_lessons,
    completion_percentage,
    total_xp_earned,
    is_completed,
    completed_at,
    last_accessed_at
  )
  VALUES (
    NEW.user_id,
    v_chapter_id,
    v_completed_lessons,
    v_total_lessons,
    v_completion_percentage,
    v_total_xp,
    (v_completed_lessons = v_total_lessons),
    CASE WHEN v_completed_lessons = v_total_lessons THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id, chapter_id)
  DO UPDATE SET
    completed_lessons = v_completed_lessons,
    total_lessons = v_total_lessons,
    completion_percentage = v_completion_percentage,
    total_xp_earned = v_total_xp,
    is_completed = (v_completed_lessons = v_total_lessons),
    completed_at = CASE WHEN v_completed_lessons = v_total_lessons THEN COALESCE(public.chapter_progress.completed_at, NOW()) ELSE NULL END,
    last_accessed_at = NOW();

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER lesson_progress_completed_trigger
AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW 
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION update_chapter_progress_on_lesson_complete();

-- =============================================
-- 11. MIGRATION DATA
-- =============================================

-- Migrate existing lessons to use chapter_id instead of chapter text
-- First, create chapters from existing chapter names
INSERT INTO public.chapters (title, mode, order_index, description, is_active)
SELECT DISTINCT 
  chapter,
  mode,
  ROW_NUMBER() OVER (PARTITION BY mode ORDER BY MIN(level)) as order_index,
  'Chapter on ' || chapter as description,
  true
FROM public.lessons
WHERE chapter IS NOT NULL
GROUP BY chapter, mode
ON CONFLICT (title) DO NOTHING;

-- Update lessons to reference the new chapter_id
UPDATE public.lessons l
SET chapter_id = c.id,
    order_index = l.level
FROM public.chapters c
WHERE l.chapter = c.title;

-- Note: The old 'chapter' TEXT column is kept for backward compatibility
-- You can drop it later with: ALTER TABLE public.lessons DROP COLUMN chapter;

COMMENT ON TABLE public.chapters IS 'Chapters organize lessons into themed learning paths';
COMMENT ON TABLE public.modules IS 'Modules are individual learning units within lessons (videos, quizzes, etc.)';
COMMENT ON TABLE public.chapter_progress IS 'Tracks user progress through entire chapters';
COMMENT ON TABLE public.lesson_progress IS 'Tracks user progress through individual lessons';
COMMENT ON TABLE public.module_progress IS 'Tracks user progress through individual modules with detailed metrics';

