//
//  ScheduleView.swift
//  skills-ios
//
//  Athlete weekly schedule over athlete_events. Week runs Sun–Sat (web parity).
//

import SwiftUI

struct ScheduleView: View {
    @StateObject private var authService = AuthService.shared
    @State private var weekAnchor = Date()
    @State private var selectedDate = Date()
    @State private var events: [AthleteEvent] = []
    @State private var streak: AthleteStreak?
    @State private var isLoading = true
    @State private var showAddEvent = false

    private var calendar: Calendar {
        var calendar = Calendar.current
        calendar.firstWeekday = 1  // Sunday
        return calendar
    }

    private var weekDays: [Date] {
        guard let start = calendar.dateInterval(of: .weekOfYear, for: weekAnchor)?.start else { return [] }
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    private var eventsByDate: [String: [AthleteEvent]] {
        Dictionary(grouping: events, by: \.eventDate)
    }

    private var selectedDayEvents: [AthleteEvent] {
        eventsByDate[DateFormatter.yyyyMMdd.string(from: selectedDate)] ?? []
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    CheckinSection(events: events, streak: $streak, onChanged: reload)

                    weekHeader
                    WeekStrip(
                        days: weekDays,
                        selectedDate: $selectedDate,
                        eventsByDate: eventsByDate
                    )

                    if selectedDayEvents.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "calendar.badge.plus")
                                .font(.system(size: 40))
                                .foregroundColor(.textSecondary)
                            Text("Nothing scheduled")
                                .font(.subheadline)
                                .foregroundColor(.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 30)
                    } else {
                        ForEach(selectedDayEvents) { event in
                            AthleteEventRow(event: event, onDelete: { delete(event) })
                        }
                    }
                }
                .padding()
            }
            .background(Color.appBackground)
            .navigationTitle("Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddEvent = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.brandOrange)
                    }
                }
            }
            .sheet(isPresented: $showAddEvent) {
                AddEventSheet(defaultDate: selectedDate) { title, type, date, time, opponent, location, notes in
                    Task {
                        guard let userId = authService.currentUser?.id else { return }
                        try? await APIService.shared.createAthleteEvent(
                            athleteId: userId,
                            title: title,
                            eventType: type,
                            eventDate: date,
                            startTime: time,
                            opponent: opponent,
                            location: location,
                            notes: notes
                        )
                        await loadEvents()
                    }
                }
            }
            .task {
                await loadEvents()
            }
            .refreshable {
                await loadEvents()
            }
            .onChange(of: weekAnchor) { _, _ in
                Task { await loadEvents() }
            }
        }
    }

    private var weekHeader: some View {
        HStack {
            Button { shiftWeek(-1) } label: {
                Image(systemName: "chevron.left").foregroundColor(.brandOrange)
            }
            Spacer()
            VStack(spacing: 2) {
                Text(weekRangeLabel)
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                Button("Today") {
                    weekAnchor = Date()
                    selectedDate = Date()
                }
                .font(.caption)
                .foregroundColor(.brandOrange)
            }
            Spacer()
            Button { shiftWeek(1) } label: {
                Image(systemName: "chevron.right").foregroundColor(.brandOrange)
            }
        }
    }

    private var weekRangeLabel: String {
        guard let first = weekDays.first, let last = weekDays.last else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return "\(formatter.string(from: first)) – \(formatter.string(from: last))"
    }

    private func shiftWeek(_ direction: Int) {
        if let newAnchor = calendar.date(byAdding: .weekOfYear, value: direction, to: weekAnchor) {
            weekAnchor = newAnchor
            selectedDate = calendar.dateInterval(of: .weekOfYear, for: newAnchor)?.start ?? newAnchor
        }
    }

    private func reload() {
        Task { await loadEvents() }
    }

    private func loadEvents() async {
        guard let userId = authService.currentUser?.id, let first = weekDays.first, let last = weekDays.last else { return }
        do {
            events = try await APIService.shared.fetchAthleteEvents(
                athleteId: userId,
                from: DateFormatter.yyyyMMdd.string(from: first),
                to: DateFormatter.yyyyMMdd.string(from: last)
            )
            streak = try? await GamificationService.shared.ensureStreakRow(athleteId: userId)
        } catch {
            print("Error loading schedule: \(error)")
        }
        isLoading = false
    }

    private func delete(_ event: AthleteEvent) {
        Task {
            guard let userId = authService.currentUser?.id else { return }
            try? await APIService.shared.deleteAthleteEvent(id: event.id, athleteId: userId)
            await loadEvents()
        }
    }
}

// MARK: - Week strip

struct WeekStrip: View {
    let days: [Date]
    @Binding var selectedDate: Date
    let eventsByDate: [String: [AthleteEvent]]

    var body: some View {
        HStack(spacing: 6) {
            ForEach(days, id: \.self) { day in
                let key = DateFormatter.yyyyMMdd.string(from: day)
                let isSelected = Calendar.current.isDate(day, inSameDayAs: selectedDate)
                let isToday = Calendar.current.isDateInToday(day)

                VStack(spacing: 6) {
                    Text(day, format: .dateTime.weekday(.narrow))
                        .font(.caption2)
                        .foregroundColor(.textSecondary)
                    Text(day, format: .dateTime.day())
                        .font(.subheadline)
                        .fontWeight(isToday ? .bold : .regular)
                        .foregroundColor(isSelected ? .white : (isToday ? .brandOrange : .textPrimary))
                    HStack(spacing: 3) {
                        ForEach((eventsByDate[key] ?? []).prefix(3), id: \.id) { event in
                            Circle()
                                .fill(event.eventType.color)
                                .frame(width: 5, height: 5)
                        }
                    }
                    .frame(height: 6)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(isSelected ? Color.brandOrange : Color.cardBackground)
                .cornerRadius(10)
                .onTapGesture { selectedDate = day }
            }
        }
    }
}

extension AthleteEvent.EventType {
    var color: Color {
        switch self {
        case .game: return .orange
        case .practice: return .successGreen
        case .workout: return .brandBlue
        case .rest: return .textMuted
        }
    }

    var icon: String {
        switch self {
        case .game: return "sportscourt.fill"
        case .practice: return "figure.basketball"
        case .workout: return "dumbbell.fill"
        case .rest: return "moon.zzz.fill"
        }
    }
}

// MARK: - Event row

struct AthleteEventRow: View {
    let event: AthleteEvent
    var onDelete: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: event.eventType.icon)
                .font(.title3)
                .foregroundColor(event.eventType.color)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 4) {
                Text(event.title)
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                HStack(spacing: 8) {
                    if let time = event.startTime {
                        Text(String(time.prefix(5)))
                    }
                    if let opponent = event.opponent, !opponent.isEmpty {
                        Text("vs \(opponent)")
                    }
                    if let location = event.location, !location.isEmpty {
                        Text(location)
                    }
                }
                .font(.caption)
                .foregroundColor(.textSecondary)
            }

            Spacer()

            Menu {
                Button(role: .destructive, action: onDelete) {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .foregroundColor(.textMuted)
                    .padding(8)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}

// MARK: - Add event

struct AddEventSheet: View {
    let defaultDate: Date
    var onAdd: (String, AthleteEvent.EventType, String, String?, String?, String?, String?) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var eventType = AthleteEvent.EventType.practice
    @State private var date: Date
    @State private var includeTime = false
    @State private var time = Date()
    @State private var opponent = ""
    @State private var location = ""
    @State private var notes = ""

    init(defaultDate: Date, onAdd: @escaping (String, AthleteEvent.EventType, String, String?, String?, String?, String?) -> Void) {
        self.defaultDate = defaultDate
        self.onAdd = onAdd
        _date = State(initialValue: defaultDate)
    }

    var body: some View {
        NavigationView {
            Form {
                TextField("Title", text: $title)
                Picker("Type", selection: $eventType) {
                    ForEach(AthleteEvent.EventType.allCases, id: \.self) { type in
                        Text(type.rawValue.capitalized).tag(type)
                    }
                }
                DatePicker("Date", selection: $date, displayedComponents: .date)
                Toggle("Set a time", isOn: $includeTime)
                if includeTime {
                    DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                }
                if eventType == .game {
                    TextField("Opponent", text: $opponent)
                }
                TextField("Location", text: $location)
                TextField("Notes", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }
            .navigationTitle("Add Event")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") {
                        let timeFormatter = DateFormatter()
                        timeFormatter.dateFormat = "HH:mm"
                        onAdd(
                            title,
                            eventType,
                            DateFormatter.yyyyMMdd.string(from: date),
                            includeTime ? timeFormatter.string(from: time) : nil,
                            opponent.isEmpty ? nil : opponent,
                            location.isEmpty ? nil : location,
                            notes.isEmpty ? nil : notes
                        )
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
