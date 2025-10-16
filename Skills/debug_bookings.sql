-- Debug queries to check trainer bookings setup

-- 1. Check if there are any trainers in the database
SELECT id, user_id, name FROM public.trainers;

-- 2. Check if there are any bookings in the database
SELECT id, trainer_id, user_id, service_name, booking_datetime, status FROM public.bookings;

-- 3. Check the relationship between trainers and bookings
SELECT 
  t.id as trainer_id,
  t.name as trainer_name,
  t.user_id as trainer_user_id,
  b.id as booking_id,
  b.user_id as booking_user_id,
  b.service_name,
  b.booking_datetime
FROM public.trainers t
LEFT JOIN public.bookings b ON t.id = b.trainer_id;

-- 4. Check if there are any profiles with trainer role
SELECT id, email, full_name, role FROM public.profiles WHERE role = 'trainer';

-- 5. Check if the current user has a trainer profile
-- Replace 'your-email@example.com' with your actual email
SELECT 
  p.id as profile_id,
  p.email,
  p.full_name,
  p.role,
  t.id as trainer_id,
  t.name as trainer_name
FROM public.profiles p
LEFT JOIN public.trainers t ON t.user_id = p.id
WHERE p.email = 'your-email@example.com';
