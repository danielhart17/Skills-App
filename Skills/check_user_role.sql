-- Check current user roles
SELECT id, email, full_name, role FROM public.profiles ORDER BY created_at DESC;

-- To make a specific user a trainer, run this (replace with your email):
-- UPDATE public.profiles SET role = 'trainer' WHERE email = 'your-email@example.com';

-- To make a specific user an admin, run this (replace with your email):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- To check if the role column exists and has the right values:
-- SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role';
