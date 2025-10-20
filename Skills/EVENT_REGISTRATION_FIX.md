# Event Registration Error - Fix Summary

## 🚨 The Problem

When trying to register for a paid event, you're getting:
```
Registration Failed - Edge Function returned a non-2xx status code
```

Supabase logs show:
```
400 status code for create-checkout-session
```

## 🔍 Root Cause

The error is caused by **missing configuration**. The Edge Function needs:
1. Request body with all required parameters (eventId, eventTitle, price, userId, successUrl, cancelUrl)
2. `STRIPE_SECRET_KEY` environment variable set in Supabase

Currently, one or both of these is missing.

## ✅ Solution (Step-by-Step)

### Step 1: Check Client-Side Environment Variables

1. **Check if `.env.local` exists:**
   ```bash
   cd /Users/danielhart/Desktop/Skills-App/Skills
   ls -la .env.local
   ```

2. **If it doesn't exist, create it:**
   ```bash
   cat > .env.local << 'EOF'
   VITE_SUPABASE_URL=https://dadyciqoypfdeotuspms.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZHljaXFveXBmZGVvdHVzcG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNjcsImV4cCI6MjA3NDkxMjI2N30.fXbVZ0UlNTe3UVtkdc9xBbtZrpoIcs718EI78c9XKFY
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
   EOF
   ```

3. **Add your Stripe publishable key** - Replace `pk_test_YOUR_KEY_HERE` with your actual Stripe test publishable key from: https://dashboard.stripe.com/test/apikeys

4. **Verify the configuration:**
   ```bash
   node check-env.js
   ```

5. **Restart your dev server:**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

### Step 2: Configure Supabase Edge Function Secrets

1. **Go to Supabase Dashboard:**
   https://app.supabase.com/project/dadyciqoypfdeotuspms/settings/functions

2. **Add the following secret:**
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe **secret** key (starts with `sk_test_`)
   - Get it from: https://dashboard.stripe.com/test/apikeys

   **⚠️ Important:** Use the **SECRET key**, not the publishable key!

### Step 3: Deploy Updated Edge Functions

The Edge Functions have been updated with better error handling and logging.

1. **Install/update Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Link your project (first time only):**
   ```bash
   npx supabase link --project-ref dadyciqoypfdeotuspms
   ```
   
   You'll be prompted to enter your database password.

3. **Deploy the updated function:**
   ```bash
   npx supabase functions deploy create-checkout-session
   ```

4. **Verify deployment:**
   - Go to: https://app.supabase.com/project/dadyciqoypfdeotuspms/functions
   - You should see `create-checkout-session` listed

### Step 4: Test Registration

1. **Open your app** (make sure dev server is running)

2. **Go to Events page:** http://localhost:5173/Events

3. **Open browser console** (F12 or Right Click → Inspect → Console)

4. **Try registering for a paid event**

5. **Check the console logs** - You should see:
   ```
   Creating checkout session with: { eventId, eventTitle, price, userId, successUrl, cancelUrl }
   Edge function response: { data: { sessionId: "..." }, error: null }
   ```

6. **If it still fails:**
   - Copy the console logs
   - Check Edge Function logs: https://app.supabase.com/project/dadyciqoypfdeotuspms/logs/edge-functions
   - Look for the detailed error messages we added

## 🧪 Testing Free vs Paid Events

### Free Events (No Stripe Required)
- Should work immediately once `.env.local` is configured
- Registration happens directly in the database
- No redirect to Stripe

### Paid Events (Requires Full Setup)
- Requires Stripe keys (both publishable and secret)
- Redirects to Stripe Checkout
- After payment, webhook creates registration

**Test free events first** to verify basic functionality!

## 📊 What We Changed

1. **Updated Edge Function** (`create-checkout-session/index.ts`):
   - Added detailed parameter validation
   - Added comprehensive logging
   - Better error messages with details about what's missing

2. **Updated Client** (`stripeService.js`):
   - Added logging to see exactly what's being sent
   - Better error handling

3. **Created Documentation**:
   - `DEPLOYMENT_GUIDE.md` - Complete deployment instructions
   - `EVENT_REGISTRATION_FIX.md` - This file
   - `.env.local.template` - Template for environment variables
   - `check-env.js` - Script to verify configuration

## 🔍 Debugging Checklist

If registration still fails, check:

- [ ] `.env.local` exists and has all three variables
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_test_`
- [ ] Dev server was restarted after creating `.env.local`
- [ ] `STRIPE_SECRET_KEY` is set in Supabase (starts with `sk_test_`)
- [ ] Edge Function is deployed
- [ ] Browser console shows request body with all parameters
- [ ] Edge Function logs show received request

## 📝 Common Errors & Solutions

### "Missing required parameters"
**Cause:** Edge Function didn't receive all parameters  
**Fix:** Check browser console to see what's being sent. Ensure `event.price` is set in your database.

### "Stripe not configured on server"
**Cause:** `STRIPE_SECRET_KEY` not set in Supabase  
**Fix:** Add it in Supabase Dashboard → Settings → Edge Functions → Secrets

### "Cannot find project ref"
**Cause:** Supabase CLI not linked  
**Fix:** Run `npx supabase link --project-ref dadyciqoypfdeotuspms`

### Environment variables undefined
**Cause:** `.env.local` doesn't exist or dev server not restarted  
**Fix:** Create `.env.local` and restart dev server

## 🎯 Quick Start (TL;DR)

```bash
# 1. Create .env.local with your Stripe key
cd /Users/danielhart/Desktop/Skills-App/Skills
cp .env.local.template .env.local
# Edit .env.local and add VITE_STRIPE_PUBLISHABLE_KEY

# 2. Verify config
node check-env.js

# 3. Restart dev server
npm run dev

# 4. Add STRIPE_SECRET_KEY to Supabase
# Go to: https://app.supabase.com/project/dadyciqoypfdeotuspms/settings/functions

# 5. Deploy Edge Function
npx supabase link --project-ref dadyciqoypfdeotuspms
npx supabase functions deploy create-checkout-session

# 6. Test!
```

## 📞 Need Help?

If you're still stuck:
1. Share browser console logs
2. Share Supabase Edge Function logs
3. Run `node check-env.js` and share output
4. Check that events in your database have a `price` field set

## ✨ Success Indicators

You'll know it's working when:
- ✅ Free event registration works instantly
- ✅ Paid event registration redirects to Stripe Checkout
- ✅ After payment, you're redirected back with success message
- ✅ Registration appears in `event_registrations` table
- ✅ Event's `registered_count` increments

---

**Files Modified:**
- `supabase/functions/create-checkout-session/index.ts` - Better error handling
- `src/api/stripeService.js` - Added logging
- Created `DEPLOYMENT_GUIDE.md`, `check-env.js`, `.env.local.template`

