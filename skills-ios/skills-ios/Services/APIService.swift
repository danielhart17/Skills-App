//
//  APIService.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

class APIService {
    static let shared = APIService()
    private let supabase = SupabaseClient.shared
    
    private init() {}
    
    // MARK: - Lessons
    
    func fetchLessons(mode: LessonMode? = nil) async throws -> [Lesson] {
        var filter: String? = nil
        if let mode = mode {
            filter = "mode=eq.\(mode.rawValue)&is_active=eq.true"
        } else {
            filter = "is_active=eq.true"
        }
        
        return try await supabase.select(
            from: "lessons",
            columns: "*",
            filter: filter,
            order: "chapter.asc,order_index.asc"
        )
    }
    
    func fetchLesson(id: UUID) async throws -> Lesson {
        let lessons: [Lesson] = try await supabase.select(
            from: "lessons",
            columns: "*",
            filter: "id=eq.\(id.uuidString)"
        )
        guard let lesson = lessons.first else {
            throw APIError.notFound
        }
        return lesson
    }
    
    // MARK: - Questions
    
    func fetchQuestions(lessonId: UUID) async throws -> [Question] {
        return try await supabase.select(
            from: "questions",
            columns: "*",
            filter: "lesson_id=eq.\(lessonId.uuidString)",
            order: "order_index.asc"
        )
    }
    
    func submitLessonAttempt(lessonId: UUID, totalQuestions: Int, correctAnswers: Int) async throws {
        let percentage = Decimal(correctAnswers) / Decimal(totalQuestions) * 100
        let passed = percentage >= 80
        
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        struct AttemptData: Encodable {
            let user_id: String
            let lesson_id: String
            let total_questions: Int
            let correct_answers: Int
            let percentage: Double
            let passed: Bool
        }
        
        let attempt = AttemptData(
            user_id: userId.uuidString,
            lesson_id: lessonId.uuidString,
            total_questions: totalQuestions,
            correct_answers: correctAnswers,
            percentage: NSDecimalNumber(decimal: percentage).doubleValue,
            passed: passed
        )
        
        try await supabase.insert(into: "user_lesson_attempts", values: attempt)
    }
    
    // MARK: - Challenges
    
    func fetchChallenges() async throws -> [Challenge] {
        return try await supabase.select(
            from: "challenges",
            columns: "*",
            order: "is_featured.desc,created_at.desc"
        )
    }
    
    func fetchTrainerChallenges(trainerId: UUID) async throws -> [Challenge] {
        return try await supabase.select(
            from: "challenges",
            columns: "*",
            filter: "created_by=eq.\(trainerId.uuidString)",
            order: "created_at.desc"
        )
    }
    
    func fetchChallenge(id: UUID) async throws -> Challenge {
        let challenges: [Challenge] = try await supabase.select(
            from: "challenges",
            columns: "*",
            filter: "id=eq.\(id.uuidString)"
        )
        guard let challenge = challenges.first else {
            throw APIError.notFound
        }
        return challenge
    }
    
    // MARK: - Drills
    
    func fetchDrills() async throws -> [Drill] {
        return try await supabase.select(
            from: "drills",
            columns: "*",
            filter: "is_active=eq.true",
            order: "created_at.desc"
        )
    }
    
    func fetchDrill(id: UUID) async throws -> Drill {
        let drills: [Drill] = try await supabase.select(
            from: "drills",
            columns: "*",
            filter: "id=eq.\(id.uuidString)"
        )
        guard let drill = drills.first else {
            throw APIError.notFound
        }
        return drill
    }
    
    func markDrillComplete(drillId: UUID, timeSpent: Int, notes: String?) async throws {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        struct DrillProgressData: Encodable {
            let user_id: String
            let drill_id: String
            let time_spent_seconds: Int
            let is_completed: Bool
            let completed_at: String
            let notes: String
        }
        
        let progress = DrillProgressData(
            user_id: userId.uuidString,
            drill_id: drillId.uuidString,
            time_spent_seconds: timeSpent,
            is_completed: true,
            completed_at: ISO8601DateFormatter().string(from: Date()),
            notes: notes ?? ""
        )
        
        try await supabase.insert(into: "drill_progress", values: progress)
    }
    
    // MARK: - Trainers
    
    func fetchTrainers() async throws -> [Trainer] {
        return try await supabase.select(
            from: "trainers",
            columns: "*",
            order: "rating.desc"
        )
    }
    
    func fetchTrainer(id: UUID) async throws -> Trainer {
        let trainers: [Trainer] = try await supabase.select(
            from: "trainers",
            columns: "*",
            filter: "id=eq.\(id.uuidString)"
        )
        guard let trainer = trainers.first else {
            throw APIError.notFound
        }
        return trainer
    }
    
    func fetchTrainerServices(trainerId: UUID) async throws -> [TrainerService] {
        return try await supabase.select(
            from: "trainer_services",
            columns: "*",
            filter: "trainer_id=eq.\(trainerId.uuidString)"
        )
    }
    
    // MARK: - Events
    
    func fetchEvents() async throws -> [TrainingEvent] {
        return try await supabase.select(
            from: "training_events",
            columns: "*",
            order: "date.asc"
        )
    }
    
    func fetchEvent(id: UUID) async throws -> TrainingEvent {
        let events: [TrainingEvent] = try await supabase.select(
            from: "training_events",
            columns: "*",
            filter: "id=eq.\(id.uuidString)"
        )
        guard let event = events.first else {
            throw APIError.notFound
        }
        return event
    }
    
    func fetchUserRegistrations() async throws -> [EventRegistration] {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        return try await supabase.select(
            from: "event_registrations",
            columns: "*",
            filter: "user_id=eq.\(userId.uuidString)"
        )
    }
    
    func registerForEvent(eventId: UUID) async throws {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        struct RegistrationData: Encodable {
            let event_id: String
            let user_id: String
            let status: String
        }
        
        let registration = RegistrationData(
            event_id: eventId.uuidString,
            user_id: userId.uuidString,
            status: "confirmed"
        )
        
        try await supabase.insert(into: "event_registrations", values: registration)
    }
    
    // MARK: - Bookings
    
    func createBooking(
        trainerId: UUID,
        userId: UUID,
        serviceId: UUID,
        serviceName: String,
        bookingDatetime: Date,
        durationMinutes: Int,
        totalPrice: Decimal,
        userNotes: String?
    ) async throws {
        struct BookingData: Encodable {
            let user_id: String
            let trainer_id: String
            let service_id: String
            let service_name: String
            let booking_datetime: String
            let duration_minutes: Int
            let total_price: Double
            let user_notes: String?
            let status: String
        }
        
        let booking = BookingData(
            user_id: userId.uuidString,
            trainer_id: trainerId.uuidString,
            service_id: serviceId.uuidString,
            service_name: serviceName,
            booking_datetime: ISO8601DateFormatter().string(from: bookingDatetime),
            duration_minutes: durationMinutes,
            total_price: NSDecimalNumber(decimal: totalPrice).doubleValue,
            user_notes: userNotes,
            status: "confirmed"
        )
        
        try await supabase.insert(into: "bookings", values: booking)
    }
    
    func fetchBookings() async throws -> [Booking] {
        return try await supabase.select(
            from: "bookings",
            columns: "*",
            order: "booking_datetime.desc"
        )
    }
    
    func fetchUserBookings() async throws -> [Booking] {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        return try await supabase.select(
            from: "bookings",
            columns: "*",
            filter: "user_id=eq.\(userId.uuidString)",
            order: "booking_datetime.desc"
        )
    }
    
    // MARK: - Shooting Sessions
    
    func saveShootingSession(totalShots: Int, madeShots: Int, durationSeconds: Int, shots: [Shot]) async throws {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        struct SessionData: Encodable {
            let user_id: String
            let date: String
            let total_shots: Int
            let made_shots: Int
            let missed_shots: Int
            let duration_seconds: Int
            let shots: [Shot]
        }
        
        let session = SessionData(
            user_id: userId.uuidString,
            date: ISO8601DateFormatter().string(from: Date()),
            total_shots: totalShots,
            made_shots: madeShots,
            missed_shots: totalShots - madeShots,
            duration_seconds: durationSeconds,
            shots: shots
        )
        
        try await supabase.insert(into: "shooting_sessions", values: session)
    }
    
    func fetchUserShootingSessions() async throws -> [ShootingSession] {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        return try await supabase.select(
            from: "shooting_sessions",
            columns: "*",
            filter: "user_id=eq.\(userId.uuidString)",
            order: "date.desc",
            limit: 20
        )
    }
    
    // MARK: - Progress
    
    func fetchCompletedLessons() async throws -> [UUID] {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        let attempts: [UserLessonAttempt] = try await supabase.select(
            from: "user_lesson_attempts",
            columns: "*",
            filter: "user_id=eq.\(userId.uuidString)&passed=eq.true"
        )
        
        // Return unique lesson IDs only (remove duplicates)
        return Array(Set(attempts.map { $0.lessonId }))
    }
}

enum APIError: LocalizedError {
    case notFound
    case notAuthenticated
    case invalidData
    
    var errorDescription: String? {
        switch self {
        case .notFound:
            return "Resource not found"
        case .notAuthenticated:
            return "User not authenticated"
        case .invalidData:
            return "Invalid data"
        }
    }
}

