//
//  TrainerSessionSheet.swift
//  skills-ios
//
//  Create/edit a trainer service session via create/update_trainer_service RPCs.
//

import SwiftUI

struct TrainerSessionSheet: View {
    var existing: TrainerService?
    var onSaved: (TrainerService) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var descriptionText = ""
    @State private var price = ""
    @State private var durationMinutes = 60
    @State private var location = ""
    @State private var skillLevel = "all_levels"
    @State private var isRecurring = false
    @State private var sessionDate = Date()
    @State private var startTime = Date()
    @State private var selectedDays: Set<String> = []
    @State private var isSaving = false
    @State private var errorMessage: String?

    // Sunday-first, matching web sessionBooking.js DAY_NAMES
    static let dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    private let skillLevels = ["all_levels", "beginner", "intermediate", "advanced"]

    init(existing: TrainerService? = nil, onSaved: @escaping (TrainerService) -> Void) {
        self.existing = existing
        self.onSaved = onSaved
        if let service = existing {
            _name = State(initialValue: service.name)
            _descriptionText = State(initialValue: service.description ?? "")
            _price = State(initialValue: "\(service.price)")
            _durationMinutes = State(initialValue: service.durationMinutes)
            _location = State(initialValue: service.location ?? "")
            _skillLevel = State(initialValue: service.skillLevel ?? "all_levels")
            _isRecurring = State(initialValue: service.isRecurring ?? false)
            _selectedDays = State(initialValue: Set(service.recurrenceDays ?? []))
            if let dateString = service.sessionDate,
               let date = DateFormatter.yyyyMMdd.date(from: dateString) {
                _sessionDate = State(initialValue: date)
            }
            if let time = service.startTime {
                let formatter = DateFormatter()
                formatter.dateFormat = "HH:mm:ss"
                if let parsed = formatter.date(from: time) ?? {
                    formatter.dateFormat = "HH:mm"
                    return formatter.date(from: time)
                }() {
                    _startTime = State(initialValue: parsed)
                }
            }
        }
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Session") {
                    TextField("Name", text: $name)
                    TextField("Description", text: $descriptionText, axis: .vertical)
                        .lineLimit(2...4)
                    TextField("Price (USD)", text: $price)
                        .keyboardType(.decimalPad)
                    Stepper("Duration: \(durationMinutes) min", value: $durationMinutes, in: 15...240, step: 15)
                    TextField("Location", text: $location)
                    Picker("Skill level", selection: $skillLevel) {
                        ForEach(skillLevels, id: \.self) { level in
                            Text(level.replacingOccurrences(of: "_", with: " ").capitalized).tag(level)
                        }
                    }
                }

                Section("Schedule") {
                    Toggle("Repeats weekly", isOn: $isRecurring)
                    if isRecurring {
                        ForEach(Self.dayNames, id: \.self) { day in
                            Button {
                                if selectedDays.contains(day) {
                                    selectedDays.remove(day)
                                } else {
                                    selectedDays.insert(day)
                                }
                            } label: {
                                HStack {
                                    Text(day.capitalized)
                                        .foregroundColor(.primary)
                                    Spacer()
                                    if selectedDays.contains(day) {
                                        Image(systemName: "checkmark")
                                            .foregroundColor(.brandOrange)
                                    }
                                }
                            }
                        }
                    } else {
                        DatePicker("Date", selection: $sessionDate, displayedComponents: .date)
                    }
                    DatePicker("Start time", selection: $startTime, displayedComponents: .hourAndMinute)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundColor(.red)
                }
            }
            .navigationTitle(existing == nil ? "New Session" : "Edit Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .disabled(isSaving)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(existing == nil ? "Create" : "Save") { save() }
                        .disabled(!canSave || isSaving)
                }
            }
        }
    }

    private var canSave: Bool {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty,
              Double(price) != nil else { return false }
        if isRecurring && selectedDays.isEmpty { return false }
        return true
    }

    private func save() {
        guard let priceValue = Double(price) else { return }
        isSaving = true
        errorMessage = nil
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        let dateArg = isRecurring ? nil : DateFormatter.yyyyMMdd.string(from: sessionDate)
        let timeArg = timeFormatter.string(from: startTime)
        // Keep sunday-first ordering in the stored array (web parity)
        let daysArg = Self.dayNames.filter { selectedDays.contains($0) }

        Task {
            do {
                let saved: TrainerService
                if let existing {
                    saved = try await APIService.shared.updateTrainerService(
                        id: existing.id,
                        name: name,
                        description: descriptionText.isEmpty ? nil : descriptionText,
                        price: priceValue,
                        durationMinutes: durationMinutes,
                        sessionDate: dateArg,
                        startTime: timeArg,
                        location: location.isEmpty ? nil : location,
                        skillLevel: skillLevel,
                        isRecurring: isRecurring,
                        recurrenceDays: isRecurring ? daysArg : []
                    )
                } else {
                    saved = try await APIService.shared.createTrainerService(
                        name: name,
                        description: descriptionText.isEmpty ? nil : descriptionText,
                        price: priceValue,
                        durationMinutes: durationMinutes,
                        sessionDate: dateArg,
                        startTime: timeArg,
                        location: location.isEmpty ? nil : location,
                        skillLevel: skillLevel,
                        isRecurring: isRecurring,
                        recurrenceDays: isRecurring ? daysArg : []
                    )
                }
                onSaved(saved)
                dismiss()
            } catch {
                errorMessage = "Couldn't save the session. Check your connection and try again."
                print("Session save failed: \(error)")
            }
            isSaving = false
        }
    }
}
