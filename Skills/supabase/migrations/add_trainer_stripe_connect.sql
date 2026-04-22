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

-- Add RLS policies for the new columns
-- Trainers can read their own stripe info
CREATE POLICY IF NOT EXISTS "Trainers can view own stripe info"
ON trainers FOR SELECT
USING (user_id = auth.uid());

-- Trainers can update their own stripe info
CREATE POLICY IF NOT EXISTS "Trainers can update own stripe info"
ON trainers FOR UPDATE
USING (user_id = auth.uid());
