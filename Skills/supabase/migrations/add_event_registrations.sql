-- Migration: Add event registrations system
-- This allows users to register for training events

-- Add registered_count column to training_events if it doesn't exist
ALTER TABLE public.training_events 
ADD COLUMN IF NOT EXISTS registered_count INT DEFAULT 0;

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.training_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlist')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON public.event_registrations(status);

-- Enable RLS
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registrations
-- Users can view all registrations (to see who's attending)
CREATE POLICY "Anyone can view event registrations" 
ON public.event_registrations FOR SELECT 
USING (TRUE);

-- Users can create their own registrations
CREATE POLICY "Users can create their own registrations" 
ON public.event_registrations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own registrations
CREATE POLICY "Users can update their own registrations" 
ON public.event_registrations FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own registrations
CREATE POLICY "Users can delete their own registrations" 
ON public.event_registrations FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can manage all registrations
CREATE POLICY "Admins can manage all registrations" 
ON public.event_registrations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Function to update event registered_count
CREATE OR REPLACE FUNCTION update_event_registered_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE public.training_events
    SET registered_count = COALESCE(registered_count, 0) + 1
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status changed to confirmed
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
      UPDATE public.training_events
      SET registered_count = COALESCE(registered_count, 0) + 1
      WHERE id = NEW.event_id;
    -- If status changed from confirmed to something else
    ELSIF NEW.status != 'confirmed' AND OLD.status = 'confirmed' THEN
      UPDATE public.training_events
      SET registered_count = GREATEST(COALESCE(registered_count, 0) - 1, 0)
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE public.training_events
    SET registered_count = GREATEST(COALESCE(registered_count, 0) - 1, 0)
    WHERE id = OLD.event_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update registered_count
DROP TRIGGER IF EXISTS update_event_registered_count_trigger ON public.event_registrations;
CREATE TRIGGER update_event_registered_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION update_event_registered_count();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER update_event_registrations_updated_at 
BEFORE UPDATE ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize registered_count for existing events
UPDATE public.training_events
SET registered_count = (
  SELECT COUNT(*)
  FROM public.event_registrations
  WHERE event_id = training_events.id
  AND status = 'confirmed'
)
WHERE registered_count IS NULL OR registered_count = 0;

