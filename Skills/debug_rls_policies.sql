-- Debug RLS policies for bookings table

-- 1. Check if RLS is enabled on bookings table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'bookings';

-- 2. Check all policies on the bookings table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 3. Check if there are any conflicting policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'bookings' 
AND cmd = 'SELECT';

-- 4. Test the RLS policy logic manually
-- Replace 'your-user-id' with the actual user ID from the trainer profile
-- Replace 'trainer-id' with the actual trainer ID
SELECT 
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.trainers t ON t.user_id = p.id
    WHERE p.id = 'your-user-id'::uuid
    AND p.role IN ('trainer', 'admin')
    AND t.id = 'trainer-id'::uuid
  ) as policy_check;

-- 5. Check if the user has the right role
SELECT id, email, role FROM public.profiles WHERE id = 'your-user-id'::uuid;

-- 6. Check if the trainer record exists and is linked properly
SELECT t.id, t.user_id, t.name, p.email, p.role 
FROM public.trainers t
JOIN public.profiles p ON p.id = t.user_id
WHERE t.id = 'trainer-id'::uuid;
