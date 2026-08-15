//
//  Gamification.swift
//  skills-ios
//
//  Athlete schedule, check-ins, streaks, badges.
//  All ids are auth.users ids.
//

import Foundation

struct AthleteEvent: Codable, Identifiable {
    let id: UUID
    let athleteId: UUID
    var title: String
    var eventType: EventType
    var eventDate: String   // "yyyy-MM-dd", device-local (web parity)
    var startTime: String?  // "HH:mm:ss"
    var opponent: String?
    var location: String?
    var notes: String?
    var bookingId: UUID?    // set when the event mirrors a trainer booking

    enum EventType: String, Codable, CaseIterable {
        case game, practice, workout, rest
        case training  // booking-derived; not user-creatable
    }

    enum CodingKeys: String, CodingKey {
        case id
        case athleteId = "athlete_id"
        case title
        case eventType = "event_type"
        case eventDate = "event_date"
        case startTime = "start_time"
        case opponent
        case location
        case notes
        case bookingId = "booking_id"
    }
}

struct DailyCheckin: Codable, Identifiable {
    let id: UUID
    let athleteId: UUID
    let eventId: UUID?
    let checkInDate: String  // "yyyy-MM-dd"
    let status: String       // confirmed | skipped | rescheduled
    var energyRating: Int?
    let note: String?

    enum CodingKeys: String, CodingKey {
        case id
        case athleteId = "athlete_id"
        case eventId = "event_id"
        case checkInDate = "check_in_date"
        case status
        case energyRating = "energy_rating"
        case note
    }
}

struct AthleteStreak: Codable {
    let id: UUID
    let athleteId: UUID
    var currentStreak: Int
    var longestStreak: Int
    var lastCheckinDate: String?
    var totalXp: Int
    var level: String

    enum CodingKeys: String, CodingKey {
        case id
        case athleteId = "athlete_id"
        case currentStreak = "current_streak"
        case longestStreak = "longest_streak"
        case lastCheckinDate = "last_checkin_date"
        case totalXp = "total_xp"
        case level
    }
}

struct AthleteAchievement: Codable, Identifiable {
    let id: UUID
    let athleteId: UUID
    let badgeId: String
    let badgeName: String
    let earnedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case athleteId = "athlete_id"
        case badgeId = "badge_id"
        case badgeName = "badge_name"
        case earnedAt = "earned_at"
    }
}
