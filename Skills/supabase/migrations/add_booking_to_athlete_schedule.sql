-- Link trainer bookings onto the athlete schedule (athlete_events).

ALTER TABLE public.athlete_events
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_athlete_events_booking_id_unique
  ON public.athlete_events(booking_id)
  WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_athlete_events_booking_id
  ON public.athlete_events(booking_id);

-- Allow "training" as a first-class schedule type if a check constraint exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'athlete_events_event_type_check'
  ) THEN
    ALTER TABLE public.athlete_events DROP CONSTRAINT athlete_events_event_type_check;
    ALTER TABLE public.athlete_events
      ADD CONSTRAINT athlete_events_event_type_check
      CHECK (
        event_type IS NULL OR event_type IN (
          'game',
          'practice',
          'workout',
          'rest',
          'training'
        )
      );
  END IF;
END $$;
