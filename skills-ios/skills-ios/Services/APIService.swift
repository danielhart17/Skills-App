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
        // XP is automatically added via database trigger when passed=true
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
        
        // Columns must match prod: shots_data (not shots), no missed_shots column.
        struct SessionData: Encodable {
            let user_id: String
            let date: String
            let total_shots: Int
            let made_shots: Int
            let shooting_percentage: Double
            let duration_seconds: Int
            let shots_data: [Shot]
        }

        let session = SessionData(
            user_id: userId.uuidString,
            date: ISO8601DateFormatter().string(from: Date()),
            total_shots: totalShots,
            made_shots: madeShots,
            shooting_percentage: totalShots > 0 ? Double(madeShots) / Double(totalShots) * 100 : 0,
            duration_seconds: durationSeconds,
            shots_data: shots
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
            order: "date.desc"
            // Removed limit to show all sessions
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
    
    // MARK: - Entry Exam
    
    func fetchExamQuestions() async throws -> [ExamQuestion] {
        return try await supabase.select(
            from: "exam_questions",
            columns: "*",
            filter: "is_active=eq.true",
            order: "difficulty.asc,order_index.asc"
        )
    }
    
    func hasCompletedEntryExam() async throws -> Bool {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        struct ExamCheck: Decodable {
            let id: UUID
        }
        
        let results: [ExamCheck] = try await supabase.select(
            from: "entry_exam_results",
            columns: "id",
            filter: "user_id=eq.\(userId.uuidString)"
        )
        
        return !results.isEmpty
    }
    
    func submitEntryExamResult(
        beginnerCorrect: Int,
        intermediateCorrect: Int,
        advancedCorrect: Int,
        totalCorrect: Int,
        percentage: Int,
        startingXP: Int,
        startingLevel: Int,
        timeSpent: Int
    ) async throws {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        
        struct ExamResultData: Encodable {
            let user_id: String
            let beginner_correct: Int
            let beginner_total: Int
            let intermediate_correct: Int
            let intermediate_total: Int
            let advanced_correct: Int
            let advanced_total: Int
            let total_correct: Int
            let total_questions: Int
            let percentage: Int
            let starting_level: Int
            let starting_xp: Int
            let time_spent: Int
        }
        
        let result = ExamResultData(
            user_id: userId.uuidString,
            beginner_correct: beginnerCorrect,
            beginner_total: 4,
            intermediate_correct: intermediateCorrect,
            intermediate_total: 4,
            advanced_correct: advancedCorrect,
            advanced_total: 4,
            total_correct: totalCorrect,
            total_questions: 12,
            percentage: percentage,
            starting_level: startingLevel,
            starting_xp: startingXP,
            time_spent: timeSpent
        )
        
        try await supabase.insert(into: "entry_exam_results", values: result)
        
        // Update user profile with starting XP and level
        struct ProfileUpdate: Encodable {
            let total_xp: Int
            let current_level: Int
            let entry_exam_completed: Bool
        }
        
        let profileUpdate = ProfileUpdate(
            total_xp: startingXP,
            current_level: startingLevel,
            entry_exam_completed: true
        )
        
        try await supabase.update(
            table: "profiles",
            values: profileUpdate,
            filter: "id=eq.\(userId.uuidString)"
        )
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

// MARK: - Profile Update Extension

extension APIService {
    func updateProfile(userId: UUID, fullName: String, favoritePosition: String?, avatarUrl: String?) async throws {
        struct ProfileUpdate: Encodable {
            let full_name: String
            let favorite_position: String?
            let avatar_url: String?
            let updated_at: String
        }
        
        let update = ProfileUpdate(
            full_name: fullName,
            favorite_position: favoritePosition,
            avatar_url: avatarUrl,
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        
        try await supabase.update(
            table: "profiles",
            values: update,
            filter: "id=eq.\(userId.uuidString)"
        )
    }
}

// MARK: - Messaging
// All ids are auth.users ids (AuthService.currentUser.id) — never User.trainerId.

extension APIService {
    func fetchActiveConnections(userId: UUID, isTrainer: Bool) async throws -> [TrainerAthleteConnection] {
        let column = isTrainer ? "trainer_id" : "athlete_id"
        return try await supabase.select(
            from: "trainer_athlete_connections",
            filter: "\(column)=eq.\(userId.uuidString)&status=eq.active"
        )
    }

    func fetchProfiles(ids: [UUID]) async throws -> [PublicProfile] {
        guard !ids.isEmpty else { return [] }
        let list = ids.map(\.uuidString).joined(separator: ",")
        return try await supabase.select(
            from: "profiles",
            columns: "id,full_name,avatar_url",
            filter: "id=in.(\(list))"
        )
    }

    func getOrCreateConversation(trainerId: UUID, athleteId: UUID) async throws -> Conversation {
        let filter = "trainer_id=eq.\(trainerId.uuidString)&athlete_id=eq.\(athleteId.uuidString)"
        let existing: [Conversation] = try await supabase.select(from: "conversations", filter: filter)
        if let conversation = existing.first { return conversation }

        struct NewConversation: Encodable {
            let trainer_id: UUID
            let athlete_id: UUID
        }
        do {
            return try await supabase.insertReturning(
                into: "conversations",
                values: NewConversation(trainer_id: trainerId, athlete_id: athleteId)
            )
        } catch {
            // Unique race: someone else created it between select and insert.
            let retry: [Conversation] = try await supabase.select(from: "conversations", filter: filter)
            guard let conversation = retry.first else { throw error }
            return conversation
        }
    }

    func fetchMessages(conversationId: UUID) async throws -> [Message] {
        try await supabase.select(
            from: "messages",
            filter: "conversation_id=eq.\(conversationId.uuidString)",
            order: "created_at.asc"
        )
    }

    func fetchAttachments(messageIds: [UUID]) async throws -> [MessageAttachment] {
        guard !messageIds.isEmpty else { return [] }
        let list = messageIds.map(\.uuidString).joined(separator: ",")
        return try await supabase.select(
            from: "message_attachments",
            filter: "message_id=in.(\(list))"
        )
    }

    func sendMessage(
        conversationId: UUID,
        senderId: UUID,
        receiverId: UUID,
        body: String?,
        messageType: String = "text",
        workoutPayload: WorkoutPayload? = nil,
        attachments: [NewAttachment] = []
    ) async throws -> Message {
        struct NewMessage: Encodable {
            let conversation_id: UUID
            let sender_id: UUID
            let receiver_id: UUID
            let body: String?
            let message_type: String
            let workout_payload: WorkoutPayload?
        }

        let resolvedType = attachments.isEmpty ? messageType : "media"
        let message: Message = try await supabase.insertReturning(
            into: "messages",
            values: NewMessage(
                conversation_id: conversationId,
                sender_id: senderId,
                receiver_id: receiverId,
                body: body,
                message_type: resolvedType,
                workout_payload: workoutPayload
            )
        )

        for attachment in attachments {
            struct NewAttachmentRow: Encodable {
                let message_id: UUID
                let file_url: String
                let file_type: String
                let file_name: String
                let file_size_bytes: Int
            }
            try await supabase.insert(into: "message_attachments", values: NewAttachmentRow(
                message_id: message.id,
                file_url: attachment.fileUrl,
                file_type: attachment.fileType,
                file_name: attachment.fileName,
                file_size_bytes: attachment.fileSizeBytes
            ))
        }

        struct Bump: Encodable { let last_message_at: String }
        try await supabase.update(
            table: "conversations",
            values: Bump(last_message_at: ISO8601DateFormatter().string(from: Date())),
            filter: "id=eq.\(conversationId.uuidString)"
        )

        return message
    }

    func markConversationRead(conversationId: UUID, receiverId: UUID) async throws {
        struct ReadUpdate: Encodable { let read_at: String }
        try await supabase.update(
            table: "messages",
            values: ReadUpdate(read_at: ISO8601DateFormatter().string(from: Date())),
            filter: "conversation_id=eq.\(conversationId.uuidString)&receiver_id=eq.\(receiverId.uuidString)&read_at=is.null"
        )
    }

    /// Unread message rows (id + conversation) — total and per-conversation counts derive client-side.
    struct UnreadMessageRow: Decodable {
        let id: UUID
        let conversationId: UUID
        enum CodingKeys: String, CodingKey {
            case id
            case conversationId = "conversation_id"
        }
    }

    func fetchUnreadMessages(receiverId: UUID) async throws -> [UnreadMessageRow] {
        try await supabase.select(
            from: "messages",
            columns: "id,conversation_id",
            filter: "receiver_id=eq.\(receiverId.uuidString)&read_at=is.null"
        )
    }

    func uploadMessageMedia(data: Data, senderId: UUID, fileName: String, isVideo: Bool) async throws -> NewAttachment {
        let safeName = fileName.replacingOccurrences(of: "[^a-zA-Z0-9._-]", with: "_", options: .regularExpression)
        let path = "\(senderId.uuidString)/\(UUID().uuidString)-\(safeName)"
        try await supabase.uploadFile(
            bucket: "message-media",
            path: path,
            data: data,
            contentType: isVideo ? "video/mp4" : "image/jpeg"
        )
        return NewAttachment(
            fileUrl: path,
            fileType: isVideo ? "video" : "image",
            fileName: safeName,
            fileSizeBytes: data.count
        )
    }

    /// Mirrors web addWorkoutToCalendar: workout message → athlete_events row.
    func addWorkoutToCalendar(athleteId: UUID, payload: WorkoutPayload) async throws {
        let drillsText = (payload.drills ?? []).enumerated().map { index, drill in
            "\(index + 1). \(drill.name) — \(drill.sets ?? "")\(drill.notes.map { " (\($0))" } ?? "")"
        }.joined(separator: "\n")

        let notes = [
            payload.trainerNotes,
            payload.intensity.map { "Intensity: \($0)" },
            "Drills:",
            drillsText
        ].compactMap { $0 }.joined(separator: "\n")

        struct NewEvent: Encodable {
            let athlete_id: UUID
            let title: String
            let event_type: String
            let event_date: String
            let start_time: String?
            let notes: String
        }
        try await supabase.insert(into: "athlete_events", values: NewEvent(
            athlete_id: athleteId,
            title: payload.title,
            event_type: "workout",
            event_date: payload.scheduledDate ?? DateFormatter.yyyyMMdd.string(from: Date()),
            start_time: payload.scheduledTime,
            notes: notes
        ))
    }
}

extension DateFormatter {
    /// Device-local yyyy-MM-dd, matching web behavior for event/check-in dates.
    static let yyyyMMdd: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

// MARK: - Athlete Schedule

extension APIService {
    func fetchAthleteEvents(athleteId: UUID, from startDate: String, to endDate: String) async throws -> [AthleteEvent] {
        try await supabase.select(
            from: "athlete_events",
            filter: "athlete_id=eq.\(athleteId.uuidString)&event_date=gte.\(startDate)&event_date=lte.\(endDate)",
            order: "event_date.asc,start_time.asc"
        )
    }

    func createAthleteEvent(
        athleteId: UUID,
        title: String,
        eventType: AthleteEvent.EventType,
        eventDate: String,
        startTime: String?,
        opponent: String?,
        location: String?,
        notes: String?
    ) async throws {
        struct NewEvent: Encodable {
            let athlete_id: UUID
            let title: String
            let event_type: String
            let event_date: String
            let start_time: String?
            let opponent: String?
            let location: String?
            let notes: String?
        }
        try await supabase.insert(into: "athlete_events", values: NewEvent(
            athlete_id: athleteId,
            title: title,
            event_type: eventType.rawValue,
            event_date: eventDate,
            start_time: startTime,
            opponent: opponent,
            location: location,
            notes: notes
        ))
    }

    func rescheduleAthleteEvent(id: UUID, athleteId: UUID, eventDate: String, startTime: String?) async throws {
        struct Reschedule: Encodable {
            let event_date: String
            let start_time: String?
        }
        try await supabase.update(
            table: "athlete_events",
            values: Reschedule(event_date: eventDate, start_time: startTime),
            filter: "id=eq.\(id.uuidString)&athlete_id=eq.\(athleteId.uuidString)"
        )
    }

    func deleteAthleteEvent(id: UUID, athleteId: UUID) async throws {
        try await supabase.delete(
            from: "athlete_events",
            filter: "id=eq.\(id.uuidString)&athlete_id=eq.\(athleteId.uuidString)"
        )
    }
}

// MARK: - Trainer Sessions

extension APIService {
    struct BookedSlot: Decodable {
        let bookingDatetime: Date
        let durationMinutes: Int
        enum CodingKeys: String, CodingKey {
            case bookingDatetime = "booking_datetime"
            case durationMinutes = "duration_minutes"
        }
    }

    /// Slots already booked for a trainer on a given day (UTC-bucketed server-side, web parity).
    func fetchTrainerBookedSlots(trainerId: UUID, day: String) async throws -> [BookedSlot] {
        try await supabase.rpc(
            function: "get_trainer_booked_slots",
            params: ["p_trainer_id": trainerId.uuidString, "p_day": day]
        )
    }

    func createTrainerService(
        name: String,
        description: String?,
        price: Double,
        durationMinutes: Int,
        sessionDate: String?,
        startTime: String?,
        location: String?,
        skillLevel: String,
        isRecurring: Bool,
        recurrenceDays: [String]
    ) async throws -> TrainerService {
        try await supabase.rpc(function: "create_trainer_service", params: [
            "p_name": name,
            "p_description": description as Any,
            "p_price": price,
            "p_duration_minutes": durationMinutes,
            "p_session_date": sessionDate as Any,
            "p_start_time": startTime as Any,
            "p_location": location as Any,
            "p_skill_level": skillLevel,
            "p_is_recurring": isRecurring,
            "p_recurrence_days": recurrenceDays
        ])
    }

    func updateTrainerService(
        id: UUID,
        name: String,
        description: String?,
        price: Double,
        durationMinutes: Int,
        sessionDate: String?,
        startTime: String?,
        location: String?,
        skillLevel: String,
        isRecurring: Bool,
        recurrenceDays: [String]
    ) async throws -> TrainerService {
        try await supabase.rpc(function: "update_trainer_service", params: [
            "p_id": id.uuidString,
            "p_name": name,
            "p_description": description as Any,
            "p_price": price,
            "p_duration_minutes": durationMinutes,
            "p_session_date": sessionDate as Any,
            "p_start_time": startTime as Any,
            "p_location": location as Any,
            "p_skill_level": skillLevel,
            "p_is_recurring": isRecurring,
            "p_recurrence_days": recurrenceDays
        ])
    }
}

// MARK: - Follows & Notifications
// trainer ids here are AUTH user ids (trainers.user_id), matching web followService.

extension APIService {
    func isFollowingTrainer(trainerUserId: UUID) async throws -> Bool {
        guard let me = AuthService.shared.currentUser?.id else { return false }
        let rows: [TrainerAthleteConnection] = try await supabase.select(
            from: "trainer_athlete_connections",
            filter: "trainer_id=eq.\(trainerUserId.uuidString)&athlete_id=eq.\(me.uuidString)&status=eq.active"
        )
        return !rows.isEmpty
    }

    @discardableResult
    func followTrainer(trainerUserId: UUID) async throws -> TrainerAthleteConnection {
        try await supabase.rpc(
            function: "follow_trainer",
            params: ["p_trainer_user_id": trainerUserId.uuidString]
        )
    }

    @discardableResult
    func unfollowTrainer(trainerUserId: UUID) async throws -> Bool {
        try await supabase.rpc(
            function: "unfollow_trainer",
            params: ["p_trainer_user_id": trainerUserId.uuidString]
        )
    }

    func fetchNotifications() async throws -> [AppNotification] {
        guard let me = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        return try await supabase.select(
            from: "notifications",
            filter: "user_id=eq.\(me.uuidString)",
            order: "created_at.desc",
            limit: 50
        )
    }

    func markNotificationRead(id: UUID) async throws {
        struct ReadUpdate: Encodable { let read_at: String }
        try await supabase.update(
            table: "notifications",
            values: ReadUpdate(read_at: ISO8601DateFormatter().string(from: Date())),
            filter: "id=eq.\(id.uuidString)"
        )
    }

    /// Bookings for the signed-in athlete within a datetime range (for schedule display).
    func fetchUserBookings(fromISO: String, toISO: String) async throws -> [Booking] {
        guard let me = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        return try await supabase.select(
            from: "bookings",
            filter: "user_id=eq.\(me.uuidString)&status=neq.cancelled&booking_datetime=gte.\(fromISO)&booking_datetime=lte.\(toISO)",
            order: "booking_datetime.asc"
        )
    }
}

// MARK: - Parent / Child linking

extension APIService {
    func fetchLinkedChildren() async throws -> [LinkedChild] {
        try await supabase.rpc(function: "get_linked_children")
    }

    /// Redeems an athlete's invite code. Server rejects non-parent roles and
    /// bad/expired codes with a message worth showing verbatim.
    @discardableResult
    func linkChild(code: String) async throws -> [LinkedChild] {
        let normalized = code.uppercased().filter { $0.isLetter || $0.isNumber }
        return try await supabase.rpc(
            function: "link_child_invite_code",
            params: ["p_code": normalized]
        )
    }

    func fetchChildProgress(childId: UUID) async throws -> ChildProgressSummary? {
        let rows: [ChildProgressSummary] = try await supabase.rpc(
            function: "get_child_progress_summary",
            params: ["p_child_id": childId.uuidString]
        )
        return rows.first
    }

    /// Athlete-side: mint a short-lived code to hand to a parent.
    func createChildInviteCode() async throws -> ChildInviteCode {
        guard let userId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        let alphabet = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        let expiresAt = Date().addingTimeInterval(15 * 60)

        struct NewCode: Encodable {
            let child_id: UUID
            let code: String
            let expires_at: String
        }

        // Codes are random and unique-constrained; retry on collision.
        var lastError: Error?
        for _ in 0..<5 {
            let code = String((0..<6).map { _ in alphabet.randomElement()! })
            do {
                try await supabase.insert(into: "child_invite_codes", values: NewCode(
                    child_id: userId,
                    code: code,
                    expires_at: ISO8601DateFormatter().string(from: expiresAt)
                ))
                return ChildInviteCode(code: code, expiresAt: expiresAt)
            } catch {
                lastError = error
            }
        }
        throw lastError ?? APIError.invalidData
    }
}

// MARK: - Parent game stats

extension APIService {
    func fetchGameStats(childId: UUID) async throws -> [PlayerGameStat] {
        try await supabase.select(
            from: "player_game_stats",
            filter: "child_id=eq.\(childId.uuidString)",
            order: "game_date.desc"
        )
    }

    func logGameStat(
        childId: UUID,
        gameDate: String,
        opponent: String?,
        points: Int, rebounds: Int, assists: Int,
        steals: Int, blocks: Int, turnovers: Int,
        minutesPlayed: Int,
        fgMade: Int, fgAttempted: Int,
        threeMade: Int, threeAttempted: Int,
        ftMade: Int, ftAttempted: Int,
        notes: String?
    ) async throws {
        guard let parentId = AuthService.shared.currentUser?.id else {
            throw APIError.notAuthenticated
        }
        struct NewGameStat: Encodable {
            let parent_id: UUID
            let child_id: UUID
            let game_date: String
            let opponent: String?
            let points: Int
            let rebounds: Int
            let assists: Int
            let steals: Int
            let blocks: Int
            let turnovers: Int
            let minutes_played: Int
            let fg_made: Int
            let fg_attempted: Int
            let three_made: Int
            let three_attempted: Int
            let ft_made: Int
            let ft_attempted: Int
            let notes: String?
        }
        try await supabase.insert(into: "player_game_stats", values: NewGameStat(
            parent_id: parentId,
            child_id: childId,
            game_date: gameDate,
            opponent: opponent,
            points: points, rebounds: rebounds, assists: assists,
            steals: steals, blocks: blocks, turnovers: turnovers,
            minutes_played: minutesPlayed,
            fg_made: fgMade, fg_attempted: fgAttempted,
            three_made: threeMade, three_attempted: threeAttempted,
            ft_made: ftMade, ft_attempted: ftAttempted,
            notes: notes
        ))
    }

    func deleteGameStat(id: UUID) async throws {
        try await supabase.delete(from: "player_game_stats", filter: "id=eq.\(id.uuidString)")
    }
}

// MARK: - Admin

struct BackgroundCheck: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let status: String  // not_started|pending|clear|consider|bypassed|expired|rejected
    let bypassReason: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case status
        case bypassReason = "bypass_reason"
    }

    /// Matches is_trainer_discoverable(): only these make a trainer public.
    var grantsDiscoverability: Bool {
        status == "clear" || status == "bypassed"
    }
}

extension APIService {
    func fetchAllProfiles() async throws -> [PublicProfileWithRole] {
        try await supabase.select(
            from: "profiles",
            columns: "id,full_name,email,role",
            order: "full_name.asc"
        )
    }

    func fetchBackgroundChecks() async throws -> [BackgroundCheck] {
        try await supabase.select(from: "background_checks", columns: "id,user_id,status,bypass_reason")
    }

    /// Admin-only RPC; the DB verifies the caller's role.
    @discardableResult
    func approveTrainer(userId: UUID, reason: String) async throws -> BackgroundCheck {
        try await supabase.rpc(
            function: "admin_bypass_background_check",
            params: ["target_user_id": userId.uuidString, "reason": reason]
        )
    }
}

struct PublicProfileWithRole: Codable, Identifiable {
    let id: UUID
    let fullName: String?
    let email: String?
    let role: String

    var displayName: String { fullName?.isEmpty == false ? fullName! : (email ?? "User") }

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case email
        case role
    }
}
