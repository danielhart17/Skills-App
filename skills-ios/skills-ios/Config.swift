//
//  Config.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Config {
    // Supabase Configuration
    static let supabaseURL = "https://dadyciqoypfdeotuspms.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZHljaXFveXBmZGVvdHVzcG1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzYyNjcsImV4cCI6MjA3NDkxMjI2N30.fXbVZ0UlNTe3UVtkdc9xBbtZrpoIcs718EI78c9XKFY"
    
    // Stripe Configuration
    static let stripePublishableKey = "pk_test_51Nrr9GJPFwwYomIvXbGYImqTqmtkaUAXnGXvueX4yjrAiTGjZvjBrC1mxt5gxKpC6X9DxxYcKNjxK3IeySF6UqKE004tqFiExZ"
    
    // App Configuration
    static let appName = "Skills"
    static let appVersion = "1.0.0"
    
    // API Endpoints
    static let createCheckoutSessionURL = "\(supabaseURL)/functions/v1/create-checkout-session"
    static let stripeWebhookURL = "\(supabaseURL)/functions/v1/stripe-webhook"
    static let verifyPaymentURL = "\(supabaseURL)/functions/v1/verify-payment"
}

