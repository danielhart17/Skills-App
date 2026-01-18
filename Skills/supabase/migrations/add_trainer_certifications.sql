-- Add certifications field to trainers table
-- Example: [{ "name": "NASM Certified", "issuer": "National Academy of Sports Medicine", "year": 2020 }]
ALTER TABLE trainers 
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;

-- Add media fields to challenges table (for images/videos)
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT NULL;

ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT NULL;

ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;
