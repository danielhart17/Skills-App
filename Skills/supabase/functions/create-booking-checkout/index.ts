// Supabase Edge Function to create Stripe Checkout session for trainer bookings
// Uses Stripe Connect with application_fee_amount for platform commission

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform fee percentage (e.g., 0.015 = 1.5%)
const PLATFORM_FEE_PERCENTAGE = 0.015;

// Append booking_id to a URL that may already contain query params.
function appendBookingId(rawUrl: string, bookingId: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set("booking_id", bookingId);
  return url.toString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received booking checkout request:", JSON.stringify(body));

    const { 
      trainerId, 
      userId, 
      serviceId,
      serviceName,
      servicePrice, // Price in dollars
      serviceDuration,
      bookingDatetime,
      userNotes,
      successUrl, 
      cancelUrl 
    } = body;

    // Validate required parameters
    const requiredParams = { trainerId, userId, serviceId, serviceName, servicePrice, bookingDatetime, successUrl, cancelUrl };
    const missing = Object.entries(requiredParams)
      .filter(([_, value]) => !value && value !== 0)
      .map(([key]) => key);

    if (missing.length > 0) {
      console.error("Missing required parameters:", missing);
      return new Response(
        JSON.stringify({ error: "Missing required parameters", missing }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Check for Stripe secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Stripe not configured on server" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the caller via JWT and confirm they match the userId
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    const jwt = authHeader.slice("Bearer ".length);
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !caller) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    if (caller.id !== userId) {
      console.error("Forbidden: userId mismatch", { caller: caller.id, userId });
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Get trainer data including Stripe account
    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id, name, stripe_account_id, stripe_charges_enabled")
      .eq("id", trainerId)
      .single();

    if (trainerError || !trainer) {
      console.error("Trainer not found:", trainerError);
      return new Response(
        JSON.stringify({ error: "Trainer not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Confirm the service belongs to this trainer (and grab authoritative price)
    const { data: service, error: serviceError } = await supabase
      .from("trainer_services")
      .select("id, trainer_id, price, duration_minutes, name")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      console.error("Service not found:", serviceError);
      return new Response(
        JSON.stringify({ error: "Service not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    if (service.trainer_id !== trainerId) {
      console.error("Service does not belong to trainer", { serviceId, trainerId });
      return new Response(
        JSON.stringify({ error: "Service does not belong to trainer" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if trainer has completed Stripe onboarding
    if (!trainer.stripe_account_id || !trainer.stripe_charges_enabled) {
      console.error("Trainer has not completed Stripe onboarding");
      return new Response(
        JSON.stringify({ 
          error: "Trainer payment setup incomplete",
          message: "This trainer hasn't set up their payment account yet. Please contact them directly."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Calculate amounts (convert to cents)
    const priceInCents = Math.round(servicePrice * 100);
    const platformFeeInCents = Math.round(priceInCents * PLATFORM_FEE_PERCENTAGE);
    const trainerPayoutInCents = priceInCents - platformFeeInCents;

    console.log(`Price: $${servicePrice} (${priceInCents} cents)`);
    console.log(`Platform fee: ${PLATFORM_FEE_PERCENTAGE * 100}% = ${platformFeeInCents} cents`);
    console.log(`Trainer payout: ${trainerPayoutInCents} cents`);

    // Create a pending booking record
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        trainer_id: trainerId,
        user_id: userId,
        service_id: serviceId,
        service_name: serviceName,
        booking_datetime: bookingDatetime,
        duration_minutes: serviceDuration || 60,
        total_price: servicePrice,
        platform_fee: platformFeeInCents / 100,
        trainer_payout: trainerPayoutInCents / 100,
        user_notes: userNotes || "",
        status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Create Stripe Checkout session with Connect
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: serviceName,
              description: `Training session with ${trainer.name}`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: appendBookingId(successUrl, booking.id),
      cancel_url: appendBookingId(cancelUrl, booking.id),
      payment_intent_data: {
        application_fee_amount: platformFeeInCents,
        transfer_data: {
          destination: trainer.stripe_account_id,
        },
      },
      metadata: {
        booking_id: booking.id,
        trainer_id: trainerId,
        user_id: userId,
        service_id: serviceId,
      },
    });

    // Update booking with Stripe session ID
    await supabase
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);

    console.log("Created checkout session:", session.id, "for booking:", booking.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        bookingId: booking.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating booking checkout:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
