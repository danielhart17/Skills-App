#!/usr/bin/env bash
# Deploy Stripe Connect edge functions to Supabase.
# Requires: npx supabase login (or SUPABASE_ACCESS_TOKEN env var)

set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-dadyciqoypfdeotuspms}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

echo "Deploying Stripe Connect functions to project: $PROJECT_REF"

npx supabase functions deploy create-connect-account --project-ref "$PROJECT_REF"
npx supabase functions deploy create-booking-checkout --project-ref "$PROJECT_REF"
npx supabase functions deploy stripe-connect-webhook --project-ref "$PROJECT_REF" --no-verify-jwt

echo ""
echo "Done. Set these secrets in Supabase Dashboard > Edge Functions > Secrets:"
echo "  STRIPE_SECRET_KEY=sk_test_... or sk_live_..."
echo "  STRIPE_CONNECT_WEBHOOK_SECRET=whsec_..."
echo ""
echo "Then retry Set Up Stripe Account in the trainer dashboard."
