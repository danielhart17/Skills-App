-- Add gallery field to trainers table
-- Gallery is an array of media items with type, url, caption, and timestamp
-- Example: [{ "type": "image", "url": "https://...", "caption": "Training session", "created_at": "2026-01-18T10:00:00Z" }]
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;

-- Add profile image URL if not exists
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS profile_image TEXT DEFAULT NULL;

-- Add cover/banner image URL if not exists
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS cover_image TEXT DEFAULT NULL;
