-- Fix Trainer Booking Policies
-- This creates simpler, more reliable RLS policies for trainers to see bookings

-- First, drop any existing policies on bookings table
DROP POLICY IF EXISTS "Trainers can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Trainers can update their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

-- Create a simpler policy for trainers to view their bookings
-- This uses a function to check if the current user is a trainer
CREATE OR REPLACE FUNCTION is_current_user_trainer_for_booking(p_trainer_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.trainers t ON t.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.role IN ('trainer', 'admin')
    AND t.id = p_trainer_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the policy using the function
CREATE POLICY "Trainers can view their bookings" ON public.bookings
  FOR SELECT
  TO authenticated
  USING (is_current_user_trainer_for_booking(trainer_id));

-- Allow trainers to update booking status
CREATE POLICY "Trainers can update their bookings" ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (is_current_user_trainer_for_booking(trainer_id));

-- Allow admins to see all bookings
CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to manage all bookings
CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Also ensure users can still see their own bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
