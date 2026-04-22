//
//  Config.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Config {
    // Supabase — anon key is safe to ship in client code (RLS-protected).
    static let supabaseURL = "https://dadyciqoypfdeotuspms.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZHljaXFveXBmZGVvdHVzcG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNjcsImV4cCI6MjA3NDkxMjI2N30.fXbVZ0UlNTe3UVtkdc9xBbtZrpoIcs718EI78c9XKFY"

    // Stripe publishable key (pk_live_*) — used for Connect onboarding and
    // booking checkout via the create-booking-checkout edge function.
    static let stripePublishableKey = "pk_live_51TP8FgCcCBvGjUe6wE7A5BUMoTDlRKtQhm1Xg559tDLeXcz5SZHwBRPne11NjC1dKd9ah7qgVCx4WEeRTuKS1Gr500YkFsV1JE"

    static let appName = "Skills"
    static let appVersion = "1.0.0"

    // Stripe Connect edge functions (deployed via Supabase).
    static let createConnectAccountURL = "\(supabaseURL)/functions/v1/create-connect-account"
    static let createBookingCheckoutURL = "\(supabaseURL)/functions/v1/create-booking-checkout"
    static let stripeConnectWebhookURL = "\(supabaseURL)/functions/v1/stripe-connect-webhook"

    // Stripe Checkout requires HTTPS success/cancel URLs, so we land the user
    // back on the existing web pages that already handle ?success=true /
    // ?canceled=true. webAppURL has no trailing slash so the paths below stay
    // single-slashed.
    static let webAppURL = "https://skills.lockedinsports.com"
    static let bookingSuccessURL = "\(webAppURL)/Booking?success=true"
    static let bookingCancelURL = "\(webAppURL)/Booking?canceled=true"
    static let stripeOnboardingReturnURL = "\(webAppURL)/TrainerDashboard?stripe_onboarding=complete"
    static let stripeOnboardingRefreshURL = "\(webAppURL)/TrainerDashboard?stripe_refresh=true"
}

