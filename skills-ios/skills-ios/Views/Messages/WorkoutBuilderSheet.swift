//
//  WorkoutBuilderSheet.swift
//  skills-ios
//
//  Trainer composes a workout to send as a message.
//

import SwiftUI

struct WorkoutBuilderSheet: View {
    var onSend: (WorkoutPayload) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var scheduledDate = Date()
    @State private var includeTime = false
    @State private var scheduledTime = Date()
    @State private var intensity = "Medium"
    @State private var drills: [WorkoutDrill] = [WorkoutDrill(name: "", sets: "", notes: nil)]
    @State private var notes = ""

    private let intensities = ["Low", "Medium", "High"]

    var body: some View {
        NavigationView {
            Form {
                Section("Workout") {
                    TextField("Title", text: $title)
                    DatePicker("Date", selection: $scheduledDate, displayedComponents: .date)
                    Toggle("Set a time", isOn: $includeTime)
                    if includeTime {
                        DatePicker("Time", selection: $scheduledTime, displayedComponents: .hourAndMinute)
                    }
                    Picker("Intensity", selection: $intensity) {
                        ForEach(intensities, id: \.self) { Text($0) }
                    }
                    .pickerStyle(.segmented)
                }

                Section("Drills") {
                    ForEach(drills.indices, id: \.self) { index in
                        HStack {
                            TextField("Drill name", text: $drills[index].name)
                            TextField("Sets", text: Binding(
                                get: { drills[index].sets ?? "" },
                                set: { drills[index].sets = $0 }
                            ))
                            .frame(width: 80)
                        }
                    }
                    .onDelete { drills.remove(atOffsets: $0) }

                    Button {
                        drills.append(WorkoutDrill(name: "", sets: "", notes: nil))
                    } label: {
                        Label("Add Drill", systemImage: "plus.circle")
                    }
                }

                Section("Notes") {
                    TextField("Notes for the athlete", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle("Send Workout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Send") {
                        let timeFormatter = DateFormatter()
                        timeFormatter.dateFormat = "HH:mm"
                        onSend(WorkoutPayload(
                            title: title,
                            scheduledDate: DateFormatter.yyyyMMdd.string(from: scheduledDate),
                            scheduledTime: includeTime ? timeFormatter.string(from: scheduledTime) : nil,
                            intensity: intensity,
                            drills: drills.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty },
                            trainerNotes: notes.isEmpty ? nil : notes
                        ))
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}
