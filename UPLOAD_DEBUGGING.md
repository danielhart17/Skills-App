# Upload Not Working - Debugging Guide

## Issue: Nothing happens after selecting image

This means the upload function is silently failing. Let's debug step by step.

---

## Step 1: Open Browser Console

1. **Chrome/Edge**: Press `F12` or `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
2. **Firefox**: Press `F12` or `Cmd+Option+K` (Mac)
3. **Safari**: Enable Developer Menu first (Preferences → Advanced → Show Develop menu), then `Cmd+Option+C`

Click on the **Console** tab.

---

## Step 2: Try Upload Again & Watch Console

With the console open:

1. Go to Admin Dashboard
2. Open a Question dialog
3. Select Media Type: **Image**
4. Click **Upload Image**
5. Select an image
6. **Watch the console logs**

You should see logs like:
```
🎯 handleFileUpload triggered
📁 File selected: photo.jpg
📊 File details: {...}
✅ File validation passed
🔼 Starting upload to assets bucket: abc123-1704931200000.jpg
🔑 Supabase client exists: true
✅ Upload successful: {...}
📎 Public URL generated: https://...
🎉 Upload complete!
```

---

## Step 3: Identify the Issue

### Scenario A: No logs appear at all
**Problem**: Event handler not attached

**Solution**: Refresh the page and try again. If still nothing, check if there's a JavaScript error earlier in the console.

### Scenario B: Logs stop at "Starting upload"
**Problem**: Supabase storage bucket doesn't exist or has wrong permissions

**Check console for**:
- `❌ Upload error: Bucket not found`
- `❌ Upload error: permission denied`

**Solution**: Run the setup SQL (see below)

### Scenario C: "Bucket not found" error
**Problem**: The `assets` bucket doesn't exist in Supabase

**Solution**:
1. Go to Supabase Dashboard → **Storage**
2. Check if `assets` bucket exists
3. If not, create it OR run the SQL below

### Scenario D: "Permission denied" / "403" error
**Problem**: Bucket exists but policies are wrong

**Solution**: Run the SQL policies below

### Scenario E: File validation fails
**Check for**:
- `❌ Invalid file type`
- `❌ File too large`

**Solution**: 
- Use a JPG, PNG, or GIF file
- Make sure file is under 5MB

---

## Quick Fix SQL

Copy and run this in **Supabase SQL Editor**:

```sql
-- Create assets bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('assets', 'assets', true, 5242880)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- Allow public read
DROP POLICY IF EXISTS "Public can read assets" ON storage.objects;
CREATE POLICY "Public can read assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Allow authenticated upload
DROP POLICY IF EXISTS "Authenticated can upload assets" ON storage.objects;
CREATE POLICY "Authenticated can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assets' 
  AND auth.role() = 'authenticated'
);

-- Verify
SELECT * FROM storage.buckets WHERE id = 'assets';
```

---

## Step 4: Test with cURL (Advanced)

If SQL is correct but still not working, test the Supabase connection:

```bash
# Replace YOUR_PROJECT_REF and YOUR_ANON_KEY
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/assets/test.txt' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: text/plain' \
  -d 'test'
```

Expected response:
- **Success**: `{"Key":"assets/test.txt",...}`
- **Bucket not found**: `{"error":"Bucket not found"}`
- **Permission denied**: `{"error":"new row violates row-level security policy"}`

---

## Step 5: Common Issues & Solutions

### Issue: Supabase client is undefined
**Symptom**: Console shows "Cannot read property 'storage' of undefined"

**Solution**: Check `src/api/supabaseClient.js` exists and is properly configured:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://YOUR_PROJECT.supabase.co'
const supabaseAnonKey = 'YOUR_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Issue: Wrong bucket name
**Symptom**: "Bucket not found" even though you created one

**Check**: Make sure bucket is called exactly `assets` (lowercase, no spaces)

### Issue: File appears to upload but URL is empty
**Symptom**: Upload succeeds but `publicUrl` is undefined

**Solution**: Check the `getPublicUrl` call. Should be:
```javascript
const { data: { publicUrl } } = supabase.storage
  .from('assets')
  .getPublicUrl(filePath);
```

### Issue: CORS error
**Symptom**: Console shows "CORS policy: No 'Access-Control-Allow-Origin'"

**Solution**: 
1. Go to Supabase Dashboard → **Settings** → **API**
2. Check **CORS allowed origins**
3. Add `http://localhost:5173` for development
4. Add your production domain

---

## Step 6: Manual Bucket Creation (Dashboard)

If SQL doesn't work, create bucket manually:

1. **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Settings:
   - **Name**: `assets`
   - **Public bucket**: ✅ **ON**
   - **File size limit**: 5242880 (5MB)
   - **Allowed MIME types**: Leave empty or add image types
4. Click **Create bucket**
5. Go to **Policies** tab
6. Click **New policy** → **Full customization**
7. Add these policies:
   - **SELECT (read)**: `bucket_id = 'assets'`
   - **INSERT (upload)**: `bucket_id = 'assets' AND auth.role() = 'authenticated'`

---

## Step 7: Verify Everything Works

Run this in browser console while on admin page:

```javascript
// Test 1: Check Supabase client
console.log("Supabase client:", window.supabase || "Not found");

// Test 2: List buckets
const { data, error } = await supabase.storage.listBuckets();
console.log("Buckets:", data);
console.log("Error:", error);

// Test 3: Check if assets bucket exists
const assets = data?.find(b => b.id === 'assets');
console.log("Assets bucket:", assets);
console.log("Is public?:", assets?.public);
```

Expected output:
```
Buckets: [{id: "assets", name: "assets", public: true, ...}]
Assets bucket: {id: "assets", name: "assets", public: true}
Is public?: true
```

---

## Still Not Working?

### Share These Details:

1. **Console logs** (copy everything in red/errors)
2. **Bucket status** from Supabase Dashboard → Storage
3. **Policy status** from Storage → Policies tab
4. **Browser and version** (Chrome 120, Firefox 121, etc.)
5. **Error messages** (screenshots help!)

### Quick Checklist:

- [ ] Bucket named exactly `assets` exists
- [ ] Bucket is marked as **Public**
- [ ] Storage policies allow INSERT for authenticated users
- [ ] Storage policies allow SELECT for everyone
- [ ] No CORS errors in console
- [ ] Supabase client is properly initialized
- [ ] Browser console shows the step-by-step logs
- [ ] File is under 5MB
- [ ] File is an image (JPG, PNG, GIF, WebP)

---

## Emergency Workaround

If you can't get upload working, use manual URL entry:

1. Upload image to Supabase Storage manually (via Dashboard)
2. Copy the public URL
3. Paste it in the "Image URL" field
4. Save question

This works on both web and iOS!

---

**Last Updated**: January 11, 2026  
**Status**: Debugging guide with comprehensive logging
