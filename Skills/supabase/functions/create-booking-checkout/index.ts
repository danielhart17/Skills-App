// Supabase Edge Function to create Stripe Checkout session for trainer bookings
// Uses Stripe Connect with application_fee_amount for platform commission

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Athlete pays base + service fee; trainer nets base - commission.
const SERVICE_FEE_PERCENTAGE = 0.10; // 10% of basePrice (athlete-facing)
const TRAINER_COMMISSION_PERCENTAGE = 0.03; // 3% of basePrice (from trainer payout)
const PLATFORM_FLOOR_CENTS = 200; // $2.00 minimum combined platform take

/**
 * Fee breakdown in whole cents.
 * Invariant: trainerPayout + platformTake === totalCharged
 * (Stripe card processing fees are separate and come out of the platform.)
 */
function calculateBookingFees(basePrice: number) {
  let serviceFee = Math.round(basePrice * SERVICE_FEE_PERCENTAGE);
  const trainerCommission = Math.round(basePrice * TRAINER_COMMISSION_PERCENTAGE);

  // Floor: bump athlete service fee so serviceFee + trainerCommission >= $2.
  // Never touch trainerCommission — trainer payout stays basePrice - trainerCommission.
  if (serviceFee + trainerCommission < PLATFORM_FLOOR_CENTS) {
    serviceFee = PLATFORM_FLOOR_CENTS - trainerCommission;
  }

  const platformTake = serviceFee + trainerCommission;
  const totalCharged = basePrice + serviceFee;
  const trainerPayout = basePrice - trainerCommission;

  if (trainerPayout + platformTake !== totalCharged) {
    throw new Error(
      `Fee reconciliation failed: payout(${trainerPayout}) + platform(${platformTake}) !== charged(${totalCharged})`
    );
  }

  return {
    basePrice,
    serviceFee,
    trainerCommission,
    totalCharged,
    trainerPayout,
    platformTake,
  };
}

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

    // Authoritative session price from DB (cents). Fall back to client servicePrice.
    const basePrice = Math.round(Number(service.price ?? servicePrice) * 100);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return new Response(
        JSON.stringify({ error: "Invalid service price" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const fees = calculateBookingFees(basePrice);

    console.log("Booking fee breakdown (cents):", fees);

    // Create a pending booking record (dollar amounts for existing columns)
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        trainer_id: trainerId,
        user_id: userId,
        service_id: serviceId,
        service_name: serviceName,
        booking_datetime: bookingDatetime,
        duration_minutes: serviceDuration || 60,
        total_price: fees.totalCharged / 100,
        platform_fee: fees.platformTake / 100,
        trainer_payout: fees.trainerPayout / 100,
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

    // Destination charge: athlete pays totalCharged; platform keeps application_fee;
    // connected account receives totalCharged - application_fee (= trainerPayout).
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
            unit_amount: fees.totalCharged,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: appendBookingId(successUrl, booking.id),
      cancel_url: appendBookingId(cancelUrl, booking.id),
      payment_intent_data: {
        application_fee_amount: fees.platformTake,
        transfer_data: {
          destination: trainer.stripe_account_id,
        },
      },
      metadata: {
        booking_id: booking.id,
        trainer_id: trainerId,
        user_id: userId,
        service_id: serviceId,
        base_price: String(fees.basePrice),
        service_fee: String(fees.serviceFee),
        trainer_commission: String(fees.trainerCommission),
        platform_take: String(fees.platformTake),
        trainer_payout: String(fees.trainerPayout),
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
        breakdown: {
          basePrice: fees.basePrice,
          serviceFee: fees.serviceFee,
          trainerCommission: fees.trainerCommission,
          totalCharged: fees.totalCharged,
          trainerPayout: fees.trainerPayout,
          platformTake: fees.platformTake,
        },
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
