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
    var trainerId: UUID
    var date: Date
    var location: String?
    var price: Decimal?
    var spotsAvailable: Int?
    var registeredCount: Int?
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case trainerId = "trainer_id"
        case date
        case location
        case price
        case spotsAvailable = "spots_available"
        case registeredCount = "registered_count"
        case createdAt = "created_at"
    }
}

struct EventRegistration: Codable, Identifiable {
    let id: UUID
    var eventId: UUID
    var userId: UUID
    var status: RegistrationStatus
    var notes: String?
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case eventId = "event_id"
        case userId = "user_id"
        case status
        case notes
        case createdAt = "created_at"
    }
}

enum RegistrationStatus: String, Codable {
    case confirmed
    case cancelled
    case waitlist
}

