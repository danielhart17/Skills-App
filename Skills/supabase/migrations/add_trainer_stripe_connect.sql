-- Add Stripe Connect fields to trainers table
ALTER TABLE trainers
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

-- Add payment tracking to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS trainer_payout DECIMAL(10, 2);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trainers_stripe_account ON trainers(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stripe_session ON bookings(stripe_session_id);

-- IMPORTANT: We deliberately do NOT add a client-writable UPDATE policy here.
-- The Stripe columns (stripe_account_id, stripe_charges_enabled,
-- stripe_payouts_enabled, stripe_onboarding_complete) are server-managed —
-- only the webhook + edge functions (service role) may write them. Granting
-- trainers UPDATE would let them self-flip charges_enabled / payouts_enabled
-- and route payments to arbitrary accounts.
--
-- If trainers need to edit other profile fields from the client, use a
-- SECURITY DEFINER RPC that excludes the stripe_* columns.
--
-- SELECT is already covered by schema.sql ("Trainers are viewable by everyone").
