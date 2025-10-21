//
//  Question.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

struct Question: Codable, Identifiable {
    let id: UUID
    var lessonId: UUID
    var questionText: String
    var mediaType: MediaType
    var mediaUrl: String?
    var optionA: String
    var optionB: String
    var optionC: String
    var optionD: String
    var correctAnswer: String
    var explanation: String?
    var orderIndex: Int
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case lessonId = "lesson_id"
        case questionText = "question_text"
        case mediaType = "media_type"
        case mediaUrl = "media_url"
        case optionA = "option_a"
        case optionB = "option_b"
        case optionC = "option_c"
        case optionD = "option_d"
        case correctAnswer = "correct_answer"
        case explanation
        case orderIndex = "order_index"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum MediaType: String, Codable {
    case none
    case image
    case video
}

struct UserLessonAttempt: Codable, Identifiable {
    let id: UUID
    var userId: UUID
    var lessonId: UUID
    var totalQuestions: Int
    var correctAnswers: Int
    var percentage: Decimal
    var passed: Bool
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case lessonId = "lesson_id"
        case totalQuestions = "total_questions"
        case correctAnswers = "correct_answers"
        case percentage
        case passed
        case createdAt = "created_at"
    }
}

