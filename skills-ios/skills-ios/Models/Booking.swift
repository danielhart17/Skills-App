//
//  Booking.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Booking: Codable, Identifiable {
    let id: UUID
    var userId: UUID
    var trainerId: UUID
    var serviceId: UUID
    var bookingDatetime: Date
    var status: BookingStatus
    var notes: String?
    var price: Decimal
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case trainerId = "trainer_id"
        case serviceId = "service_id"
        case bookingDatetime = "booking_datetime"
        case status
        case notes
        case price
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum BookingStatus: String, Codable {
    case pending
    case confirmed
    case completed
    case cancelled
}

struct Review: Codable, Identifiable {
    let id: UUID
    var trainerId: UUID
    var userId: UUID
    var rating: Int
    var comment: String?
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case userId = "user_id"
        case rating
        case comment
        case createdAt = "created_at"
    }
}

