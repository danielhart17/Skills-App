# Loading Screen Fix - Troubleshooting Guide

## 🐛 Problem
The app gets stuck on the loading screen in these scenarios:
1. After refreshing the page
2. After making code changes
3. After returning from Stripe checkout
4. After completing event registration

## ✅ What Was Fixed

### 1. Added Loading Timeout (10 seconds)
- If authentication takes longer than 10 seconds, the app will automatically stop loading
- This prevents infinite loading states

### 2. Enhanced Logging
- Added detailed console logs to track the authentication flow
- You can now see exactly where the loading process is getting stuck

### 3. Improved Error Handling
- Profile fetch errors no longer clear the user state
- This prevents the app from getting stuck when profile data can't be loaded

## 🔍 How to Debug

### Step 1: Open Browser Console
Press `F12` or Right Click → Inspect → Console

### Step 2: Watch for These Logs
When the app loads, you should see:
```
Supabase client initialized with URL: https://dadyciqoypfdeotuspms.supabase.co
Getting session...
Session retrieved: User logged in (or No session)
Fetching profile for user: <user-id>
Profile fetched successfully: <profile-data>
Setting loading to false
```

### Step 3: If Stuck on Loading
Look for these issues in the console:

**Issue 1: Session not retrieved**
```
Getting session...
(nothing after this)
```
**Solution:** Check your internet connection and Supabase status

**Issue 2: Profile fetch fails**
```
Getting session...
Session retrieved: User logged in
Fetching profile for user: <user-id>
Profile fetch error: <error>
```
**Solution:** Check that the `profiles` table exists and has the correct RLS policies

**Issue 3: Auth timeout**
```
Auth loading timeout - forcing loading to false
```
**Solution:** This means the auth process took too long. Check network tab for slow requests.

## 🧪 Testing the Fix

### Test 1: Page Refresh
1. Navigate to any page in the app
2. Press `Ctrl+R` (or `Cmd+R` on Mac) to refresh
3. **Expected:** App should load within 2-3 seconds
4. **Check console** for the full auth flow logs

### Test 2: After Stripe Checkout
1. Go to Events page
2. Register for a paid event
3. Complete payment on Stripe
4. **Expected:** Redirected back to Events page with success message
5. **Check console** for auth state change logs

### Test 3: After Code Changes
1. Make a small code change (e.g., add a console.log)
2. Save the file (Vite will hot-reload)
3. **Expected:** App should reload automatically
4. **Check console** for new auth flow logs

## 🔧 Common Issues & Solutions

### Issue: "Auth loading timeout" appears
**Cause:** Network is slow or Supabase is not responding
**Solution:** 
- Check your internet connection
- Check Supabase dashboard: https://app.supabase.com/project/dadyciqoypfdeotuspms
- Try refreshing the page

### Issue: Profile fetch fails repeatedly
**Cause:** RLS policies might be blocking profile access
**Solution:**
Run this query in Supabase SQL Editor:
```sql
-- Check if profile exists
SELECT * FROM public.profiles WHERE id = auth.uid();

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue: Stuck after Stripe redirect
**Cause:** URL parameters might be interfering
**Solution:**
1. Check the URL - it should look like: `/Events?success=true&event_id=<id>`
2. The app should automatically clean this up
3. If stuck, manually navigate to `/Events`

### Issue: Console shows "User logged in" but still loading
**Cause:** Profile fetch is hanging
**Solution:**
1. Check network tab (F12 → Network)
2. Look for a request to `/rest/v1/profiles`
3. If it's pending forever, there's a network issue
4. If it returns an error, check the error message

## 📊 What the Logs Mean

### Normal Flow (Success)
```
Getting session...                          ← Checking if user is logged in
Session retrieved: User logged in          ← User session found
Fetching profile for user: abc-123         ← Loading user profile data
Profile fetched successfully: {...}        ← Profile loaded
Setting loading to false                   ← App ready to show content
```

### No User (Not Logged In)
```
Getting session...                          ← Checking if user is logged in
Session retrieved: No session              ← No user session
No user session, setting profile to null   ← Clearing profile data
Setting loading to false                   ← App ready to show login screen
```

### Error Flow
```
Getting session...                          ← Checking if user is logged in
Session retrieved: User logged in          ← User session found
Fetching profile for user: abc-123         ← Loading user profile data
Profile fetch error: {...}                 ← Error loading profile
Keeping existing profile state             ← Not clearing user state
Setting loading to false                   ← App continues anyway
```

### Timeout Flow
```
Getting session...                          ← Checking if user is logged in
(10 seconds pass)
Auth loading timeout - forcing loading to false  ← Timeout triggered
```

## 🎯 Next Steps

1. **Clear browser cache** if issues persist:
   - Chrome: `Ctrl+Shift+Delete` → Clear cached images and files
   - Firefox: `Ctrl+Shift+Delete` → Cached Web Content

2. **Check Supabase connection**:
   - Go to: https://app.supabase.com/project/dadyciqoypfdeotuspms
   - Verify project is active and not paused

3. **Verify environment variables**:
   ```bash
   cd /Users/danielhart/Desktop/Skills-App/Skills
   node check-env.js
   ```

4. **Restart dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

## 📝 After Testing

Once you've tested and confirmed the fix works:
1. Remove the debug console.log statements (optional)
2. The timeout will remain as a safety net
3. The app should now load reliably in all scenarios

## 🆘 Still Stuck?

If the app is still getting stuck after these fixes:

1. **Share the console logs** - Copy everything from the console
2. **Check Network tab** - Look for failed requests
3. **Check Supabase logs** - Go to Logs section in Supabase dashboard
4. **Try incognito mode** - Rules out browser extension issues

---

**Files Modified:**
- `src/contexts/AuthContext.jsx` - Added timeout, logging, and better error handling

