//
//  ShootingSession.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct ShootingSession: Codable, Identifiable {
    let id: UUID
    var userId: UUID
    var date: Date
    var totalShots: Int
    var madeShots: Int
    var missedShots: Int?
    var shootingPercentage: Decimal
    var durationSeconds: Int?
    var shots: [Shot]?
    var zoneStats: [String: ZoneStat]?
    let createdAt: Date?
    
    // Computed property to get missed shots (calculated if not stored)
    var calculatedMissedShots: Int {
        missedShots ?? (totalShots - madeShots)
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case date
        case totalShots = "total_shots"
        case madeShots = "made_shots"
        case missedShots = "missed_shots"
        case shootingPercentage = "shooting_percentage"
        case durationSeconds = "duration_seconds"
        case shots
        case zoneStats = "zone_stats"
        case createdAt = "created_at"
    }
}

struct ZoneStat: Codable {
    var made: Int
    var attempts: Int
}

struct Shot: Codable, Identifiable {
    let id: UUID
    var x: Double
    var y: Double
    var made: Bool
    var zone: String?
    
    init(id: UUID = UUID(), x: Double, y: Double, made: Bool, zone: String? = nil) {
        self.id = id
        self.x = x
        self.y = y
        self.made = made
        self.zone = zone
    }
}

