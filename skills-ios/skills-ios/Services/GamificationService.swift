//
//  GamificationService.swift
//  skills-ios
//
//  1:1 port of the web streakEngine.js — keep function names and rules aligned.
//  All ids are auth.users ids.
//

import Foundation

final class GamificationService {
    static let shared = GamificationService()
    private let supabase = SupabaseClient.shared
    private init() {}

    enum XP {
        static let morningConfirm = 25
        static let energyRating = 50
        static let perfectWeek = 200
        static let achievement = 75
    }

    static let badgeNames: [String: String] = [
        "first_checkin": "First Check-In",
        "week_warrior": "Week Warrior",
        "perfect_week": "Perfect Week",
        "first_game": "First Game Logged",
        "ten_practices": "10 Practices In",
        "all_star_level": "All-Star",
        "elite_level": "Elite",
    ]

    static func levelFromXP(_ totalXp: Int) -> String {
        if totalXp >= 1000 { return "Elite" }
        if totalXp >= 500 { return "All-Star" }
        if totalXp >= 200 { return "Starter" }
        return "Rookie"
    }

    static func xpProgress(_ totalXp: Int) -> (level: String, floor: Int, ceiling: Int, fraction: Double) {
        let level = levelFromXP(totalXp)
        let floor: Int, ceiling: Int
        switch level {
        case "Rookie": (floor, ceiling) = (0, 200)
        case "Starter": (floor, ceiling) = (200, 500)
        case "All-Star": (floor, ceiling) = (500, 1000)
        default: (floor, ceiling) = (1000, max(totalXp, 1000))
        }
        let span = max(ceiling - floor, 1)
        let fraction = min(1.0, max(0.0, Double(totalXp - floor) / Double(span)))
        return (level, floor, ceiling, fraction)
    }

    static func todayKey() -> String {
        DateFormatter.yyyyMMdd.string(from: Date())
    }

    // MARK: - Streak row

    func ensureStreakRow(athleteId: UUID) async throws -> AthleteStreak {
        let filter = "athlete_id=eq.\(athleteId.uuidString)"
        let existing: [AthleteStreak] = try await supabase.select(from: "athlete_streaks", filter: filter)
        if let row = existing.first { return row }

        struct NewRow: Encodable { let athlete_id: UUID }
        do {
            return try await supabase.insertReturning(into: "athlete_streaks", values: NewRow(athlete_id: athleteId))
        } catch {
            // Unique race — re-select.
            let retry: [AthleteStreak] = try await supabase.select(from: "athlete_streaks", filter: filter)
            guard let row = retry.first else { throw error }
            return row
        }
    }

    @discardableResult
    func updateStreak(athleteId: UUID) async throws -> AthleteStreak {
        var row = try await ensureStreakRow(athleteId: athleteId)
        let today = Self.todayKey()
        if row.lastCheckinDate == today { return row }

        var current = row.currentStreak
        if let last = row.lastCheckinDate,
           let lastDate = DateFormatter.yyyyMMdd.date(from: last),
           let todayDate = DateFormatter.yyyyMMdd.date(from: today) {
            let diff = Calendar.current.dateComponents(
                [.day],
                from: Calendar.current.startOfDay(for: lastDate),
                to: Calendar.current.startOfDay(for: todayDate)
            ).day ?? 0
            if diff == 1 {
                current += 1
            } else if diff > 1 {
                current = 1
            }
        } else {
            current = 1
        }
        let longest = max(current, row.longestStreak)

        struct StreakUpdate: Encodable {
            let current_streak: Int
            let longest_streak: Int
            let last_checkin_date: String
            let updated_at: String
        }
        try await supabase.update(
            table: "athlete_streaks",
            values: StreakUpdate(
                current_streak: current,
                longest_streak: longest,
                last_checkin_date: today,
                updated_at: ISO8601DateFormatter().string(from: Date())
            ),
            filter: "athlete_id=eq.\(athleteId.uuidString)"
        )
        row.currentStreak = current
        row.longestStreak = longest
        row.lastCheckinDate = today
        return row
    }

    @discardableResult
    func awardXP(athleteId: UUID, amount: Int) async throws -> AthleteStreak {
        var row = try await ensureStreakRow(athleteId: athleteId)
        let totalXp = row.totalXp + amount
        let level = Self.levelFromXP(totalXp)

        struct XPUpdate: Encodable {
            let total_xp: Int
            let level: String
            let updated_at: String
        }
        try await supabase.update(
            table: "athlete_streaks",
            values: XPUpdate(total_xp: totalXp, level: level, updated_at: ISO8601DateFormatter().string(from: Date())),
            filter: "athlete_id=eq.\(athleteId.uuidString)"
        )
        row.totalXp = totalXp
        row.level = level
        return row
    }

    // MARK: - Achievements

    func checkAchievements(athleteId: UUID) async throws -> [(id: String, name: String)] {
        let earned: [AthleteAchievement] = try await supabase.select(
            from: "athlete_achievements",
            filter: "athlete_id=eq.\(athleteId.uuidString)"
        )
        var earnedIds = Set(earned.map(\.badgeId))
        let streak = try await ensureStreakRow(athleteId: athleteId)

        struct IdRow: Decodable { let id: UUID }
        let confirmed: [IdRow] = try await supabase.select(
            from: "daily_checkins",
            columns: "id",
            filter: "athlete_id=eq.\(athleteId.uuidString)&status=eq.confirmed"
        )
        let games: [IdRow] = try await supabase.select(
            from: "athlete_events",
            columns: "id",
            filter: "athlete_id=eq.\(athleteId.uuidString)&event_type=eq.game"
        )
        let practices: [IdRow] = try await supabase.select(
            from: "athlete_events",
            columns: "id",
            filter: "athlete_id=eq.\(athleteId.uuidString)&event_type=eq.practice"
        )

        struct WeekCheckin: Decodable {
            let checkInDate: String
            let status: String
            enum CodingKeys: String, CodingKey {
                case checkInDate = "check_in_date"
                case status
            }
        }
        let last7Keys: [String] = (0..<7).compactMap { offset in
            Calendar.current.date(byAdding: .day, value: -offset, to: Date()).map {
                DateFormatter.yyyyMMdd.string(from: $0)
            }
        }
        let weekCheckins: [WeekCheckin] = try await supabase.select(
            from: "daily_checkins",
            columns: "check_in_date,status",
            filter: "athlete_id=eq.\(athleteId.uuidString)&check_in_date=gte.\(last7Keys.last ?? Self.todayKey())"
        )
        let confirmedDates = Set(weekCheckins.filter { $0.status == "confirmed" }.map(\.checkInDate))
        let perfectWeek = last7Keys.allSatisfy(confirmedDates.contains) && confirmedDates.count >= 7

        let checks: [(id: String, met: Bool)] = [
            ("first_checkin", confirmed.count >= 1),
            ("week_warrior", streak.currentStreak >= 7),
            ("perfect_week", perfectWeek),
            ("first_game", games.count >= 1),
            ("ten_practices", practices.count >= 10),
            ("all_star_level", streak.level == "All-Star"),
            ("elite_level", streak.level == "Elite"),
        ]

        var newlyEarned: [(id: String, name: String)] = []
        for check in checks where check.met && !earnedIds.contains(check.id) {
            let name = Self.badgeNames[check.id] ?? check.id
            struct NewBadge: Encodable {
                let athlete_id: UUID
                let badge_id: String
                let badge_name: String
            }
            // Unique violation just means another device won the race — ignore.
            try? await supabase.insert(into: "athlete_achievements", values: NewBadge(
                athlete_id: athleteId, badge_id: check.id, badge_name: name
            ))
            newlyEarned.append((check.id, name))
            earnedIds.insert(check.id)
        }
        return newlyEarned
    }

    /// Web order: streak → XP → badges (+75 each, perfect_week +200 extra).
    @discardableResult
    func processAction(athleteId: UUID, xpAmount: Int, updateStreakFlag: Bool) async throws -> AthleteStreak {
        if updateStreakFlag {
            try await updateStreak(athleteId: athleteId)
        }
        if xpAmount > 0 {
            try await awardXP(athleteId: athleteId, amount: xpAmount)
        }
        let newBadges = try await checkAchievements(athleteId: athleteId)
        for badge in newBadges {
            try await awardXP(athleteId: athleteId, amount: XP.achievement)
            if badge.id == "perfect_week" {
                try await awardXP(athleteId: athleteId, amount: XP.perfectWeek)
            }
        }
        return try await ensureStreakRow(athleteId: athleteId)
    }

    // MARK: - Check-ins

    func fetchCheckins(athleteId: UUID, date: String) async throws -> [DailyCheckin] {
        try await supabase.select(
            from: "daily_checkins",
            filter: "athlete_id=eq.\(athleteId.uuidString)&check_in_date=eq.\(date)"
        )
    }

    func insertCheckin(athleteId: UUID, eventId: UUID?, status: String, note: String? = nil) async throws {
        struct NewCheckin: Encodable {
            let athlete_id: UUID
            let event_id: UUID?
            let check_in_date: String
            let status: String
            let note: String?
        }
        try await supabase.insert(into: "daily_checkins", values: NewCheckin(
            athlete_id: athleteId,
            event_id: eventId,
            check_in_date: Self.todayKey(),
            status: status,
            note: note
        ))
    }

    func setEnergyRating(checkinId: UUID, athleteId: UUID, rating: Int) async throws {
        struct RatingUpdate: Encodable { let energy_rating: Int }
        // energy_rating=is.null: server-side double-award guard (web only guards client-side)
        try await supabase.update(
            table: "daily_checkins",
            values: RatingUpdate(energy_rating: rating),
            filter: "id=eq.\(checkinId.uuidString)&athlete_id=eq.\(athleteId.uuidString)&energy_rating=is.null"
        )
    }

}

#if DEBUG
/// Smallest check that fails if the ported math breaks.
enum GamificationSelfCheck {
    static func run() {
        assert(GamificationService.levelFromXP(0) == "Rookie")
        assert(GamificationService.levelFromXP(199) == "Rookie")
        assert(GamificationService.levelFromXP(200) == "Starter")
        assert(GamificationService.levelFromXP(499) == "Starter")
        assert(GamificationService.levelFromXP(500) == "All-Star")
        assert(GamificationService.levelFromXP(999) == "All-Star")
        assert(GamificationService.levelFromXP(1000) == "Elite")
        let progress = GamificationService.xpProgress(300)
        assert(progress.level == "Starter" && progress.floor == 200 && progress.ceiling == 500)
        assert(abs(progress.fraction - 1.0 / 3.0) < 0.001)
    }
}
#endif
