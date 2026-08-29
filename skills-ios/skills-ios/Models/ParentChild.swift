//
//  ParentChild.swift
//  skills-ios
//
//  Parent ↔ child linking, mirroring the web ParentChild entity.
//

import Foundation

/// Row from the get_linked_children RPC.
struct LinkedChild: Codable, Identifiable {
    let childId: UUID
    let childName: String?
    let childEmail: String?
    let childLevel: Int?
    let childXp: Int?
    let childStreak: Int?
    let linkedAt: Date?

    var id: UUID { childId }
    var displayName: String { childName?.isEmpty == false ? childName! : "Athlete" }

    enum CodingKeys: String, CodingKey {
        case childId = "child_id"
        case childName = "child_name"
        case childEmail = "child_email"
        case childLevel = "child_level"
        case childXp = "child_xp"
        case childStreak = "child_streak"
        case linkedAt = "linked_at"
    }
}

/// Row from the get_child_progress_summary RPC.
struct ChildProgressSummary: Codable {
    let totalLessonsCompleted: Int?
    let totalChallengesCompleted: Int?
    let totalXp: Int?
    let currentLevel: Int?
    let currentStreak: Int?
    let longestStreak: Int?

    enum CodingKeys: String, CodingKey {
        case totalLessonsCompleted = "total_lessons_completed"
        case totalChallengesCompleted = "total_challenges_completed"
        case totalXp = "total_xp"
        case currentLevel = "current_level"
        case currentStreak = "current_streak"
        case longestStreak = "longest_streak"
    }
}

/// Invite code an athlete generates for a parent to redeem.
struct ChildInviteCode {
    let code: String
    let expiresAt: Date
}

/// A game a parent logged for a linked child (player_game_stats).
struct PlayerGameStat: Codable, Identifiable {
    let id: UUID
    let parentId: UUID
    let childId: UUID
    var gameDate: String   // "yyyy-MM-dd"
    var opponent: String?
    var points: Int
    var rebounds: Int
    var assists: Int
    var steals: Int
    var blocks: Int
    var turnovers: Int
    var minutesPlayed: Int
    var fgMade: Int
    var fgAttempted: Int
    var threeMade: Int
    var threeAttempted: Int
    var ftMade: Int
    var ftAttempted: Int
    var notes: String?

    private func percent(_ made: Int, _ attempted: Int) -> String {
        guard attempted > 0 else { return "—" }
        return String(format: "%.0f%%", Double(made) / Double(attempted) * 100)
    }

    var fgPercent: String { percent(fgMade, fgAttempted) }
    var threePercent: String { percent(threeMade, threeAttempted) }
    var ftPercent: String { percent(ftMade, ftAttempted) }

    enum CodingKeys: String, CodingKey {
        case id
        case parentId = "parent_id"
        case childId = "child_id"
        case gameDate = "game_date"
        case opponent
        case points, rebounds, assists, steals, blocks, turnovers
        case minutesPlayed = "minutes_played"
        case fgMade = "fg_made"
        case fgAttempted = "fg_attempted"
        case threeMade = "three_made"
        case threeAttempted = "three_attempted"
        case ftMade = "ft_made"
        case ftAttempted = "ft_attempted"
        case notes
    }
}
