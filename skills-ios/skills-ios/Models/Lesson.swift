//
//  Lesson.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Lesson: Codable, Identifiable {
    let id: UUID
    var title: String
    var description: String?
    var mode: LessonMode
    var chapter: String?
    var chapterId: UUID?
    var difficulty: Difficulty?
    var level: Int?
    var orderIndex: Int?
    var estimatedTime: Int?
    var xpReward: Int?
    var thumbnailUrl: String?
    var videoUrl: String?
    var content: String?
    var isActive: Bool?
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case mode
        case chapter
        case chapterId = "chapter_id"
        case difficulty
        case level
        case orderIndex = "order_index"
        case estimatedTime = "estimated_time"
        case xpReward = "xp_reward"
        case thumbnailUrl = "thumbnail_url"
        case videoUrl = "video_url"
        case content
        case isActive = "is_active"
        case createdAt = "created_at"
    }
}

enum LessonMode: String, Codable {
    case iq
    case oncourt
}

enum Difficulty: String, Codable {
    case beginner
    case intermediate
    case advanced
}

