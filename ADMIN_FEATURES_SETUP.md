# Admin Features Setup Guide

## New Features Added

### 1. Image Upload for Questions ✅
Admins can now upload images directly from their computer instead of needing to paste URLs.

### 2. Chapter Creation Fix ✅
Admins can now create new chapters when adding lessons, and they'll be properly saved to the database.

---

## Setup Instructions

### Step 1: Create Supabase Storage Bucket

The image upload feature requires a public storage bucket called `assets`.

#### Option A: Using Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the sidebar
3. Click **Create a new bucket**
4. Configure the bucket:
   - **Name**: `assets`
   - **Public bucket**: ✅ **YES** (toggle ON)
   - **File size limit**: 5MB (default is fine)
   - **Allowed MIME types**: Leave empty for all types, or add:
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/gif`
     - `image/webp`
5. Click **Create bucket**

#### Option B: Using SQL

Run this in your Supabase SQL Editor:

```sql
-- Create the assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the assets bucket
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'assets' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assets' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own uploads
CREATE POLICY "Users can update own uploads"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'assets' AND auth.uid() = owner );

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
USING ( bucket_id = 'assets' AND auth.uid() = owner );
```

### Step 2: Verify Bucket Permissions

1. Go to **Storage** → **Policies** in Supabase Dashboard
2. Check that the `assets` bucket has:
   - ✅ Public read access (SELECT)
   - ✅ Authenticated upload access (INSERT)
   - ✅ Owner update/delete access

### Step 3: Test Image Upload

1. Log in as an admin
2. Go to **Admin Dashboard**
3. Click on a lesson's **Questions** button
4. Click **Add Question**
5. Select **Media Type**: `Image`
6. You should now see:
   - An **Upload Image** button
   - A preview area
   - A manual URL input (for YouTube videos or external images)

#### Testing the Upload:
1. Click **Upload Image**
2. Select an image from your computer (max 5MB)
3. Wait for upload (you'll see a spinner)
4. Image should appear in preview
5. Public URL is automatically filled in
6. Save the question
7. View the question on iOS or web - image should display!

---

## How It Works

### Image Upload Flow

```
1. User selects image → 2. Validate (type, size) → 3. Generate unique filename
                                ↓
4. Upload to Supabase Storage (bucket: assets) → 5. Get public URL
                                ↓
6. Set URL in form → 7. Save question → 8. Image displays on both platforms
```

### Chapter Creation Flow

**Before (Broken):**
```
User creates new chapter → Only sets `chapter` TEXT field → Lesson can't find chapter_id → ❌ Fails
```

**After (Fixed):**
```
User creates new chapter → Check if chapter exists
                              ↓
                    NO: Create in chapters table → Get new chapter_id
                              ↓
                    YES: Use existing chapter_id
                              ↓
            Set both `chapter` and `chapter_id` → ✅ Success!
```

---

## Features Overview

### Image Upload Component

**Location:** `/src/components/ImageUpload.jsx`

**Features:**
- 📤 Direct file upload (drag & drop would be nice future addition)
- 👁️ Live preview
- 🗑️ Clear/remove uploaded image
- 📎 Manual URL input (for YouTube videos)
- ✅ Client-side validation (file type, size)
- 🔄 Loading state during upload
- 📱 Works on both web and iOS

**Validations:**
- File type: Only images allowed
- File size: Max 5MB
- Unique filename generation prevents collisions
- Error handling with user-friendly messages

### Chapter Creation

**When to Use:**
1. Creating a new lesson
2. Want to organize it under a new chapter
3. Select "Create New Chapter" from dropdown
4. Type the chapter name
5. Save lesson

**What Happens:**
1. Checks if chapter with that name already exists
2. If yes: Uses existing chapter's ID
3. If no: Creates new chapter with:
   - Title (from your input)
   - Description (auto-generated)
   - Mode (IQ or On Court)
   - Order index (auto-incremented)
   - Active status (true)
4. Links lesson to chapter via `chapter_id`

---

## URLs Generated

### Image URLs
```
Format: https://[PROJECT_REF].supabase.co/storage/v1/object/public/assets/[FILENAME]

Example:
https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/abc123-1704931200000.jpg
```

### Video URLs (Manual)
YouTube:
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
```

Direct video (Supabase):
```
https://[PROJECT_REF].supabase.co/storage/v1/object/public/videos/demo.mp4
```

---

## Troubleshooting

### Upload Fails with "403 Forbidden"

**Problem:** Bucket policies not set correctly

**Fix:**
1. Go to Supabase Dashboard → Storage → Policies
2. Make sure `assets` bucket has INSERT policy for authenticated users
3. Run the SQL policies from Step 1 above

### Upload Fails with "Bucket not found"

**Problem:** Bucket doesn't exist

**Fix:**
1. Check Storage dashboard for `assets` bucket
2. Create it using Option A or B from Step 1

### Image Uploads But Doesn't Display

**Problem:** Bucket is not public

**Fix:**
1. Go to Storage → Click `assets` bucket
2. Toggle **Public bucket** to ON
3. Or run the SELECT policy from SQL above

### Chapter Isn't Created

**Problem:** Check console for errors

**Common causes:**
- Missing permissions to insert into `chapters` table
- Duplicate chapter title (should work - will reuse existing)
- Network error

**Fix:**
```sql
-- Verify chapters table exists
SELECT * FROM chapters LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'chapters';

-- Add policy if needed (for authenticated users)
CREATE POLICY "Authenticated users can insert chapters"
ON public.chapters FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' );
```

### Images Work on Web But Not iOS

**Problem:** HTTPS requirement or network permissions

**Fix:**
- Verify URL starts with `https://` (not `http://`)
- Check iOS logs in Xcode console
- See MEDIA_TROUBLESHOOTING.md for detailed debugging

---

## Database Changes

### New Fields Used

**lessons table:**
- `chapter_id` UUID - Reference to chapters table (now properly set)
- `chapter` TEXT - Legacy field (still used for display)

**chapters table:**
- All fields properly created via migration
- Auto-generates `order_index` for new chapters
- Tracks `mode` (iq/oncourt) for filtering

**questions table:**
- `media_url` TEXT - Now populated by upload or manual entry
- `media_type` TEXT - 'none', 'image', or 'video'

---

## Testing Checklist

### Image Upload
- [ ] Upload button visible when media type is 'image'
- [ ] Can select image file from computer
- [ ] Preview displays after upload
- [ ] Public URL is auto-populated
- [ ] Can clear uploaded image
- [ ] Can paste manual URL instead
- [ ] Image displays in question on web
- [ ] Image displays in question on iOS
- [ ] File size validation works (try >5MB image)
- [ ] File type validation works (try .pdf file)

### Chapter Creation
- [ ] "Create New Chapter" option appears in dropdown
- [ ] Can type new chapter name
- [ ] Lesson saves successfully
- [ ] New chapter appears in chapters list
- [ ] Can add another lesson to same chapter
- [ ] Chapter shows in Learn page
- [ ] Both IQ and On Court modes work
- [ ] Order index increments correctly

### Both Platforms
- [ ] Uploaded images work on web
- [ ] Uploaded images work on iOS
- [ ] YouTube videos still work
- [ ] Manual image URLs still work
- [ ] Chapter filtering works
- [ ] New lessons appear in correct chapter

---

## Files Modified

1. `/src/components/ImageUpload.jsx` (NEW)
   - Image upload component with preview
   - Supabase storage integration
   - Manual URL fallback

2. `/src/pages/AdminDashboard.jsx`
   - Import ImageUpload component
   - Updated QuestionDialog to use ImageUpload
   - Fixed handleSave to create chapters
   - Updated LessonDialog handleSubmit to set chapter_id

---

## Future Enhancements

### Image Upload
- [ ] Drag & drop support
- [ ] Multiple image upload
- [ ] Image cropping/resizing
- [ ] Progress bar for large files
- [ ] Upload to different folders based on type
- [ ] Delete old images when replacing
- [ ] Image compression before upload

### Chapter Management
- [ ] Dedicated Chapters tab in admin
- [ ] Edit chapter details (icon, description)
- [ ] Reorder chapters (drag & drop)
- [ ] Delete chapters (with confirmation)
- [ ] Bulk operations
- [ ] Chapter analytics (completion rates)

---

**Last Updated:** January 11, 2026  
**Status:** ✅ Complete and Ready for Use
