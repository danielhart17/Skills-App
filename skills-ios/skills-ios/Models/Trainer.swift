//
//  Trainer.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Trainer: Codable, Identifiable {
    let id: UUID
    var userId: UUID?
    var name: String
    var bio: String?
    var specializations: [String]?
    var location: String?
    var hourlyRate: Decimal?
    var rating: Decimal?
    var yearsExperience: Int?
    var profileImage: String?
    var verified: Bool?
    var stripeAccountId: String? = nil
    var stripeOnboardingComplete: Bool? = nil
    var stripeChargesEnabled: Bool? = nil
    var stripePayoutsEnabled: Bool? = nil
    let createdAt: Date

    var canAcceptPayments: Bool {
        stripeChargesEnabled == true
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case bio
        case specializations
        case location
        case hourlyRate = "hourly_rate"
        case rating
        case yearsExperience = "years_experience"
        case profileImage = "profile_image"
        case verified
        case stripeAccountId = "stripe_account_id"
        case stripeOnboardingComplete = "stripe_onboarding_complete"
        case stripeChargesEnabled = "stripe_charges_enabled"
        case stripePayoutsEnabled = "stripe_payouts_enabled"
        case createdAt = "created_at"
    }
}

struct TrainerService: Codable, Identifiable, Hashable {
    let id: UUID
    var trainerId: UUID
    var name: String
    var description: String?
    var durationMinutes: Int
    var price: Decimal
    var sessionDate: String?      // "yyyy-MM-dd" for one-time sessions
    var startTime: String?        // "HH:mm:ss"
    var location: String?
    var skillLevel: String?       // all_levels | beginner | intermediate | advanced
    var isRecurring: Bool?
    var recurrenceDays: [String]? // lowercase day names, sunday-first
    let createdAt: Date

    /// True when the trainer scheduled this as a session (fixed date/time or recurring).
    var isScheduledSession: Bool {
        sessionDate != nil || isRecurring == true
    }

    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case name
        case description
        case durationMinutes = "duration_minutes"
        case price
        case sessionDate = "session_date"
        case startTime = "start_time"
        case location
        case skillLevel = "skill_level"
        case isRecurring = "is_recurring"
        case recurrenceDays = "recurrence_days"
        case createdAt = "created_at"
    }
}

