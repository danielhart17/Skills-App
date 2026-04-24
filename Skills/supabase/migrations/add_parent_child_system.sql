-- Migration: Add Parent-Child Linking System
-- This adds support for parent accounts that can track and guide their child athletes

-- =============================================
-- STEP 1: EXTEND USER ROLE ENUM
-- =============================================
-- Add 'parent' and 'athlete' roles
-- Note: 'user' remains for backward compatibility, 'athlete' is the new explicit type
-- Guard against running before add_roles.sql on a fresh database.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user');
  END IF;
END
$$;

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'athlete';

-- =============================================
-- STEP 2: CREATE PARENT-CHILD LINKS TABLE
-- =============================================
-- parent_id/child_id reference public.profiles so PostgREST FK embedding
-- (e.g. `parent:parent_id(full_name, email)`) can resolve to profile columns.
-- profiles.id is itself FK'd to auth.users(id), so the IDs stay consistent.
CREATE TABLE IF NOT EXISTS public.parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'linked', 'revoked')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  linked_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(parent_id, child_id),
  -- Prevent self-linking
  CHECK (parent_id != child_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parent_child_links_parent_id ON public.parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_child_id ON public.parent_child_links(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_status ON public.parent_child_links(status);

COMMENT ON TABLE public.parent_child_links IS 'Links parent accounts to their child athlete accounts';

-- =============================================
-- STEP 3: CREATE CHILD INVITE CODES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.child_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by_parent_id UUID REFERENCES public.profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_child_invite_codes_child_id ON public.child_invite_codes(child_id);
CREATE INDEX IF NOT EXISTS idx_child_invite_codes_code ON public.child_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_child_invite_codes_expires_at ON public.child_invite_codes(expires_at);

COMMENT ON TABLE public.child_invite_codes IS 'Temporary invite codes for parents to link to child accounts';

-- =============================================
-- STEP 4: CREATE WORKOUT ASSIGNMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.workout_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by_parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'assigned',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  completion_source TEXT CHECK (completion_source IN ('child', 'parent')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_assignments_child_id ON public.workout_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_parent_id ON public.workout_assignments(assigned_by_parent_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_challenge_id ON public.workout_assignments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_status ON public.workout_assignments(status);

COMMENT ON TABLE public.workout_assignments IS 'Workouts assigned by parents to their linked children';

-- =============================================
-- STEP 5: EXTEND CHALLENGE_PROGRESS FOR PARENT TRACKING
-- =============================================
-- Add columns to track who completed and for whom
ALTER TABLE public.challenge_progress 
ADD COLUMN IF NOT EXISTS completed_for_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS completed_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.workout_assignments(id);

-- Index for parent queries
CREATE INDEX IF NOT EXISTS idx_challenge_progress_completed_for ON public.challenge_progress(completed_for_user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_completed_by ON public.challenge_progress(completed_by_user_id);

COMMENT ON COLUMN public.challenge_progress.completed_for_user_id IS 'The user this completion counts for (child_id when parent guides)';
COMMENT ON COLUMN public.challenge_progress.completed_by_user_id IS 'The user who performed the completion action';

-- =============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 7: HELPER FUNCTION - CHECK IF PARENT IS LINKED TO CHILD
-- =============================================
CREATE OR REPLACE FUNCTION is_parent_linked_to_child(p_parent_id UUID, p_child_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.parent_child_links
    WHERE parent_id = p_parent_id
    AND child_id = p_child_id
    AND status = 'linked'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if current user is a parent
CREATE OR REPLACE FUNCTION is_parent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'parent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to check if current user is an athlete
CREATE OR REPLACE FUNCTION is_athlete()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('user', 'athlete')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- STEP 8: RLS POLICIES FOR PARENT_CHILD_LINKS
-- =============================================

-- Parents can view their own links
CREATE POLICY "Parents can view their child links"
  ON public.parent_child_links FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Children can view links where they are the child
CREATE POLICY "Children can view their parent links"
  ON public.parent_child_links FOR SELECT
  TO authenticated
  USING (child_id = auth.uid());

-- No direct insert by users (handled via RPC)
-- Parents can revoke links they created
CREATE POLICY "Parents can update their links to revoke"
  ON public.parent_child_links FOR UPDATE
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Children can revoke links
CREATE POLICY "Children can update links to revoke"
  ON public.parent_child_links FOR UPDATE
  TO authenticated
  USING (child_id = auth.uid())
  WITH CHECK (child_id = auth.uid());

-- =============================================
-- STEP 9: RLS POLICIES FOR CHILD_INVITE_CODES
-- =============================================

-- Children can view their own codes
CREATE POLICY "Children can view their own invite codes"
  ON public.child_invite_codes FOR SELECT
  TO authenticated
  USING (child_id = auth.uid());

-- Children can insert codes for themselves (will be done via RPC for security)
CREATE POLICY "Children can create their own invite codes"
  ON public.child_invite_codes FOR INSERT
  TO authenticated
  WITH CHECK (child_id = auth.uid());

-- =============================================
-- STEP 10: RLS POLICIES FOR WORKOUT_ASSIGNMENTS
-- =============================================

-- Parents can view assignments they created
CREATE POLICY "Parents can view their assignments"
  ON public.workout_assignments FOR SELECT
  TO authenticated
  USING (assigned_by_parent_id = auth.uid());

-- Children can view assignments assigned to them
CREATE POLICY "Children can view their assigned workouts"
  ON public.workout_assignments FOR SELECT
  TO authenticated
  USING (child_id = auth.uid());

-- Parents can create assignments for linked children only
CREATE POLICY "Parents can create assignments for linked children"
  ON public.workout_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by_parent_id = auth.uid()
    AND is_parent_linked_to_child(auth.uid(), child_id)
  );

-- Parents can update assignments they created for linked children.
-- WITH CHECK re-verifies the parent->child link so a parent can't
-- change child_id on an existing assignment to an unlinked child.
CREATE POLICY "Parents can update their assignments"
  ON public.workout_assignments FOR UPDATE
  TO authenticated
  USING (
    assigned_by_parent_id = auth.uid()
    AND is_parent_linked_to_child(auth.uid(), child_id)
  )
  WITH CHECK (
    assigned_by_parent_id = auth.uid()
    AND is_parent_linked_to_child(auth.uid(), child_id)
  );

-- Children can update their own assignments (mark started), but integrity
-- columns (child_id, assigned_by_parent_id, challenge_id, completion_source,
-- completed_at, assigned_at) are locked via the trigger below so a child can't
-- pivot an assignment to a different workout or reassign ownership.
CREATE POLICY "Children can update their assignments"
  ON public.workout_assignments FOR UPDATE
  TO authenticated
  USING (child_id = auth.uid())
  WITH CHECK (child_id = auth.uid());

CREATE OR REPLACE FUNCTION protect_workout_assignment_integrity()
RETURNS TRIGGER AS $$
BEGIN
  -- Parents acting on their own assignments (inserts, full updates via RPC or
  -- SECURITY DEFINER contexts) bypass this via SECURITY DEFINER helpers.
  -- For non-definer updates, pin integrity columns to their original values.
  IF auth.uid() = OLD.child_id AND auth.uid() <> OLD.assigned_by_parent_id THEN
    IF NEW.child_id IS DISTINCT FROM OLD.child_id
       OR NEW.assigned_by_parent_id IS DISTINCT FROM OLD.assigned_by_parent_id
       OR NEW.challenge_id IS DISTINCT FROM OLD.challenge_id
       OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
       OR NEW.completion_source IS DISTINCT FROM OLD.completion_source
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'Children may only update status/started_at/notes on assignments';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_workout_assignment_integrity_trigger
BEFORE UPDATE ON public.workout_assignments
FOR EACH ROW EXECUTE FUNCTION protect_workout_assignment_integrity();

-- =============================================
-- STEP 11: UPDATE CHALLENGE_PROGRESS RLS FOR PARENT ACCESS
-- =============================================

-- Drop existing select policy and replace with one that includes parent access
DROP POLICY IF EXISTS "Users can view their own challenge progress" ON public.challenge_progress;

CREATE POLICY "Users and linked parents can view challenge progress"
  ON public.challenge_progress FOR SELECT
  TO authenticated
  USING (
    -- User can see their own progress
    auth.uid() = user_id
    OR
    -- Parent can see linked child's progress
    is_parent_linked_to_child(auth.uid(), user_id)
    OR
    -- User can see progress completed for them by a parent
    auth.uid() = completed_for_user_id
  );

-- =============================================
-- STEP 12: RPC FUNCTION - CREATE CHILD INVITE CODE
-- =============================================
CREATE OR REPLACE FUNCTION create_child_invite_code()
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_user_role user_role;
BEGIN
  -- Verify caller is an athlete/user
  SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_user_role NOT IN ('user', 'athlete') THEN
    RAISE EXCEPTION 'Only athletes can create invite codes';
  END IF;
  
  -- Generate a random 6-character alphanumeric code
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  v_expires_at := NOW() + INTERVAL '15 minutes';
  
  -- Invalidate any existing unused codes for this child
  UPDATE public.child_invite_codes
  SET expires_at = NOW()
  WHERE child_id = auth.uid() AND used_at IS NULL AND expires_at > NOW();
  
  -- Insert new code
  INSERT INTO public.child_invite_codes (child_id, code, expires_at)
  VALUES (auth.uid(), v_code, v_expires_at);
  
  RETURN QUERY SELECT v_code, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 13: RPC FUNCTION - LINK PARENT TO CHILD BY CODE
-- =============================================
CREATE OR REPLACE FUNCTION link_parent_to_child_by_code(p_code TEXT)
RETURNS TABLE(
  child_id UUID,
  child_name TEXT,
  child_email TEXT
) AS $$
DECLARE
  v_child_id UUID;
  v_child_name TEXT;
  v_child_email TEXT;
  v_user_role user_role;
BEGIN
  -- Verify caller is a parent
  SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_user_role != 'parent' THEN
    RAISE EXCEPTION 'Only parent accounts can link to children';
  END IF;
  
  -- Atomically claim the code: only one parent can win the UPDATE even under
  -- concurrent requests, because the row is locked and used_at = NULL filters
  -- out any already-claimed code. Returning child_id proves we won the race.
  UPDATE public.child_invite_codes
  SET used_at = NOW(), used_by_parent_id = auth.uid()
  WHERE code = upper(p_code)
    AND used_at IS NULL
    AND expires_at > NOW()
  RETURNING child_id INTO v_child_id;

  IF v_child_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Check if already linked
  IF EXISTS (
    SELECT 1 FROM public.parent_child_links
    WHERE parent_id = auth.uid() AND child_id = v_child_id AND status = 'linked'
  ) THEN
    RAISE EXCEPTION 'Already linked to this child';
  END IF;

  -- Get child info
  SELECT full_name, email INTO v_child_name, v_child_email
  FROM public.profiles WHERE id = v_child_id;

  -- Create or update parent-child link
  INSERT INTO public.parent_child_links (parent_id, child_id, status, linked_at)
  VALUES (auth.uid(), v_child_id, 'linked', NOW())
  ON CONFLICT (parent_id, child_id)
  DO UPDATE SET status = 'linked', linked_at = NOW(), revoked_at = NULL;
  
  RETURN QUERY SELECT v_child_id, v_child_name, v_child_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 14: RPC FUNCTION - COMPLETE ASSIGNED WORKOUT
-- =============================================
CREATE OR REPLACE FUNCTION complete_assigned_workout(
  p_assignment_id UUID,
  p_time_spent_seconds INTEGER DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_assignment workout_assignments%ROWTYPE;
  v_caller_id UUID := auth.uid();
  v_is_parent BOOLEAN;
  v_is_child BOOLEAN;
  v_challenge_xp INTEGER;
BEGIN
  -- Get assignment details
  SELECT * INTO v_assignment
  FROM public.workout_assignments
  WHERE id = p_assignment_id;
  
  IF v_assignment IS NULL THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;
  
  -- Check if caller is the child
  v_is_child := (v_caller_id = v_assignment.child_id);
  
  -- Check if caller is the assigning parent with active link
  v_is_parent := (
    v_caller_id = v_assignment.assigned_by_parent_id
    AND is_parent_linked_to_child(v_caller_id, v_assignment.child_id)
  );
  
  IF NOT v_is_child AND NOT v_is_parent THEN
    RAISE EXCEPTION 'You are not authorized to complete this assignment';
  END IF;
  
  -- Update assignment status
  UPDATE public.workout_assignments
  SET 
    status = 'completed',
    completed_at = NOW(),
    completion_source = CASE WHEN v_is_parent THEN 'parent' ELSE 'child' END,
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_assignment_id;
  
  -- Upsert into challenge_progress for the CHILD (so child gets credit)
  INSERT INTO public.challenge_progress (
    user_id,
    challenge_id,
    is_completed,
    completed_at,
    time_spent_seconds,
    notes,
    completed_for_user_id,
    completed_by_user_id,
    assignment_id
  )
  VALUES (
    v_assignment.child_id,              -- user_id = child
    v_assignment.challenge_id,
    true,
    NOW(),
    p_time_spent_seconds,
    p_notes,
    v_assignment.child_id,              -- completed FOR child
    v_caller_id,                        -- completed BY parent or child
    p_assignment_id
  )
  ON CONFLICT (user_id, challenge_id) 
  DO UPDATE SET
    is_completed = true,
    completed_at = NOW(),
    time_spent_seconds = EXCLUDED.time_spent_seconds,
    notes = COALESCE(EXCLUDED.notes, challenge_progress.notes),
    completed_for_user_id = EXCLUDED.completed_for_user_id,
    completed_by_user_id = EXCLUDED.completed_by_user_id,
    assignment_id = EXCLUDED.assignment_id,
    updated_at = NOW();
  
  -- Note: XP and streak updates happen via existing triggers on challenge_progress

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 15: RPC FUNCTION - GET LINKED CHILDREN FOR PARENT
-- =============================================
CREATE OR REPLACE FUNCTION get_linked_children()
RETURNS TABLE(
  child_id UUID,
  child_name TEXT,
  child_email TEXT,
  child_level INTEGER,
  child_xp INTEGER,
  child_streak INTEGER,
  linked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.current_level,
    p.total_xp,
    p.current_streak,
    pcl.linked_at
  FROM public.parent_child_links pcl
  JOIN public.profiles p ON p.id = pcl.child_id
  WHERE pcl.parent_id = auth.uid()
    AND pcl.status = 'linked';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- STEP 16: RPC FUNCTION - GET CHILD PROGRESS SUMMARY
-- =============================================
CREATE OR REPLACE FUNCTION get_child_progress_summary(p_child_id UUID)
RETURNS TABLE(
  total_lessons_completed INTEGER,
  total_challenges_completed INTEGER,
  total_xp INTEGER,
  current_level INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  recent_activity JSONB
) AS $$
DECLARE
  v_is_linked BOOLEAN;
BEGIN
  -- Verify parent is linked to this child
  v_is_linked := is_parent_linked_to_child(auth.uid(), p_child_id);
  
  IF NOT v_is_linked THEN
    RAISE EXCEPTION 'You are not linked to this child';
  END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.lesson_progress WHERE user_id = p_child_id AND is_completed = true), 0),
    COALESCE((SELECT COUNT(*)::INTEGER FROM public.challenge_progress WHERE user_id = p_child_id AND is_completed = true), 0),
    p.total_xp,
    p.current_level,
    p.current_streak,
    p.longest_streak,
    (
      SELECT jsonb_agg(activity ORDER BY activity_date DESC)
      FROM (
        SELECT 'lesson' as type, lp.completed_at as activity_date, l.title as item_title
        FROM public.lesson_progress lp
        JOIN public.lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = p_child_id AND lp.is_completed = true
        UNION ALL
        SELECT 'challenge' as type, cp.completed_at as activity_date, c.title as item_title
        FROM public.challenge_progress cp
        JOIN public.challenges c ON c.id = cp.challenge_id
        WHERE cp.user_id = p_child_id AND cp.is_completed = true
        ORDER BY activity_date DESC
        LIMIT 10
      ) activity
    )
  FROM public.profiles p
  WHERE p.id = p_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- STEP 17: RPC FUNCTION - REVOKE PARENT-CHILD LINK
-- =============================================
CREATE OR REPLACE FUNCTION revoke_parent_child_link(p_link_id UUID)
RETURNS void AS $$
DECLARE
  v_link parent_child_links%ROWTYPE;
BEGIN
  SELECT * INTO v_link FROM public.parent_child_links WHERE id = p_link_id;
  
  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Link not found';
  END IF;
  
  -- Allow either parent or child to revoke
  IF auth.uid() != v_link.parent_id AND auth.uid() != v_link.child_id THEN
    RAISE EXCEPTION 'You are not authorized to revoke this link';
  END IF;
  
  UPDATE public.parent_child_links
  SET status = 'revoked', revoked_at = NOW()
  WHERE id = p_link_id;
  
  -- Cancel any pending assignments
  UPDATE public.workout_assignments
  SET status = 'cancelled', updated_at = NOW()
  WHERE assigned_by_parent_id = v_link.parent_id
    AND child_id = v_link.child_id
    AND status IN ('assigned', 'in_progress');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 18: TRIGGER TO UPDATE WORKOUT_ASSIGNMENTS UPDATED_AT
-- =============================================
CREATE TRIGGER update_workout_assignments_updated_at 
BEFORE UPDATE ON public.workout_assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STEP 19: UPDATE HANDLE_NEW_USER TO ACCEPT ROLE
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role user_role;
BEGIN
  -- Get role from user metadata, default to 'user'
  v_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::user_role,
    'user'::user_role
  );
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON FUNCTION create_child_invite_code IS 'Creates a temporary invite code for a child to share with their parent';
COMMENT ON FUNCTION link_parent_to_child_by_code IS 'Links a parent account to a child using an invite code';
COMMENT ON FUNCTION complete_assigned_workout IS 'Marks an assigned workout as complete, updating both assignment and child progress';
COMMENT ON FUNCTION get_linked_children IS 'Returns all children linked to the current parent';
COMMENT ON FUNCTION get_child_progress_summary IS 'Returns detailed progress summary for a linked child';
COMMENT ON FUNCTION revoke_parent_child_link IS 'Revokes a parent-child link and cancels pending assignments';

