//
//  Drill.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Drill: Codable, Identifiable {
    let id: UUID
    var title: String
    var description: String?
    var category: String
    var difficulty: Difficulty
    var duration: Int?
    var xpReward: Int
    var equipment: [String]
    var instructions: String?
    var videoUrl: String?
    var thumbnailUrl: String?
    var createdBy: UUID?
    var isActive: Bool
    let createdAt: Date
    let updatedAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case category
        case difficulty
        case duration
        case xpReward = "xp_reward"
        case equipment
        case instructions
        case videoUrl = "video_url"
        case thumbnailUrl = "thumbnail_url"
        case createdBy = "created_by"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct DrillRating: Codable, Identifiable {
    let id: UUID
    var drillId: UUID
    var userId: UUID
    var rating: Int
    var review: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case drillId = "drill_id"
        case userId = "user_id"
        case rating
        case review
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

