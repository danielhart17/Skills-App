// Follow this setup guide to integrate the Deno runtime into your Supabase project:
// https://supabase.com/docs/guides/functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";

serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
      apiVersion: "2023-10-16",
    });

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") as string;

    // Verify the webhook signature
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log(`Received event: ${event.type}`);

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Extract metadata
      const { eventId, userId } = session.metadata || {};

      if (eventId && userId) {
        // Create event registration
        const { data: registration, error: registrationError } = await supabase
          .from("event_registrations")
          .insert({
            event_id: eventId,
            user_id: userId,
            status: "confirmed",
            notes: `Payment ID: ${session.payment_intent}`,
          })
          .select()
          .single();

        if (registrationError) {
          console.error("Error creating registration:", registrationError);
          // Don't return an error to Stripe - we'll handle this manually
        } else {
          console.log("Registration created:", registration);
        }
      } else {
        console.error("Missing metadata in session:", session);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

