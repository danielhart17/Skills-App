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
