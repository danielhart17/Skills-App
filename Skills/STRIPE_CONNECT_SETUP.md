# Stripe Connect Setup Guide

This guide explains how to set up Stripe Connect for trainer payments with a 1.5%
platform fee.

## Overview

The Skills App uses **Stripe Connect (Express)** to handle payments for trainer
bookings:

- Users pay for training sessions through a secure Stripe checkout
- A **1.5% platform fee** is automatically deducted from each booking
- Trainers receive the remaining 98.5% directly to their connected Stripe account
- Payouts happen automatically on Stripe's standard schedule

## Setup Steps

### 1. Stripe Dashboard Configuration

1. **Enable Connect** in your Stripe Dashboard:
   - Go to **Settings > Connect > Settings**
   - Enable Express account onboarding
   - Set your platform branding (logo, name, colors)

2. **Configure Webhooks**:
   - Go to **Developers > Webhooks**
   - Add endpoint:
     `https://your-supabase-url.supabase.co/functions/v1/stripe-connect-webhook`
   - Select these events:
     - `account.updated`
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `charge.refunded`
   - Copy the webhook signing secret

3. **Get API Keys**:
   - Copy your **Publishable key** (starts with `pk_`)
   - Copy your **Secret key** (starts with `sk_`)

### 2. Environment Variables

Add these to your Supabase Edge Function secrets:

```bash
# In Supabase Dashboard > Project Settings > Edge Functions > Secrets
STRIPE_SECRET_KEY=sk_live_xxx (or sk_test_xxx for testing)
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxx
```

Add to your frontend `.env.local`:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx (or pk_test_xxx for testing)
```

### 3. Run Database Migrations

Run the migration to add Stripe fields to the database:

```sql
-- Run in Supabase SQL Editor
-- Or apply via migration: supabase/migrations/add_trainer_stripe_connect.sql
```

This adds:

- `stripe_account_id` - Trainer's Stripe Connect account ID
- `stripe_onboarding_complete` - Whether onboarding is finished
- `stripe_charges_enabled` - Whether trainer can accept payments
- `stripe_payouts_enabled` - Whether trainer can receive payouts
- Booking payment tracking fields

### 4. Deploy Edge Functions

Deploy the new Edge Functions:

```bash
supabase functions deploy create-connect-account
supabase functions deploy create-booking-checkout
supabase functions deploy stripe-connect-webhook
```

## How It Works

### Trainer Onboarding Flow

1. Trainer goes to **Trainer Dashboard > Profile**
2. Clicks **"Set Up Stripe Account"**
3. Gets redirected to Stripe's Express onboarding
4. Provides identity, banking info
5. Returns to app with account activated
6. Webhook updates `stripe_charges_enabled` and `stripe_payouts_enabled`

### User Booking Flow

1. User selects trainer and service
2. UI shows "Secure payment via Stripe" if trainer has Stripe setup
3. User clicks "Pay $X"
4. Redirected to Stripe Checkout
5. Payment processed with 1.5% platform fee
6. User redirected back with confirmation
7. Webhook confirms booking as "paid"

### Payment Breakdown Example

For a $100 training session:

- **Total charged**: $100.00
- **Platform fee** (1.5%): $1.50
- **Trainer receives**: $98.50

## Customizing the Platform Fee

The fee is set in `create-booking-checkout/index.ts`:

```typescript
// Platform fee percentage (e.g., 0.015 = 1.5%)
const PLATFORM_FEE_PERCENTAGE = 0.015;
```

Change this value and redeploy the function to adjust the fee.

## Testing

Use Stripe test mode:

1. Set test API keys in environment
2. Use Stripe's [test card numbers](https://stripe.com/docs/testing)
3. Connect accounts in test mode don't require real identity

Test card: `4242 4242 4242 4242` with any future date and CVC.

## Troubleshooting

### "Trainer payment setup incomplete"

The trainer hasn't completed Stripe onboarding. They need to:

1. Go to Trainer Dashboard > Profile
2. Click "Complete Setup" or "Set Up Stripe Account"
3. Follow Stripe's instructions

### Webhook not updating status

Check:

1. Webhook URL is correct in Stripe Dashboard
2. Webhook secret is in Supabase secrets
3. Edge function logs for errors

### Payment succeeded but booking not confirmed

The webhook may have failed. Check:

1. Edge function logs
2. Stripe Dashboard > Developers > Events
3. Manually update booking status if needed

## Security Notes

- Never expose your Stripe Secret Key on the frontend
- All payment processing happens server-side via Edge Functions
- Webhook signature verification prevents fake events
- Trainer payouts are handled entirely by Stripe
