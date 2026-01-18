//
//  EntryExam.swift
//  skills-ios
//
//  Entry Exam models for skills assessment
//

import Foundation

// MARK: - Exam Question Model

struct ExamQuestion: Codable, Identifiable {
    let id: UUID
    var questionText: String
    var optionA: String
    var optionB: String
    var optionC: String
    var optionD: String
    var correctAnswer: String
    var explanation: String?
    var difficulty: ExamDifficulty
    var mediaType: String?
    var mediaUrl: String?
    var orderIndex: Int
    var isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case questionText = "question_text"
        case optionA = "option_a"
        case optionB = "option_b"
        case optionC = "option_c"
        case optionD = "option_d"
        case correctAnswer = "correct_answer"
        case explanation
        case difficulty
        case mediaType = "media_type"
        case mediaUrl = "media_url"
        case orderIndex = "order_index"
        case isActive = "is_active"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum ExamDifficulty: String, Codable {
    case beginner
    case intermediate
    case advanced
    
    var displayName: String {
        switch self {
        case .beginner: return "Beginner"
        case .intermediate: return "Intermediate"
        case .advanced: return "Advanced"
        }
    }
    
    var xpValue: Int {
        switch self {
        case .beginner: return 10
        case .intermediate: return 25
        case .advanced: return 50
        }
    }
}

// MARK: - Exam Result Model

struct EntryExamResult: Codable, Identifiable {
    let id: UUID
    var userId: UUID
    var completedAt: Date
    
    // Score breakdown
    var beginnerCorrect: Int
    var beginnerTotal: Int
    var intermediateCorrect: Int
    var intermediateTotal: Int
    var advancedCorrect: Int
    var advancedTotal: Int
    
    // Overall stats
    var totalCorrect: Int
    var totalQuestions: Int
    var percentage: Int
    
    // Rewards
    var startingLevel: Int
    var startingXp: Int
    
    var timeSpent: Int
    var questionResponses: [[String: Any]]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case completedAt = "completed_at"
        case beginnerCorrect = "beginner_correct"
        case beginnerTotal = "beginner_total"
        case intermediateCorrect = "intermediate_correct"
        case intermediateTotal = "intermediate_total"
        case advancedCorrect = "advanced_correct"
        case advancedTotal = "advanced_total"
        case totalCorrect = "total_correct"
        case totalQuestions = "total_questions"
        case percentage
        case startingLevel = "starting_level"
        case startingXp = "starting_xp"
        case timeSpent = "time_spent"
        case questionResponses = "question_responses"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        userId = try container.decode(UUID.self, forKey: .userId)
        completedAt = try container.decode(Date.self, forKey: .completedAt)
        beginnerCorrect = try container.decode(Int.self, forKey: .beginnerCorrect)
        beginnerTotal = try container.decode(Int.self, forKey: .beginnerTotal)
        intermediateCorrect = try container.decode(Int.self, forKey: .intermediateCorrect)
        intermediateTotal = try container.decode(Int.self, forKey: .intermediateTotal)
        advancedCorrect = try container.decode(Int.self, forKey: .advancedCorrect)
        advancedTotal = try container.decode(Int.self, forKey: .advancedTotal)
        totalCorrect = try container.decode(Int.self, forKey: .totalCorrect)
        totalQuestions = try container.decode(Int.self, forKey: .totalQuestions)
        percentage = try container.decode(Int.self, forKey: .percentage)
        startingLevel = try container.decode(Int.self, forKey: .startingLevel)
        startingXp = try container.decode(Int.self, forKey: .startingXp)
        timeSpent = try container.decode(Int.self, forKey: .timeSpent)
        questionResponses = nil // Skip decoding JSONB
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(userId, forKey: .userId)
        try container.encode(completedAt, forKey: .completedAt)
        try container.encode(beginnerCorrect, forKey: .beginnerCorrect)
        try container.encode(beginnerTotal, forKey: .beginnerTotal)
        try container.encode(intermediateCorrect, forKey: .intermediateCorrect)
        try container.encode(intermediateTotal, forKey: .intermediateTotal)
        try container.encode(advancedCorrect, forKey: .advancedCorrect)
        try container.encode(advancedTotal, forKey: .advancedTotal)
        try container.encode(totalCorrect, forKey: .totalCorrect)
        try container.encode(totalQuestions, forKey: .totalQuestions)
        try container.encode(percentage, forKey: .percentage)
        try container.encode(startingLevel, forKey: .startingLevel)
        try container.encode(startingXp, forKey: .startingXp)
        try container.encode(timeSpent, forKey: .timeSpent)
    }
}

// MARK: - User Answer Record

struct ExamAnswerRecord {
    let questionId: UUID
    let difficulty: ExamDifficulty
    let answer: String
    let isCorrect: Bool
}
