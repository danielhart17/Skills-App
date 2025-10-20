-- Check if the current user can access their profile
-- Run this in Supabase SQL Editor while logged in as the user

-- 1. Check if you're authenticated
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 2. Check if your profile exists
SELECT * FROM public.profiles WHERE id = auth.uid();

-- 3. Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- 5. Test the profile query directly
SELECT 
  id,
  email,
  full_name,
  role,
  current_level,
  total_xp
FROM public.profiles 
WHERE id = auth.uid();

