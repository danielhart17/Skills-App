-- =============================================
-- DRILLS SYSTEM MIGRATION
-- =============================================
-- This migration creates a comprehensive drill system
-- separate from lessons, with ratings and progress tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- DRILLS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.drills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  purpose TEXT NOT NULL,
  setup TEXT NOT NULL,
  instructions TEXT NOT NULL,
  focus TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('shooting', 'dribbling', 'defense', 'passing', 'conditioning', 'footwork', 'rebounding', 'other')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  equipment_needed TEXT[] DEFAULT '{}',
  players_needed INTEGER DEFAULT 1,
  space_required TEXT DEFAULT 'Half court',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DRILL RATINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.drill_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  drill_id UUID REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, drill_id)
);

-- =============================================
-- DRILL PROGRESS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.drill_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  drill_id UUID REFERENCES public.drills(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, drill_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_drills_category ON public.drills(category);
CREATE INDEX IF NOT EXISTS idx_drills_difficulty ON public.drills(difficulty);
CREATE INDEX IF NOT EXISTS idx_drills_created_by ON public.drills(created_by);
CREATE INDEX IF NOT EXISTS idx_drills_active ON public.drills(is_active);
CREATE INDEX IF NOT EXISTS idx_drill_ratings_user_id ON public.drill_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_ratings_drill_id ON public.drill_ratings(drill_id);
CREATE INDEX IF NOT EXISTS idx_drill_progress_user_id ON public.drill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_progress_drill_id ON public.drill_progress(drill_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drill_progress ENABLE ROW LEVEL SECURITY;

-- Drills policies
CREATE POLICY "Drills are viewable by everyone" ON public.drills
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage drills" ON public.drills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can create drills" ON public.drills
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Drill ratings policies
CREATE POLICY "Users can view all drill ratings" ON public.drill_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own drill ratings" ON public.drill_ratings
  FOR ALL USING (user_id = auth.uid());

-- Drill progress policies
CREATE POLICY "Users can view their own drill progress" ON public.drill_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own drill progress" ON public.drill_progress
  FOR ALL USING (user_id = auth.uid());

-- =============================================
-- TRIGGERS
-- =============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drills_updated_at BEFORE UPDATE ON public.drills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drill_ratings_updated_at BEFORE UPDATE ON public.drill_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drill_progress_updated_at BEFORE UPDATE ON public.drill_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get drill average rating
CREATE OR REPLACE FUNCTION get_drill_average_rating(p_drill_id UUID)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0.0)
    FROM public.drill_ratings
    WHERE drill_id = p_drill_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get drill rating count
CREATE OR REPLACE FUNCTION get_drill_rating_count(p_drill_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.drill_ratings
    WHERE drill_id = p_drill_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's drill completion status
CREATE OR REPLACE FUNCTION get_user_drill_status(p_user_id UUID, p_drill_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(is_completed, false)
    FROM public.drill_progress
    WHERE user_id = p_user_id AND drill_id = p_drill_id
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample drills
INSERT INTO public.drills (title, description, purpose, setup, instructions, focus, category, difficulty, duration_minutes, equipment_needed, players_needed, space_required) VALUES
(
  'Form Shooting',
  'Perfect your shooting form with this fundamental drill',
  'To develop proper shooting mechanics and muscle memory',
  'Stand 3-5 feet from the basket with a basketball',
  '1. Start close to the basket (3-5 feet)\n2. Focus on proper form: BEEF (Balance, Eyes, Elbow, Follow-through)\n3. Shoot 10 shots with perfect form\n4. Move back 2 feet and repeat\n5. Continue until you reach the free throw line',
  'Shooting form, balance, follow-through',
  'shooting',
  'beginner',
  15,
  ARRAY['Basketball', 'Basket'],
  1,
  'Half court'
),
(
  'Mikan Drill',
  'Classic layup drill for both hands',
  'To improve layup technique and ambidexterity',
  'Stand under the basket with a basketball',
  '1. Start with right-handed layup\n2. Catch the ball and immediately go left-handed\n3. Continue alternating for 30 seconds\n4. Focus on using the backboard\n5. Keep the ball high and soft',
  'Layup technique, both hands, timing',
  'shooting',
  'beginner',
  10,
  ARRAY['Basketball', 'Basket'],
  1,
  'Half court'
),
(
  'Cone Dribbling',
  'Improve ball handling with cone work',
  'To enhance dribbling skills and ball control',
  'Set up 5 cones in a straight line, 3 feet apart',
  '1. Start at the first cone\n2. Dribble around each cone using different moves\n3. Use crossover, between legs, behind back\n4. Keep your head up and stay low\n5. Complete 3 rounds with each hand',
  'Ball handling, control, head up',
  'dribbling',
  'intermediate',
  20,
  ARRAY['Basketball', '5 Cones'],
  1,
  'Half court'
),
(
  'Defensive Slides',
  'Master defensive footwork and positioning',
  'To improve defensive stance and lateral movement',
  'Mark a line on the court or use cones 10 feet apart',
  '1. Start in defensive stance\n2. Slide laterally from one line to the other\n3. Keep your feet wide and stay low\n4. Don''t cross your feet\n5. Complete 10 slides each direction',
  'Defensive stance, lateral movement, footwork',
  'defense',
  'beginner',
  15,
  ARRAY['Cones or court lines'],
  1,
  'Half court'
),
(
  'Wall Passing',
  'Improve passing accuracy and strength',
  'To develop passing fundamentals and hand strength',
  'Stand 5-10 feet from a wall with a basketball',
  '1. Use chest pass technique\n2. Pass the ball against the wall\n3. Catch and immediately pass back\n4. Focus on accuracy and follow-through\n5. Complete 50 passes with each hand',
  'Passing technique, accuracy, hand strength',
  'passing',
  'beginner',
  15,
  ARRAY['Basketball', 'Wall'],
  1,
  'Any space with wall'
);

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE public.drills IS 'Stores basketball drills with detailed instructions and metadata';
COMMENT ON TABLE public.drill_ratings IS 'User ratings and reviews for drills';
COMMENT ON TABLE public.drill_progress IS 'Tracks user completion and progress on drills';

COMMENT ON COLUMN public.drills.purpose IS 'The main objective or goal of the drill';
COMMENT ON COLUMN public.drills.setup IS 'How to set up the drill (equipment, space, etc.)';
COMMENT ON COLUMN public.drills.instructions IS 'Step-by-step instructions for performing the drill';
COMMENT ON COLUMN public.drills.focus IS 'Key areas to focus on during the drill';
COMMENT ON COLUMN public.drills.equipment_needed IS 'Array of required equipment';
COMMENT ON COLUMN public.drills.players_needed IS 'Minimum number of players required';
COMMENT ON COLUMN public.drills.space_required IS 'Space requirements for the drill';
