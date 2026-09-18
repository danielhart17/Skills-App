//
//  User.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct User: Codable, Identifiable {
    let id: UUID
    // Nullable since account-deletion anonymization nulls profiles.email
    var email: String?
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
    var dateOfBirth: String?
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
        case dateOfBirth = "date_of_birth"
        case badges
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// True if the user is under 18 OR has no date of birth on file.
    /// No DOB is treated as blocked (safety: no bypass by omitting birthdate).
    var isMinorOrUnknownAge: Bool {
        guard let dob = dateOfBirth, !dob.isEmpty else { return true }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let birthDate = formatter.date(from: dob) else { return true }
        let age = Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year ?? 0
        return age < 18
    }
}

enum UserRole: String, Codable {
    case user      // legacy athlete role
    case athlete   // web signups use this
    case parent
    case trainer
    case admin
}

