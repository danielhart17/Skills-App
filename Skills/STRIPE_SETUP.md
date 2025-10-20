# Stripe Payment Integration Setup Guide

This guide explains how to set up Stripe payment processing for event registrations.

## ⚠️ Current Issue & Quick Fix

**Problem:** Event registration fails with "Edge Function returned a non-2xx status code"

**Solution:** You need to:
1. Create `.env.local` file (see Step 2 below)
2. Add Stripe keys to Supabase Edge Function secrets (see Step 2 below)
3. Deploy the updated Edge Functions (see Step 3 below)

**See DEPLOYMENT_GUIDE.md for detailed troubleshooting steps.**

## 📋 Overview

The Skills app now supports paid event registrations through Stripe Checkout. Users can register for:
- **Free events** - Direct registration (no payment)
- **Paid events** - Secure checkout via Stripe

## 🔧 Prerequisites

1. A Stripe account ([sign up here](https://dashboard.stripe.com/register))
2. Supabase project with Edge Functions enabled
3. The Stripe CLI for local testing (optional)

## 🚀 Setup Steps

### Step 1: Get Your Stripe API Keys

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API keys**
3. Copy your **Publishable key** and **Secret key**
4. For testing, use the **Test mode** keys

### Step 2: Configure Environment Variables

#### Frontend (.env.local)

Add your Stripe publishable key to `Skills/.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

#### Supabase Edge Functions

In your Supabase project:

1. Go to **Settings** → **Edge Functions**
2. Add the following secrets:
   - `STRIPE_SECRET_KEY` - Your Stripe secret key (sk_test_...)
   - `STRIPE_WEBHOOK_SECRET` - Your webhook signing secret (whsec_...)

### Step 3: Deploy Supabase Edge Functions

Deploy the three Stripe-related Edge Functions:

```bash
# Navigate to your project directory
cd /Users/danielhart/Desktop/Skills-App/Skills

# Deploy create-checkout-session function
supabase functions deploy create-checkout-session

# Deploy verify-payment function
supabase functions deploy verify-payment

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook
```

### Step 4: Set Up Stripe Webhook

1. Go to **Developers** → **Webhooks** in your Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://your-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
5. Copy the **Signing secret** (whsec_...)
6. Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

### Step 5: Install Dependencies

```bash
cd /Users/danielhart/Desktop/Skills-App/Skills
npm install @stripe/stripe-js
```

## 🧪 Testing

### Test with Stripe Test Cards

Use these test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any:
- Future expiration date
- Any 3-digit CVC
- Any ZIP code

### Local Testing with Stripe CLI

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
3. Forward webhook events to your local Edge Function:
   ```bash
   stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
   ```
4. Copy the webhook signing secret shown and add it to your environment

## 💡 How It Works

### Free Events
1. User clicks "Register (Free)"
2. Direct registration in `event_registrations` table
3. Immediate confirmation

### Paid Events
1. User clicks "Register ($X)"
2. Backend creates Stripe Checkout session
3. User redirected to Stripe payment page
4. User enters payment information
5. On success:
   - Stripe webhook fires `checkout.session.completed`
   - Webhook handler creates registration in database
   - User redirected back to Events page with success message

## 📁 File Structure

```
Skills/
├── src/
│   ├── api/
│   │   └── stripeService.js          # Client-side Stripe integration
│   └── pages/
│       └── Events.jsx                # Updated with payment flow
├── supabase/
│   └── functions/
│       ├── create-checkout-session/  # Creates Stripe sessions
│       ├── verify-payment/           # Verifies payments
│       └── stripe-webhook/           # Handles webhook events
└── .env.local                        # Stripe publishable key
```

## 🔐 Security Notes

1. **Never** expose your Stripe secret key in frontend code
2. Always validate webhook signatures
3. Use HTTPS in production
4. Test thoroughly in test mode before going live

## 🚨 Troubleshooting

### "Payment successful but registration failed"
- Check Supabase Edge Function logs
- Verify RLS policies on `event_registrations` table
- Ensure webhook secret is correct

### "No Stripe publishable key"
- Check `.env.local` file exists
- Verify `VITE_STRIPE_PUBLISHABLE_KEY` is set
- Restart dev server after adding variables

### Webhook not receiving events
- Verify webhook URL is correct
- Check Stripe Dashboard → Webhooks → Events
- Ensure signing secret is added to Supabase
- Check Edge Function logs

## 📊 Database Schema

The `event_registrations` table stores all registrations:

```sql
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES training_events(id),
  user_id UUID REFERENCES auth.users(id),
  status TEXT, -- 'confirmed', 'cancelled', 'waitlist'
  notes TEXT,  -- Stores payment ID
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## 🔄 Going Live

When ready for production:

1. Switch to **Live mode** in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook endpoint URL
4. Test with small real transactions
5. Monitor Stripe Dashboard for issues

## 📞 Support

- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Stripe Testing Guide](https://stripe.com/docs/testing)

---

**Ready to accept payments! 💳**

