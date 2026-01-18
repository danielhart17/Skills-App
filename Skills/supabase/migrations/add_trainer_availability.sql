-- Add availability fields to trainers table

-- Weekly availability schedule (JSON object with day -> start/end times)
-- Example: { "monday": { "start": "09:00", "end": "17:00", "enabled": true }, ... }
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS availability_schedule JSONB DEFAULT '{
  "monday": { "start": "09:00", "end": "17:00", "enabled": true },
  "tuesday": { "start": "09:00", "end": "17:00", "enabled": true },
  "wednesday": { "start": "09:00", "end": "17:00", "enabled": true },
  "thursday": { "start": "09:00", "end": "17:00", "enabled": true },
  "friday": { "start": "09:00", "end": "17:00", "enabled": true },
  "saturday": { "start": "10:00", "end": "14:00", "enabled": false },
  "sunday": { "start": "10:00", "end": "14:00", "enabled": false }
}'::jsonb;

-- Blocked dates (array of date strings when trainer is unavailable)
-- Example: ["2026-01-20", "2026-01-25"]
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS blocked_dates JSONB DEFAULT '[]'::jsonb;

-- Buffer time in minutes between sessions
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS session_buffer_minutes INTEGER DEFAULT 15;

-- Minimum advance booking time in hours (how far in advance bookings must be made)
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS min_booking_notice_hours INTEGER DEFAULT 24;
