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
    var specialization: [String]
    var location: String?
    var hourlyRate: Decimal
    var rating: Decimal
    var totalReviews: Int
    var yearsExperience: Int?
    var certifications: [String]?
    var avatarUrl: String?
    var isAvailable: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case bio
        case specialization
        case location
        case hourlyRate = "hourly_rate"
        case rating
        case totalReviews = "total_reviews"
        case yearsExperience = "years_experience"
        case certifications
        case avatarUrl = "avatar_url"
        case isAvailable = "is_available"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct TrainerService: Codable, Identifiable, Hashable {
    let id: UUID
    var trainerId: UUID
    var serviceName: String
    var description: String?
    var duration: Int
    var price: Decimal
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case serviceName = "service_name"
        case description
        case duration
        case price
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

