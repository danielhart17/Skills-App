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
    var storedShootingPercentage: Decimal?
    var durationSeconds: Int?
    var shots: [Shot]?
    var zoneStats: [String: ZoneStat]?
    let createdAt: Date?

    var calculatedMissedShots: Int {
        totalShots - madeShots
    }

    /// Stored value when present, else derived (older rows have NULL).
    var shootingPercentage: Decimal {
        if let stored = storedShootingPercentage { return stored }
        guard totalShots > 0 else { return 0 }
        return Decimal(madeShots) / Decimal(totalShots) * 100
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case date
        case totalShots = "total_shots"
        case madeShots = "made_shots"
        case storedShootingPercentage = "shooting_percentage"
        case durationSeconds = "duration_seconds"
        case shots = "shots_data"  // prod column; web video flow writes here too
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

    // Tolerant decoding: the web video-review flow writes shots_data entries
    // shaped {zone, made, timestamp, ...} with no id/x/y — default those so
    // one web-created session can't break the whole history fetch.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = (try? container.decode(UUID.self, forKey: .id)) ?? UUID()
        x = (try? container.decode(Double.self, forKey: .x)) ?? 0
        y = (try? container.decode(Double.self, forKey: .y)) ?? 0
        made = (try? container.decode(Bool.self, forKey: .made)) ?? false
        zone = try? container.decode(String.self, forKey: .zone)
    }
}

