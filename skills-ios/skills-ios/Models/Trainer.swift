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
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case name
        case description
        case durationMinutes = "duration_minutes"
        case price
        case createdAt = "created_at"
    }
}

