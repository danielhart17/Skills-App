# Media Loading Troubleshooting Guide

## Enhanced Features

### ✅ What's Been Fixed

1. **YouTube Video Support**
   - Automatically detects YouTube URLs
   - Uses WebView with iframe embed for perfect YouTube playback
   - Supports all YouTube URL formats:
     - `https://www.youtube.com/watch?v=VIDEO_ID`
     - `https://youtu.be/VIDEO_ID`
     - `https://www.youtube.com/embed/VIDEO_ID`

2. **Direct Video Support (Supabase Storage)**
   - Uses native AVPlayer for MP4, MOV, M4V files
   - Auto-plays when view appears
   - Pauses when user navigates away

3. **Enhanced Image Loading**
   - Better error messages showing the exact URL that failed
   - Loading indicators with text
   - Graceful fallbacks when images fail

4. **Comprehensive Logging**
   - All media loads are logged to Xcode console
   - Success: `✅ Image loaded successfully`
   - Error: `❌ Image failed to load` with URL and error details
   - Video: `🎥 Loading video from: [URL]`

## Testing Your Media URLs

### Step 1: Check Xcode Console

When you run the app, you'll see detailed logs:

```
🎥 Loading video from: https://www.youtube.com/watch?v=dQw4w9WgXcQ
🎬 Loading YouTube embed: https://www.youtube.com/embed/dQw4w9WgXcQ?playsinline=1&rel=0&modestbranding=1
✅ Video loaded successfully
```

Or if there's an error:
```
❌ Invalid video URL: not-a-url
❌ Video failed to play: Error Domain=AVFoundationErrorDomain Code=-11800
```

### Step 2: Verify Your URLs

#### For YouTube Videos:
✅ **Valid formats:**
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`
- `https://www.youtube.com/embed/dQw4w9WgXcQ`

❌ **Invalid formats:**
- `youtube.com/watch?v=...` (missing https://)
- `www.youtube.com/...` (missing protocol)

#### For Direct Videos (Supabase):
✅ **Valid format:**
```
https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/videos/demo.mp4
```

**Required:**
- Must use `https://` (not `http://`)
- Must be a direct video file (MP4, MOV, M4V)
- Must have proper CORS headers (Supabase handles this automatically)
- File must exist and be publicly accessible

#### For Images (Supabase):
✅ **Valid format:**
```
https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/images/thumbnail.jpg
```

**Supported formats:** JPG, JPEG, PNG, GIF, WebP

### Step 3: Check Supabase Storage

#### Verify Bucket is Public

1. Go to Supabase Dashboard → Storage
2. Click on your bucket (e.g., `videos` or `images`)
3. Ensure the bucket is **Public**
4. Check "Public URL" setting is enabled

#### Test URL Directly

Copy your media URL and paste it into Safari on your Mac:
- ✅ **Image**: Should display the image
- ✅ **Video**: Should download or offer to play
- ✅ **YouTube**: Should redirect to YouTube

If it doesn't work in Safari, it won't work in the app!

## Common Issues & Solutions

### Issue 1: "Unable to load video" Error

**Symptom:** Video shows error message immediately

**Possible Causes:**
1. **Invalid URL format**
   - Check Xcode console for the actual URL being loaded
   - Ensure it starts with `https://`
   - No spaces or special characters

2. **File doesn't exist**
   - Test URL in Safari
   - Check Supabase storage dashboard

3. **Wrong bucket permissions**
   - Bucket must be public OR
   - Use authenticated URLs with proper tokens

**Fix:**
```sql
-- In Supabase SQL Editor, make bucket public:
UPDATE storage.buckets 
SET public = true 
WHERE id = 'videos';
```

### Issue 2: YouTube Videos Show Loading Forever

**Symptom:** YouTube video shows "Loading..." but never displays

**Possible Causes:**
1. **Network connectivity issue**
   - Check your device has internet connection
   - Try reloading the app

2. **Invalid YouTube URL**
   - Check Xcode console for parsed embed URL
   - Ensure video is not private or region-locked

3. **YouTube video deleted**
   - Test URL in Safari

**Fix:**
- Use YouTube's share button to get valid URL
- Copy the full URL including `https://`

### Issue 3: Images Show Photo Icon Instead of Loading

**Symptom:** Image placeholder appears but image never loads

**Possible Causes:**
1. **CORS issues** (unlikely with Supabase)
2. **File format not supported**
3. **URL returns 404**

**Debug Steps:**
1. Check Xcode console:
   ```
   ❌ Image failed to load: https://...
   Error: The operation couldn't be completed...
   ```

2. Test URL in Safari

3. Check file extension matches actual format:
   ```bash
   # In terminal, check file type:
   curl -I https://your-url.com/image.jpg
   ```

### Issue 4: Supabase Storage URLs Give 404

**Symptom:** URL looks correct but returns 404

**Common Mistakes:**
```
❌ Wrong: https://dadyciqoypfdeotuspms.supabase.co/storage/videos/demo.mp4
✅ Right: https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/videos/demo.mp4
```

Note the `/v1/object/public/` path!

**Fix:**
Use this URL pattern:
```
https://[PROJECT_REF].supabase.co/storage/v1/object/public/[BUCKET_NAME]/[FILE_PATH]
```

## Database Schema Examples

### Questions with Media

```sql
INSERT INTO questions (
    lesson_id,
    question_text,
    media_type,
    media_url,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer,
    order_index
) VALUES (
    'lesson-uuid-here',
    'What move is shown in this video?',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',  -- YouTube URL
    'Crossover',
    'Behind the back',
    'Between the legs',
    'Spin move',
    'A',
    1
);
```

### Lessons with Videos

```sql
UPDATE lessons 
SET 
    video_url = 'https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/videos/lesson-intro.mp4',
    thumbnail_url = 'https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/thumbnails/lesson-thumb.jpg'
WHERE id = 'lesson-uuid-here';
```

### Drills with Videos

```sql
UPDATE drills 
SET 
    video_url = 'https://www.youtube.com/watch?v=VIDEO_ID',
    thumbnail_url = 'https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/thumbnails/drill-thumb.jpg'
WHERE id = 'drill-uuid-here';
```

## Testing Checklist

### For Admins Adding Content:

- [ ] Test URL in Safari first (should work)
- [ ] Check URL starts with `https://`
- [ ] Verify no trailing spaces or line breaks
- [ ] For YouTube: Use full URL from address bar
- [ ] For Supabase: Include `/v1/object/public/` in path
- [ ] Check bucket permissions are public
- [ ] Save and test in iOS app
- [ ] Check Xcode console for error messages

### For Developers Debugging:

- [ ] Open Xcode and view console output
- [ ] Look for `🎥`, `✅`, or `❌` emoji logs
- [ ] Test with a known-good YouTube URL first
- [ ] Test with a simple Supabase image URL
- [ ] Verify network requests in Charles Proxy or Xcode network inspector
- [ ] Check device has internet connectivity
- [ ] Try in iOS Simulator and on real device

## Advanced: Uploading to Supabase Storage

### Using Supabase Dashboard

1. Go to Storage → Your Bucket
2. Click "Upload file"
3. Select your video/image
4. After upload, click the file
5. Click "Copy URL"
6. **Important:** Change `authenticated` to `public` in the URL if needed

### Using SQL to Get Public URLs

```sql
-- Get public URL for a file
SELECT 
    'https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/' || 
    name || '/' || 
    path_tokens[1]
FROM storage.objects
WHERE bucket_id = 'videos';
```

## Video Format Recommendations

### For Best Compatibility:

**Direct Video Files (Supabase):**
- Format: MP4 (H.264 + AAC)
- Resolution: 720p or 1080p
- Max file size: 50MB
- Aspect ratio: 16:9

**YouTube:**
- Any format (YouTube handles transcoding)
- Use unlisted or public videos
- Avoid private or age-restricted content

## Still Having Issues?

### Check These:

1. **Xcode Console Output**
   - Look for specific error messages
   - URLs are logged for debugging

2. **Network Inspector**
   - Xcode → Debug Navigator → Network
   - Check if requests are failing

3. **Test with These Known-Good URLs:**

```swift
// Test YouTube (should work):
"https://www.youtube.com/watch?v=dQw4w9WgXcQ"

// Test image (should work):
"https://picsum.photos/400/300"

// If these work, your implementation is fine - check your URLs!
```

4. **Device vs Simulator**
   - Test on both
   - Some network issues only occur on device

5. **Clear App Data**
   - Delete app and reinstall
   - Clears any cached errors

---

## Files Modified in This Fix

1. `/Views/VideoPlayerView.swift` - YouTube + AVPlayer support
2. `/Views/RemoteImageView.swift` - Enhanced image loading
3. `/Views/Lessons/QuestionView.swift` - Updated to use new components
4. `/Views/Lessons/LessonDetailView.swift` - Updated to use new components
5. `/Views/Drills/DrillDetailView.swift` - Updated to use new components

## Need More Help?

Check the Xcode console logs - they'll tell you exactly what's wrong! The emoji logs make it easy to spot issues:
- 🎥 = Video loading attempt
- 🎬 = YouTube embed
- ✅ = Success
- ❌ = Error (with details)

---

**Last Updated:** January 11, 2026  
**Status:** ✅ Ready for testing with enhanced debugging
