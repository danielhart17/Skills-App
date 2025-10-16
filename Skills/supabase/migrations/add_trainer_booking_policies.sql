-- Migration: Add Trainer Booking Policies
-- This allows trainers to see bookings where they are the trainer

-- =============================================
-- ADD RLS POLICIES FOR TRAINERS TO SEE BOOKINGS
-- =============================================

-- Allow trainers to see bookings where they are the trainer
CREATE POLICY "Trainers can view their bookings" ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.trainers t ON t.user_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role IN ('trainer', 'admin')
      AND t.id = bookings.trainer_id
    )
  );

-- Allow trainers to update booking status
CREATE POLICY "Trainers can update their bookings" ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      LEFT JOIN public.trainers t ON t.user_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role IN ('trainer', 'admin')
      AND t.id = bookings.trainer_id
    )
  );

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
