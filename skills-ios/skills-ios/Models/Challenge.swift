//
//  Challenge.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Challenge: Codable, Identifiable {
    let id: UUID
    var title: String
    var description: String?
    var category: String
    var difficulty: Difficulty
    var xpReward: Int
    var duration: Int?
    var isFeatured: Bool
    var createdBy: UUID?
    var thumbnailUrl: String?
    var setup: String?
    var instructions: String?
    var spaceRequired: String?
    var playersNeeded: Int?
    var purpose: String?
    var focus: String?
    let createdAt: Date
    let updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case category
        case difficulty
        case xpReward = "xp_reward"
        case duration
        case isFeatured = "is_featured"
        case createdBy = "created_by"
        case thumbnailUrl = "thumbnail_url"
        case setup
        case instructions
        case spaceRequired = "space_required"
        case playersNeeded = "players_needed"
        case purpose
        case focus
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

