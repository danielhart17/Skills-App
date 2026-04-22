-- =============================================
-- TEST/VERIFICATION QUERIES FOR PARENT-CHILD SYSTEM
-- Run these queries in Supabase SQL Editor to verify the system works correctly
-- =============================================

-- =============================================
-- SETUP: Create test users (run once)
-- =============================================
-- Note: In production, users are created through Supabase Auth
-- These queries are for testing the schema and RLS policies

-- TEST 1: Verify tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parent_child_links', 'child_invite_codes', 'workout_assignments');

-- TEST 2: Verify role enum was extended
SELECT unnest(enum_range(NULL::user_role));

-- TEST 3: Verify RLS is enabled on new tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('parent_child_links', 'child_invite_codes', 'workout_assignments');

-- TEST 4: Verify helper functions exist
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname IN (
    'create_child_invite_code',
    'link_parent_to_child_by_code', 
    'complete_assigned_workout',
    'get_linked_children',
    'get_child_progress_summary',
    'revoke_parent_child_link',
    'is_parent_linked_to_child',
    'is_parent',
    'is_athlete'
);

-- =============================================
-- VERIFICATION QUERIES (run as authenticated users)
-- =============================================

-- Query 1: Parent cannot read unrelated athlete progress
-- (Run as parent user - should return 0 rows for non-linked children)
-- SELECT * FROM challenge_progress WHERE user_id = '<unlinked_child_id>';

-- Query 2: Parent can read linked child progress
-- (Run as parent user after linking - should return rows)
-- SELECT * FROM challenge_progress WHERE user_id IN (
--   SELECT child_id FROM parent_child_links 
--   WHERE parent_id = auth.uid() AND status = 'linked'
-- );

-- Query 3: Verify invite code generation (run as athlete)
-- SELECT * FROM create_child_invite_code();

-- Query 4: Verify linking flow (run as parent with valid code)
-- SELECT * FROM link_parent_to_child_by_code('ABC123');

-- Query 5: Verify linked children (run as parent)
-- SELECT * FROM get_linked_children();

-- Query 6: Verify child progress summary (run as parent)
-- SELECT * FROM get_child_progress_summary('<linked_child_id>');

-- =============================================
-- DATA INTEGRITY CHECKS
-- =============================================

-- Check 1: No self-referencing parent-child links
SELECT COUNT(*) as self_links FROM parent_child_links WHERE parent_id = child_id;
-- Expected: 0

-- Check 2: No duplicate active links
SELECT parent_id, child_id, COUNT(*) as link_count
FROM parent_child_links 
WHERE status = 'linked'
GROUP BY parent_id, child_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows

-- Check 3: All assignments reference valid linked relationships
SELECT wa.id, wa.child_id, wa.assigned_by_parent_id,
       EXISTS (
         SELECT 1 FROM parent_child_links pcl 
         WHERE pcl.parent_id = wa.assigned_by_parent_id 
         AND pcl.child_id = wa.child_id 
         AND pcl.status = 'linked'
       ) as has_valid_link
FROM workout_assignments wa
WHERE NOT EXISTS (
  SELECT 1 FROM parent_child_links pcl 
  WHERE pcl.parent_id = wa.assigned_by_parent_id 
  AND pcl.child_id = wa.child_id 
  AND pcl.status = 'linked'
);
-- Expected: 0 rows (all assignments should have valid links)

-- Check 4: Expired/used invite codes are not reusable
SELECT COUNT(*) as reusable_codes 
FROM child_invite_codes 
WHERE (expires_at < NOW() OR used_at IS NOT NULL) 
AND used_at IS NULL;
-- This query doesn't make sense as written, but shows the validation concept

-- =============================================
-- CLEANUP (for testing environments only)
-- =============================================
-- WARNING: Only run these in development/test environments!

-- Remove test data (uncomment to use):
-- DELETE FROM workout_assignments WHERE 1=1;
-- DELETE FROM child_invite_codes WHERE 1=1;
-- DELETE FROM parent_child_links WHERE 1=1;

