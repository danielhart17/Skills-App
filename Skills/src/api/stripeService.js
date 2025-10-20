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
      successUrl: `${globalThis.location.origin}/Events?success=true&event_id=${eventId}`,
      cancelUrl: `${globalThis.location.origin}/Events?canceled=true`,
    };

    console.log("Creating checkout session with:", requestBody);

    // Call Supabase Edge Function to create Stripe checkout session
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: requestBody,
      }
    );

    console.log("Edge function response:", { data, error });

    if (error) {
      console.error("Edge function error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Try to extract more details from the error
      const errorMessage = error.message || "Unknown error";
      const errorDetails =
        error.details || error.hint || "No additional details";

      throw new Error(
        `Stripe checkout failed: ${errorMessage}. Details: ${errorDetails}`
      );
    }

    if (!data || !data.sessionId) {
      console.error("Invalid response from Edge Function:", data);
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
