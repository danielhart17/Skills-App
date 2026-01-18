-- Add avatar_url column to profiles table for profile pictures
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user profile picture stored in Supabase storage';
