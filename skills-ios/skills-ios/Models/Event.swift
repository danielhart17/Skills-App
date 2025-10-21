//
//  Event.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct TrainingEvent: Codable, Identifiable {
    let id: UUID
    var title: String
    var description: String?
    var trainerId: UUID?
    var eventDate: Date
    var location: String
    var maxParticipants: Int
    var registeredCount: Int
    var price: Decimal
    var category: String?
    var difficulty: Difficulty?
    var thumbnailUrl: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case trainerId = "trainer_id"
        case eventDate = "event_date"
        case location
        case maxParticipants = "max_participants"
        case registeredCount = "registered_count"
        case price
        case category
        case difficulty
        case thumbnailUrl = "thumbnail_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct EventRegistration: Codable, Identifiable {
    let id: UUID
    var eventId: UUID
    var userId: UUID
    var status: RegistrationStatus
    var notes: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case eventId = "event_id"
        case userId = "user_id"
        case status
        case notes
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum RegistrationStatus: String, Codable {
    case confirmed
    case cancelled
    case waitlist
}

