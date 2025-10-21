-- Migration: Add Challenge Ratings and Progress Tables
-- This adds rating and progress tracking for challenges (replacing drills)

-- =============================================
-- CHALLENGE RATINGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.challenge_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, user_id) -- One rating per user per challenge
);

-- =============================================
-- CHALLENGE PROGRESS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id) -- One progress record per user per challenge
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_challenge_ratings_user_id ON public.challenge_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_ratings_challenge_id ON public.challenge_ratings(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user_id ON public.challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge_id ON public.challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_completed ON public.challenge_progress(user_id, is_completed);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.challenge_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- Challenge Ratings Policies
CREATE POLICY "Users can view all challenge ratings"
  ON public.challenge_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own challenge ratings"
  ON public.challenge_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge ratings"
  ON public.challenge_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge ratings"
  ON public.challenge_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Challenge Progress Policies
CREATE POLICY "Users can view their own challenge progress"
  ON public.challenge_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenge progress"
  ON public.challenge_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress"
  ON public.challenge_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge progress"
  ON public.challenge_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- TRIGGERS
-- =============================================

-- Update updated_at timestamp on challenge_ratings
CREATE TRIGGER update_challenge_ratings_updated_at 
BEFORE UPDATE ON public.challenge_ratings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp on challenge_progress
CREATE TRIGGER update_challenge_progress_updated_at 
BEFORE UPDATE ON public.challenge_progress
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get average rating for a challenge
CREATE OR REPLACE FUNCTION get_challenge_average_rating(p_challenge_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(AVG(rating), 0)::NUMERIC(3,2)
  FROM public.challenge_ratings
  WHERE challenge_id = p_challenge_id;
$$ LANGUAGE sql STABLE;

-- Function to get rating count for a challenge
CREATE OR REPLACE FUNCTION get_challenge_rating_count(p_challenge_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.challenge_ratings
  WHERE challenge_id = p_challenge_id;
$$ LANGUAGE sql STABLE;

-- Function to check if user has completed a challenge
CREATE OR REPLACE FUNCTION get_user_challenge_status(p_user_id UUID, p_challenge_id UUID)
RETURNS TABLE(
  is_completed BOOLEAN,
  completed_at TIMESTAMP WITH TIME ZONE,
  has_rated BOOLEAN,
  user_rating INTEGER
) AS $$
  SELECT 
    COALESCE(cp.is_completed, false) as is_completed,
    cp.completed_at,
    (cr.id IS NOT NULL) as has_rated,
    cr.rating as user_rating
  FROM public.challenges c
  LEFT JOIN public.challenge_progress cp ON cp.challenge_id = c.id AND cp.user_id = p_user_id
  LEFT JOIN public.challenge_ratings cr ON cr.challenge_id = c.id AND cr.user_id = p_user_id
  WHERE c.id = p_challenge_id;
$$ LANGUAGE sql STABLE;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.challenge_ratings IS 'User ratings and reviews for challenges';
COMMENT ON TABLE public.challenge_progress IS 'User progress tracking for challenges';

