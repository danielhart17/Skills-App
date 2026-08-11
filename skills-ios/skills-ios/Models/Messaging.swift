//
//  Messaging.swift
//  skills-ios
//
//  Trainer↔athlete messaging. All ids here are auth.users ids —
//  never User.trainerId (that holds a trainers.id; RLS would return nothing).
//

import Foundation

struct TrainerAthleteConnection: Codable, Identifiable {
    let id: UUID
    let trainerId: UUID
    let athleteId: UUID
    var status: String  // pending | active | declined
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case athleteId = "athlete_id"
        case status
        case createdAt = "created_at"
    }
}

struct Conversation: Codable, Identifiable {
    let id: UUID
    let trainerId: UUID
    let athleteId: UUID
    var lastMessageAt: Date
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case trainerId = "trainer_id"
        case athleteId = "athlete_id"
        case lastMessageAt = "last_message_at"
        case createdAt = "created_at"
    }
}

struct Message: Codable, Identifiable {
    let id: UUID
    let conversationId: UUID
    let senderId: UUID
    let receiverId: UUID
    let body: String?
    let messageType: String  // text | workout | film_feedback | media
    let workoutPayload: WorkoutPayload?
    var readAt: Date?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case conversationId = "conversation_id"
        case senderId = "sender_id"
        case receiverId = "receiver_id"
        case body
        case messageType = "message_type"
        case workoutPayload = "workout_payload"
        case readAt = "read_at"
        case createdAt = "created_at"
    }

    var preview: String {
        switch messageType {
        case "workout": return "🏋️ Workout: \(workoutPayload?.title ?? "New workout")"
        case "film_feedback": return "🎬 Film feedback"
        case "media": return body?.isEmpty == false ? body! : "📎 Attachment"
        default: return body ?? ""
        }
    }
}

struct WorkoutPayload: Codable {
    var title: String
    var scheduledDate: String?
    var scheduledTime: String?
    var intensity: String?
    var drills: [WorkoutDrill]?
    var trainerNotes: String?

    enum CodingKeys: String, CodingKey {
        case title
        case scheduledDate = "scheduled_date"
        case scheduledTime = "scheduled_time"
        case intensity
        case drills
        case trainerNotes = "trainer_notes"
    }
}

struct WorkoutDrill: Codable {
    var name: String
    var sets: String?
    var notes: String?
}

struct MessageAttachment: Codable, Identifiable {
    let id: UUID
    let messageId: UUID
    let fileUrl: String  // storage PATH in private message-media bucket, not a URL
    let fileType: String  // image | video
    let fileName: String?
    let fileSizeBytes: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case messageId = "message_id"
        case fileUrl = "file_url"
        case fileType = "file_type"
        case fileName = "file_name"
        case fileSizeBytes = "file_size_bytes"
    }
}

/// Light row from profiles for showing names/avatars of the other party.
struct PublicProfile: Codable, Identifiable {
    let id: UUID
    let fullName: String?
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
    }

    var displayName: String { fullName?.isEmpty == false ? fullName! : "User" }
}

/// Upload result, ready to attach to a message.
struct NewAttachment {
    let fileUrl: String  // storage path
    let fileType: String
    let fileName: String
    let fileSizeBytes: Int
}
