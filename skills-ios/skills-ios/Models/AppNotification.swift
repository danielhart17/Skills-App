//
//  AppNotification.swift
//  skills-ios
//
//  Rows from the notifications table (fan-out from follow RPCs).
//

import Foundation

struct AppNotification: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let actorId: UUID?
    let type: String
    let title: String
    let body: String?
    let link: String?
    var readAt: Date?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case actorId = "actor_id"
        case type
        case title
        case body
        case link
        case readAt = "read_at"
        case createdAt = "created_at"
    }
}
