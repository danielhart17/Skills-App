-- =============================================
-- Setup Assets Bucket for Image Uploads
-- Run this in Supabase SQL Editor
-- =============================================

-- Create the assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- =============================================
-- Storage Policies
-- =============================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

-- Allow public read access to assets
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'assets' );

-- Allow authenticated users to upload to assets
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assets' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
USING ( 
  bucket_id = 'assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploads  
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING ( 
  bucket_id = 'assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- Verify Setup
-- =============================================

-- Check if bucket was created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'assets';

-- Check policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND policyname LIKE '%assets%' OR policyname LIKE '%Public%' OR policyname LIKE '%Authenticated%';

-- =============================================
-- Optional: Verify Chapters Table Policies
-- =============================================

-- Allow authenticated users to create chapters
CREATE POLICY IF NOT EXISTS "Authenticated users can insert chapters"
ON public.chapters FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );

-- Allow authenticated users to update chapters
CREATE POLICY IF NOT EXISTS "Authenticated users can update chapters"
ON public.chapters FOR UPDATE
USING ( auth.role() = 'authenticated' );

-- Allow public read access to chapters
CREATE POLICY IF NOT EXISTS "Public can read chapters"
ON public.chapters FOR SELECT
USING ( is_active = true );

-- Verify chapters policies
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'chapters';

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Assets bucket setup complete!';
  RAISE NOTICE 'Bucket ID: assets';
  RAISE NOTICE 'Public: Yes';
  RAISE NOTICE 'Size Limit: 5MB';
  RAISE NOTICE 'Policies: Public read, Authenticated upload';
END $$;
