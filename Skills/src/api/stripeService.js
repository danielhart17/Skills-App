import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "./supabaseClient";

// Initialize Stripe with your publishable key
// This should be in your .env.local file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Create a checkout session for event registration
 * @param {Object} params - Checkout parameters
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {number} params.price - Price in cents
 * @param {string} params.userId - User ID
 * @returns {Promise<Object>} Checkout session data
 */
export async function createEventCheckoutSession({
  eventId,
  eventTitle,
  price,
  userId,
}) {
  try {
    const requestBody = {
      eventId,
      eventTitle,
      price,
      userId,
      successUrl: `${globalThis.location.origin}/events?success=true&event_id=${eventId}`,
      cancelUrl: `${globalThis.location.origin}/events?canceled=true`,
    };

    // Call Supabase Edge Function to create Stripe checkout session
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: requestBody,
      }
    );

    if (error) {
      // Try to extract more details from the error
      const errorMessage = error.message || "Unknown error";
      const errorDetails =
        error.details || error.hint || "No additional details";

      throw new Error(
        `Stripe checkout failed: ${errorMessage}. Details: ${errorDetails}`
      );
    }

    if (!data || !data.sessionId) {
      throw new Error("Edge Function did not return a session ID");
    }

    return data;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

/**
 * Redirect to Stripe Checkout
 * @param {string} sessionId - Stripe checkout session ID
 */
export async function redirectToCheckout(sessionId) {
  try {
    const stripe = await stripePromise;
    const { error } = await stripe.redirectToCheckout({ sessionId });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error redirecting to checkout:", error);
    throw error;
  }
}

/**
 * Verify payment and complete event registration
 * @param {string} sessionId - Stripe checkout session ID
 * @returns {Promise<Object>} Payment verification result
 */
export async function verifyPaymentAndRegister(sessionId) {
  try {
    // Call Supabase Edge Function to verify payment and create registration
    const { data, error } = await supabase.functions.invoke("verify-payment", {
      body: { sessionId },
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error verifying payment:", error);
    throw error;
  }
}

/**
 * Handle free event registration (no payment required)
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Registration data
 */
export async function registerForFreeEvent(eventId, userId) {
  try {
    const { data, error } = await supabase
      .from("event_registrations")
      .insert({
        event_id: eventId,
        user_id: userId,
        status: "confirmed",
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error registering for free event:", error);
    throw error;
  }
}

// ============================================
// STRIPE CONNECT - TRAINER PAYMENTS
// ============================================

const STRIPE_CONNECT_NOT_DEPLOYED_MESSAGE =
  "The Stripe Connect edge function is not deployed yet. In Supabase Dashboard go to Edge Functions and deploy create-connect-account, or run: npx supabase functions deploy create-connect-account --project-ref dadyciqoypfdeotuspms";

async function parseFunctionInvokeError(error, data) {
  if (data?.error) return data.error;

  let message = error?.message || "Edge function request failed";

  try {
    if (error?.context?.json) {
      const body = await error.context.json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
  } catch {
    // Ignore JSON parse failures.
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("failed to send a request to the edge function") ||
    lower.includes("not_found") ||
    lower.includes("requested function was not found")
  ) {
    return STRIPE_CONNECT_NOT_DEPLOYED_MESSAGE;
  }

  return message;
}

/**
 * Create a Stripe Connect account for a trainer and get onboarding link
 * @param {string} trainerId - Trainer ID
 * @returns {Promise<Object>} Contains onboarding URL and account ID
 */
export async function createConnectAccount(trainerId) {
  try {
    const baseUrl = globalThis.location.origin;
    const { data, error } = await supabase.functions.invoke(
      "create-connect-account",
      {
        body: {
          trainerId,
          refreshUrl: `${baseUrl}/trainerdashboard?stripe_refresh=true`,
          returnUrl: `${baseUrl}/trainerdashboard?stripe_onboarding=complete`,
        },
      }
    );

    if (error) {
      throw new Error(await parseFunctionInvokeError(error, data));
    }

    if (!data?.url) {
      throw new Error(STRIPE_CONNECT_NOT_DEPLOYED_MESSAGE);
    }

    return data;
  } catch (error) {
    console.error("Error creating Connect account:", error);
    throw error;
  }
}

/**
 * Get trainer's Stripe account status
 * @param {string} trainerId - Trainer ID
 * @returns {Promise<Object>} Stripe account status
 */
export async function getTrainerStripeStatus(trainerId) {
  try {
    const { data, error } = await supabase
      .from("trainers")
      .select(
        "stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled"
      )
      .eq("id", trainerId)
      .single();

    if (error) {
      if (error.message?.includes("stripe_account_id")) {
        throw new Error(
          "Stripe columns are missing on trainers. Run add_trainer_stripe_connect.sql in Supabase."
        );
      }
      throw error;
    }

    return {
      hasAccount: !!data?.stripe_account_id,
      onboardingComplete: data?.stripe_onboarding_complete || false,
      chargesEnabled: data?.stripe_charges_enabled || false,
      payoutsEnabled: data?.stripe_payouts_enabled || false,
    };
  } catch (error) {
    console.error("Error getting trainer Stripe status:", error);
    throw error;
  }
}

/**
 * Create a checkout session for trainer booking
 * @param {Object} params - Booking parameters
 * @returns {Promise<Object>} Checkout session data
 */
export async function createBookingCheckoutSession({
  trainerId,
  userId,
  serviceId,
  serviceName,
  servicePrice,
  serviceDuration,
  bookingDatetime,
  userNotes,
}) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "create-booking-checkout",
      {
        body: {
          trainerId,
          userId,
          serviceId,
          serviceName,
          servicePrice,
          serviceDuration,
          bookingDatetime,
          userNotes,
          successUrl: `${globalThis.location.origin}/Booking?success=true`,
          cancelUrl: `${globalThis.location.origin}/Booking?canceled=true`,
        },
      }
    );

    if (error) {
      // Check if it's a trainer setup issue
      if (data?.message) {
        throw new Error(data.message);
      }
      throw new Error(`Failed to create booking checkout: ${error.message}`);
    }

    if (!data || !data.sessionId) {
      throw new Error("Edge Function did not return a session ID");
    }

    return data;
  } catch (error) {
    console.error("Error creating booking checkout:", error);
    throw error;
  }
}

/**
 * Verify booking payment status
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Object>} Booking with payment status
 */
export async function verifyBookingPayment(bookingId) {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, status, payment_status, total_price")
      .eq("id", bookingId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error("Error verifying booking payment:", error);
    throw error;
  }
}
