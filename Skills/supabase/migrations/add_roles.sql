-- Migration: Add User Roles and Permissions
-- This adds role-based access control to the Skills app

-- =============================================
-- CREATE USER ROLE ENUM
-- =============================================
CREATE TYPE user_role AS ENUM ('user', 'trainer', 'admin');

-- =============================================
-- ADD ROLE COLUMN TO PROFILES
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Add trainer_id to link users who are trainers to their trainer profile
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.trainers(id);

-- =============================================
-- UPDATE TRAINERS TABLE
-- =============================================
-- Add user_id to link trainer profiles to auth users
ALTER TABLE public.trainers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) UNIQUE;

-- Add created_by for tracking who created challenges/events
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.training_events
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_trainer_id ON public.profiles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON public.trainers(user_id);

-- =============================================
-- UPDATE RLS POLICIES
-- =============================================

-- Profiles: Users can read all, but only update their own (unless admin)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Lessons: Everyone can read, only admins can create/update/delete
DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
CREATE POLICY "Anyone can view lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
CREATE POLICY "Admins can manage lessons"
  ON public.lessons FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Challenges: Everyone can read, trainers and admins can create
DROP POLICY IF EXISTS "Anyone can view challenges" ON public.challenges;
CREATE POLICY "Anyone can view challenges"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Trainers and admins can create challenges" ON public.challenges;
CREATE POLICY "Trainers and admins can create challenges"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('trainer', 'admin')
    )
  );

DROP POLICY IF EXISTS "Trainers can update own challenges" ON public.challenges;
CREATE POLICY "Trainers can update own challenges"
  ON public.challenges FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Training Events: Similar to challenges
DROP POLICY IF EXISTS "Anyone can view events" ON public.training_events;
CREATE POLICY "Anyone can view events"
  ON public.training_events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Trainers and admins can manage events" ON public.training_events;
CREATE POLICY "Trainers and admins can manage events"
  ON public.training_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.trainers t ON t.user_id = p.id
      WHERE p.id = auth.uid() 
      AND (
        p.role = 'admin'
        OR t.id = training_events.trainer_id
      )
    )
  );

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is trainer
CREATE OR REPLACE FUNCTION is_trainer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('trainer', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's trainer profile
CREATE OR REPLACE FUNCTION get_my_trainer_profile()
RETURNS UUID AS $$
DECLARE
  trainer_id UUID;
BEGIN
  SELECT trainer_id INTO trainer_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN trainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SEED ADMIN USER (OPTIONAL)
-- =============================================
-- Uncomment and update with your email to make yourself an admin
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';

COMMENT ON TYPE user_role IS 'User roles: user (default), trainer (can create challenges/events), admin (full access)';
COMMENT ON COLUMN public.profiles.role IS 'User role for access control';
COMMENT ON COLUMN public.profiles.trainer_id IS 'Reference to trainer profile if user is a trainer';
COMMENT ON COLUMN public.trainers.user_id IS 'Reference to user profile if trainer is also a system user';

