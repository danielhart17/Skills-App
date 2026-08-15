// Supabase Edge Function to create Stripe Connect account and onboarding link
// https://stripe.com/docs/connect/express-accounts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.10.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));

    const { trainerId, refreshUrl, returnUrl } = body;

    // Validate required parameters
    if (!trainerId || !refreshUrl || !returnUrl) {
      const missing = [];
      if (!trainerId) missing.push("trainerId");
      if (!refreshUrl) missing.push("refreshUrl");
      if (!returnUrl) missing.push("returnUrl");

      console.error("Missing required parameters:", missing);
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters", 
          missing,
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

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the caller via JWT
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

    // Get trainer data
    const { data: trainer, error: trainerError } = await supabase
      .from("trainers")
      .select("id, name, user_id, stripe_account_id")
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

    // Caller must own this trainer record (user_id or linked profiles.trainer_id)
    let ownsTrainer = trainer.user_id === caller.id;
    if (!ownsTrainer) {
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("trainer_id")
        .eq("id", caller.id)
        .maybeSingle();
      ownsTrainer = callerProfile?.trainer_id === trainerId;
    }

    if (!ownsTrainer) {
      console.error("Forbidden: caller does not own trainer", {
        caller: caller.id,
        trainer: trainerId,
        trainerUserId: trainer.user_id,
      });
      return new Response(
        JSON.stringify({
          error: "You can only connect Stripe to your own trainer profile.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // Backfill user_id when missing so future checks succeed.
    if (!trainer.user_id) {
      await supabase
        .from("trainers")
        .update({ user_id: caller.id })
        .eq("id", trainerId);
    }

    let accountId = trainer.stripe_account_id;

    // Create a new Stripe Connect account if one doesn't exist
    if (!accountId) {
      console.log("Creating new Stripe Connect account for trainer:", trainerId);
      
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          trainer_id: trainerId,
          platform: "skills-app",
        },
      });

      accountId = account.id;

      // Save the Stripe account ID to the trainer record
      const { error: updateError } = await supabase
        .from("trainers")
        .update({ stripe_account_id: accountId })
        .eq("id", trainerId);

      if (updateError) {
        console.error("Error saving Stripe account ID:", updateError);
        // Don't fail - account was created, we can try to save later
      }

      console.log("Created Stripe Connect account:", accountId);
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    console.log("Created account link for trainer:", trainerId);

    return new Response(
      JSON.stringify({ 
        url: accountLink.url,
        accountId: accountId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating Connect account:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
