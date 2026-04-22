// Supabase Edge Function to handle Stripe Connect webhooks
// Handles account updates and payment confirmations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
    } else {
      // Parse without verification (for testing)
      event = JSON.parse(body);
      console.warn("Webhook signature not verified - for testing only");
    }

    console.log("Received webhook event:", event.type);

    switch (event.type) {
      // Handle Connect account updates
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log("Account updated:", account.id);

        // Update trainer's Stripe status
        const { error } = await supabase
          .from("trainers")
          .update({
            stripe_onboarding_complete: account.details_submitted,
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
          })
          .eq("stripe_account_id", account.id);

        if (error) {
          console.error("Error updating trainer Stripe status:", error);
        } else {
          console.log("Updated trainer Stripe status for account:", account.id);
        }
        break;
      }

      // Handle successful payment
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);

        // Get booking ID from metadata
        const bookingId = session.metadata?.booking_id;
        if (!bookingId) {
          console.log("No booking_id in session metadata, might be an event payment");
          break;
        }

        // Update booking status
        const { error } = await supabase
          .from("bookings")
          .update({
            status: "confirmed",
            payment_status: "paid",
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq("id", bookingId);

        if (error) {
          console.error("Error updating booking:", error);
        } else {
          console.log("Booking confirmed:", bookingId);
        }
        break;
      }

      // Handle payment failure
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session expired:", session.id);

        const bookingId = session.metadata?.booking_id;
        if (!bookingId) break;

        // Update booking status to cancelled
        const { error } = await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            payment_status: "expired",
          })
          .eq("id", bookingId);

        if (error) {
          console.error("Error updating expired booking:", error);
        }
        break;
      }

      // Handle refunds
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log("Charge refunded:", charge.id);

        // Find booking by payment intent
        const { data: booking, error: findError } = await supabase
          .from("bookings")
          .select("id")
          .eq("stripe_payment_intent_id", charge.payment_intent)
          .single();

        if (findError || !booking) {
          console.log("Booking not found for refund");
          break;
        }

        // Update booking status
        const { error } = await supabase
          .from("bookings")
          .update({
            status: "refunded",
            payment_status: "refunded",
          })
          .eq("id", booking.id);

        if (error) {
          console.error("Error updating refunded booking:", error);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
