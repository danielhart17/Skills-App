//
//  CheckinSection.swift
//  skills-ios
//
//  Morning check-in, post-event energy rating, stats row.
//  Composed into ScheduleView, which supplies this week's events.
//

import SwiftUI

struct CheckinSection: View {
    let events: [AthleteEvent]
    @Binding var streak: AthleteStreak?
    var onChanged: () -> Void

    @StateObject private var authService = AuthService.shared
    @State private var todayCheckins: [DailyCheckin] = []
    @State private var showMorningSheet = false
    @State private var toastText: String?

    private var athleteId: UUID? { authService.currentUser?.id }

    private var todayEvents: [AthleteEvent] {
        let today = GamificationService.todayKey()
        return events.filter { $0.eventDate == today && $0.eventType != .rest }
    }

    /// Confirmed check-in for a today-event whose start time has passed and has no rating yet.
    private var pendingEnergyCheckin: (checkin: DailyCheckin, event: AthleteEvent)? {
        for checkin in todayCheckins where checkin.status == "confirmed" && checkin.energyRating == nil {
            guard let event = todayEvents.first(where: { $0.id == checkin.eventId }) else { continue }
            if let time = event.startTime,
               let eventDate = DateFormatter.yyyyMMdd.date(from: event.eventDate) {
                let parts = time.split(separator: ":").compactMap { Int($0) }
                var components = Calendar.current.dateComponents([.year, .month, .day], from: eventDate)
                components.hour = parts.first ?? 0
                components.minute = parts.count > 1 ? parts[1] : 0
                if let eventStart = Calendar.current.date(from: components),
                   Date() < eventStart.addingTimeInterval(3600) {
                    continue  // not yet an hour past start
                }
            }
            return (checkin, event)
        }
        return nil
    }

    var body: some View {
        VStack(spacing: 12) {
            statsRow

            if !todayEvents.isEmpty, todayCheckins.isEmpty {
                morningPromptCard
            }

            if let pending = pendingEnergyCheckin {
                PostEventEnergyCard(event: pending.event) { rating in
                    submitEnergyRating(pending.checkin, rating: rating)
                }
            }

            if let toastText {
                Text(toastText)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.successGreen)
                    .frame(maxWidth: .infinity)
                    .padding(10)
                    .background(Color.successGreen.opacity(0.1))
                    .cornerRadius(10)
            }
        }
        .task {
            await loadCheckins()
        }
        .sheet(isPresented: $showMorningSheet) {
            MorningCheckinSheet(event: todayEvents.first) { status, rescheduleDate, rescheduleTime in
                handleMorningResponse(status: status, rescheduleDate: rescheduleDate, rescheduleTime: rescheduleTime)
            }
        }
        .onChange(of: events.count) { _, _ in
            Task { await loadCheckins() }
        }
    }

    // MARK: - Subviews

    private var statsRow: some View {
        HStack(spacing: 10) {
            StatCard(
                title: "Streak",
                value: "\(streak?.currentStreak ?? 0)",
                icon: "flame.fill",
                color: .brandOrange
            )
            StatCard(
                title: streak?.level ?? "Rookie",
                value: "\(streak?.totalXp ?? 0) XP",
                icon: "star.fill",
                color: .warningYellow
            )
            StatCard(
                title: "Best",
                value: "\(streak?.longestStreak ?? 0)",
                icon: "trophy.fill",
                color: .successGreen
            )
        }
    }

    private var morningPromptCard: some View {
        Button {
            showMorningSheet = true
        } label: {
            HStack {
                Image(systemName: "sun.max.fill")
                    .foregroundColor(.warningYellow)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Ready for today?")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    Text(todayEvents.first.map { "\($0.title) today" } ?? "Check in")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                Spacer()
                Text("+\(GamificationService.XP.morningConfirm) XP")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.brandOrange)
            }
            .padding()
            .background(Color.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.brandOrange.opacity(0.4), lineWidth: 1)
            )
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }

    // MARK: - Actions

    private func loadCheckins() async {
        guard let athleteId else { return }
        todayCheckins = (try? await GamificationService.shared.fetchCheckins(
            athleteId: athleteId,
            date: GamificationService.todayKey()
        )) ?? []
    }

    private func handleMorningResponse(status: String, rescheduleDate: String?, rescheduleTime: String?) {
        guard let athleteId, let event = todayEvents.first else { return }
        Task {
            do {
                if status == "rescheduled", let rescheduleDate {
                    try await APIService.shared.rescheduleAthleteEvent(
                        id: event.id,
                        athleteId: athleteId,
                        eventDate: rescheduleDate,
                        startTime: rescheduleTime ?? event.startTime
                    )
                    try await GamificationService.shared.insertCheckin(
                        athleteId: athleteId,
                        eventId: event.id,
                        status: "rescheduled",
                        note: "Rescheduled to \(rescheduleDate)"
                    )
                    showToast("Event rescheduled")
                } else {
                    try await GamificationService.shared.insertCheckin(
                        athleteId: athleteId,
                        eventId: event.id,
                        status: status
                    )
                    if status == "confirmed" {
                        streak = try await GamificationService.shared.processAction(
                            athleteId: athleteId,
                            xpAmount: GamificationService.XP.morningConfirm,
                            updateStreakFlag: true
                        )
                        showToast("You're in! +\(GamificationService.XP.morningConfirm) XP")
                    }
                }
                await loadCheckins()
                onChanged()
            } catch {
                print("Check-in failed: \(error)")
            }
        }
    }

    private func submitEnergyRating(_ checkin: DailyCheckin, rating: Int) {
        guard let athleteId else { return }
        Task {
            do {
                try await GamificationService.shared.setEnergyRating(
                    checkinId: checkin.id,
                    athleteId: athleteId,
                    rating: rating
                )
                streak = try await GamificationService.shared.processAction(
                    athleteId: athleteId,
                    xpAmount: GamificationService.XP.energyRating,
                    updateStreakFlag: true
                )
                showToast("Session logged! +\(GamificationService.XP.energyRating) XP")
                await loadCheckins()
            } catch {
                print("Energy rating failed: \(error)")
            }
        }
    }

    private func showToast(_ text: String) {
        toastText = text
        Task {
            try? await Task.sleep(for: .seconds(3))
            toastText = nil
        }
    }
}

// MARK: - Morning check-in sheet

struct MorningCheckinSheet: View {
    let event: AthleteEvent?
    var onRespond: (String, String?, String?) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var rescheduleMode = false
    @State private var rescheduleDate = Date()
    @State private var rescheduleTime = Date()

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                if let event {
                    VStack(spacing: 8) {
                        Image(systemName: event.eventType.icon)
                            .font(.system(size: 40))
                            .foregroundColor(event.eventType.color)
                        Text(event.title)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.textPrimary)
                        if let time = event.startTime {
                            Text("Today at \(String(time.prefix(5)))")
                                .font(.subheadline)
                                .foregroundColor(.textSecondary)
                        }
                    }
                    .padding(.top, 20)
                }

                if rescheduleMode {
                    Form {
                        DatePicker("New date", selection: $rescheduleDate, displayedComponents: .date)
                        DatePicker("New time", selection: $rescheduleTime, displayedComponents: .hourAndMinute)
                        Button("Confirm Reschedule") {
                            let timeFormatter = DateFormatter()
                            timeFormatter.dateFormat = "HH:mm"
                            onRespond(
                                "rescheduled",
                                DateFormatter.yyyyMMdd.string(from: rescheduleDate),
                                timeFormatter.string(from: rescheduleTime)
                            )
                            dismiss()
                        }
                    }
                } else {
                    VStack(spacing: 12) {
                        checkinButton("I'm in", icon: "checkmark.circle.fill", color: .successGreen) {
                            onRespond("confirmed", nil, nil)
                            dismiss()
                        }
                        checkinButton("Not today", icon: "xmark.circle", color: .textSecondary) {
                            onRespond("skipped", nil, nil)
                            dismiss()
                        }
                        checkinButton("Reschedule", icon: "calendar.badge.clock", color: .infoBlue) {
                            rescheduleMode = true
                        }
                    }
                    .padding(.horizontal)
                    Spacer()
                }
            }
            .background(Color.appBackground)
            .navigationTitle("Morning Check-In")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Later") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func checkinButton(_ label: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                Text(label).fontWeight(.semibold)
                Spacer()
            }
            .padding()
            .background(Color.cardBackground)
            .foregroundColor(color)
            .cornerRadius(12)
        }
    }
}

// MARK: - Post-event energy rating

struct PostEventEnergyCard: View {
    let event: AthleteEvent
    var onRate: (Int) -> Void
    @State private var submitted = false

    private let emojis = ["😫", "😕", "😐", "🙂", "🔥"]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("How was \(event.title)?", systemImage: "bolt.heart.fill")
                .font(.headline)
                .foregroundColor(.textPrimary)
            Text("Rate your energy to log the session. +\(GamificationService.XP.energyRating) XP")
                .font(.caption)
                .foregroundColor(.textSecondary)
            HStack(spacing: 12) {
                ForEach(1...5, id: \.self) { rating in
                    Button {
                        submitted = true
                        onRate(rating)
                    } label: {
                        Text(emojis[rating - 1])
                            .font(.system(size: 32))
                    }
                    .disabled(submitted)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}
