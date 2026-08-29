//
//  Run.swift
//  skills-ios
//
//  GPS-tracked runs, matching the web `runs` table.
//

import Foundation

/// One kept GPS sample. `t` is epoch milliseconds, matching the web writer
/// so both clients produce interchangeable `path` JSON.
struct RunPoint: Codable, Equatable {
    let lat: Double
    let lng: Double
    let t: Double
    let accuracy: Double?
}

struct Run: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let startedAt: Date
    let endedAt: Date
    let durationSeconds: Int
    let distanceMiles: Double
    let avgPaceMinPerMile: Double?
    let maxSpeedMph: Double?
    let path: [RunPoint]?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case startedAt = "started_at"
        case endedAt = "ended_at"
        case durationSeconds = "duration_seconds"
        case distanceMiles = "distance_miles"
        case avgPaceMinPerMile = "avg_pace_min_per_mile"
        case maxSpeedMph = "max_speed_mph"
        case path
        case notes
    }
}
