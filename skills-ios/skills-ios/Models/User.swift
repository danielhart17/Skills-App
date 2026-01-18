//
//  User.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct User: Codable, Identifiable {
    let id: UUID
    var email: String
    var fullName: String?
    var role: UserRole
    var currentLevel: Int
    var totalXp: Int
    var currentStreak: Int
    var longestStreak: Int
    var avatarUrl: String?
    var trainerId: UUID?
    var entryExamCompleted: Bool
    var completedLessons: [UUID]?
    var lastActivityDate: String?
    var favoritePosition: String?
    var badges: [String]?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case fullName = "full_name"
        case role
        case currentLevel = "current_level"
        case totalXp = "total_xp"
        case currentStreak = "current_streak"
        case longestStreak = "longest_streak"
        case avatarUrl = "avatar_url"
        case trainerId = "trainer_id"
        case entryExamCompleted = "entry_exam_completed"
        case completedLessons = "completed_lessons"
        case lastActivityDate = "last_activity_date"
        case favoritePosition = "favorite_position"
        case badges
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum UserRole: String, Codable {
    case user
    case trainer
    case admin
}

