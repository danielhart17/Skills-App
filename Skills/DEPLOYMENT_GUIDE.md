# Deployment Guide - Fixing Event Registration

## Current Issue
Event registration is failing with "Edge Function returned a non-2xx status code" because the Edge Function is not properly configured.

## Steps to Fix

### 1. Configure Environment Variables

#### Client-Side (React App)
Create a `.env.local` file in the `Skills/` directory:

```bash
# Copy the template
cp .env.local.template .env.local
```

Then edit `.env.local` and add your actual keys:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

**Where to find these:**
- Supabase URL & Anon Key: https://app.supabase.com/project/YOUR_PROJECT/settings/api
- Stripe Publishable Key: https://dashboard.stripe.com/test/apikeys (starts with `pk_test_`)

#### Server-Side (Supabase Edge Functions)
Edge Functions need their own environment secrets:

1. Go to: https://app.supabase.com/project/YOUR_PROJECT/settings/functions
2. Add these secrets:
   - `STRIPE_SECRET_KEY` = `sk_test_your_stripe_secret_key_here` (from https://dashboard.stripe.com/test/apikeys)
   - `STRIPE_WEBHOOK_SECRET` = `whsec_your_webhook_secret` (you'll get this after setting up the webhook)

**Important:** Use TEST keys for development, LIVE keys for production.

### 2. Deploy Updated Edge Functions

The Edge Functions have been updated with better error handling. Deploy them:

```bash
# Make sure you're in the Skills directory
cd /Users/danielhart/Desktop/Skills-App/Skills

# Install Supabase CLI if needed
npm install -g supabase

# Link to your Supabase project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the create-checkout-session function
npx supabase functions deploy create-checkout-session

# Deploy the webhook handler
npx supabase functions deploy stripe-webhook

# Deploy the verify-payment function (optional, used for manual verification)
npx supabase functions deploy verify-payment
```

**Find your project ref:**
- Go to: https://app.supabase.com/project/YOUR_PROJECT/settings/general
- Look for "Reference ID"

### 3. Set Up Stripe Webhook (For Production)

For the webhook to work in production, you need to configure it in Stripe:

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add it as `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function secrets

### 4. Restart the Development Server

After creating `.env.local`:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart
npm run dev
```

### 5. Test Event Registration

1. Go to the Events page (`/Events`)
2. Try registering for a paid event
3. Check the browser console for detailed logs (we added debugging)
4. Check Supabase logs: https://app.supabase.com/project/YOUR_PROJECT/logs/edge-functions

## Debugging

### Check if Environment Variables are Loaded

Add this to your browser console:
```javascript
console.log({
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  hasStripeKey: !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
});
```

### Check Edge Function Logs

1. Go to: https://app.supabase.com/project/YOUR_PROJECT/logs/edge-functions
2. Select the `create-checkout-session` function
3. Look for the detailed logs we added (e.g., "Received request body:")

### Common Errors

**"Missing required parameters"**
- The Edge Function received incomplete data
- Check browser console for what's being sent
- Check Edge Function logs for what's being received

**"Stripe not configured on server"**
- The `STRIPE_SECRET_KEY` is not set in Edge Function secrets
- Add it in: https://app.supabase.com/project/YOUR_PROJECT/settings/functions

**"Cannot find project ref"**
- You need to link your local project: `npx supabase link --project-ref YOUR_REF`

**Environment variables not loading**
- Make sure `.env.local` exists in the `Skills/` directory (same level as `package.json`)
- Restart the dev server after creating `.env.local`
- Vite only loads `.env.local` at build time, not runtime

## What Changed

1. **Added better error handling** to `create-checkout-session` Edge Function
2. **Added detailed logging** to both client and Edge Function
3. **Added validation** for all required parameters
4. **Added CORS headers** to Edge Function responses
5. **Created environment variable templates**

## Next Steps After Setup

Once everything is configured:

1. Test with a **free event** first (no payment processing)
2. Then test with a **paid event** using Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. Verify registration appears in:
   - User's "My Events" filter
   - `event_registrations` table in Supabase
   - Event's `registered_count` is updated

## Support

If you continue to have issues:
1. Share browser console logs
2. Share Supabase Edge Function logs
3. Verify all environment variables are set correctly

