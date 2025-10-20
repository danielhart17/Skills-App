// Follow this setup guide to integrate the Deno runtime into your Supabase project:
// https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));

    const { eventId, eventTitle, price, userId, successUrl, cancelUrl } = body;

    // Validate required parameters
    if (!eventId || !eventTitle || price === undefined || price === null || !userId || !successUrl || !cancelUrl) {
      const missing = [];
      if (!eventId) missing.push("eventId");
      if (!eventTitle) missing.push("eventTitle");
      if (price === undefined || price === null) missing.push("price");
      if (!userId) missing.push("userId");
      if (!successUrl) missing.push("successUrl");
      if (!cancelUrl) missing.push("cancelUrl");

      console.error("Missing required parameters:", missing);
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters", 
          missing,
          received: body 
        }),
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

    // Initialize Stripe with your secret key
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    console.log("Creating Stripe checkout session for event:", eventId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: eventTitle,
              description: `Event registration for ${eventTitle}`,
            },
            unit_amount: price, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        eventId,
        userId,
      },
    });

    console.log("Checkout session created:", session.id);

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

