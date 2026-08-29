//
//  RunTrackerView.swift
//  skills-ios
//
//  Foreground-only run tracking: live stats, controls, and a save summary.
//

import SwiftUI
import CoreLocation

struct RunTrackerView: View {
    @StateObject private var tracker = RunTrackerService()
    @Environment(\.scenePhase) private var scenePhase
    @State private var notes = ""
    @State private var isSaving = false
    @State private var saveError: String?
    @State private var savedMessage: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 18) {
                    if tracker.authorizationDenied {
                        permissionDeniedCard
                    } else {
                        statsCard
                        controls
                        if tracker.status == .summary {
                            summaryCard
                        }
                    }

                    if let message = tracker.errorMessage ?? saveError {
                        Text(message)
                            .font(.caption)
                            .foregroundColor(.errorRed)
                    }
                    if let savedMessage {
                        Text(savedMessage)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.successGreen)
                    }
                }
                .padding()
            }
            .background(Color.appBackground)
            .navigationTitle("Run")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: RunHistoryView()) {
                        Image(systemName: "list.bullet")
                            .foregroundColor(.brandOrange)
                    }
                }
            }
            .onAppear { tracker.requestPermission() }
            .onChange(of: scenePhase) { _, phase in
                // No background location entitlement — pause instead of
                // recording a straight line across the gap.
                if phase != .active { tracker.handleEnteredBackground() }
            }
        }
    }

    private var permissionDeniedCard: some View {
        VStack(spacing: 10) {
            Image(systemName: "location.slash")
                .font(.system(size: 40))
                .foregroundColor(.textSecondary)
            Text("Location access is off")
                .font(.headline)
                .foregroundColor(.textPrimary)
            Text("Enable location for Skills in Settings to track your runs.")
                .font(.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
            if let url = URL(string: UIApplication.openSettingsURLString) {
                Link("Open Settings", destination: url)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.brandOrange)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    private var statsCard: some View {
        VStack(spacing: 16) {
            Text(String(format: "%.2f", tracker.distanceMiles))
                .font(.system(size: 64, weight: .bold, design: .rounded))
                .foregroundColor(.textPrimary)
            Text("MILES")
                .font(.caption)
                .kerning(2)
                .foregroundColor(.textSecondary)

            HStack(spacing: 10) {
                StatCard(
                    title: "Time",
                    value: RunTrackerService.formatDuration(tracker.movingSeconds),
                    icon: "stopwatch",
                    color: .infoBlue
                )
                StatCard(
                    title: "Pace",
                    value: RunTrackerService.formatPace(tracker.currentPace),
                    icon: "speedometer",
                    color: .brandOrange
                )
                StatCard(
                    title: "Avg",
                    value: RunTrackerService.formatPace(tracker.avgPace),
                    icon: "chart.line.uptrend.xyaxis",
                    color: .successGreen
                )
            }

            HStack(spacing: 6) {
                Circle()
                    .fill(tracker.gpsReady ? Color.successGreen : Color.warningYellow)
                    .frame(width: 8, height: 8)
                Text(tracker.gpsReady ? "GPS ready" : "Acquiring GPS…")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(16)
    }

    @ViewBuilder
    private var controls: some View {
        switch tracker.status {
        case .idle:
            actionButton("Start Run", icon: "play.fill", color: .brandOrange) {
                savedMessage = nil
                tracker.start()
            }
        case .running:
            HStack(spacing: 12) {
                actionButton("Pause", icon: "pause.fill", color: .warningYellow) { tracker.pause() }
                actionButton("Finish", icon: "stop.fill", color: .errorRed) { tracker.finish() }
            }
        case .paused:
            HStack(spacing: 12) {
                actionButton("Resume", icon: "play.fill", color: .successGreen) { tracker.resume() }
                actionButton("Finish", icon: "stop.fill", color: .errorRed) { tracker.finish() }
            }
        case .summary:
            EmptyView()
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Run complete")
                .font(.headline)
                .foregroundColor(.textPrimary)
            Text("\(String(format: "%.2f", tracker.distanceMiles)) mi · \(RunTrackerService.formatDuration(tracker.movingSeconds)) · \(RunTrackerService.formatPace(tracker.avgPace)) /mi")
                .font(.subheadline)
                .foregroundColor(.textSecondary)

            TextField("Notes (optional)", text: $notes, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(2...4)

            HStack(spacing: 12) {
                Button {
                    save()
                } label: {
                    HStack {
                        if isSaving { ProgressView().tint(.white) }
                        Text("Save Run").fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.brandOrange)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(isSaving)

                Button {
                    tracker.reset()
                    notes = ""
                } label: {
                    Text("Discard")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .foregroundColor(.errorRed)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.errorRed, lineWidth: 1))
                }
                .disabled(isSaving)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(16)
    }

    private func actionButton(_ title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(color)
                .foregroundColor(.white)
                .cornerRadius(14)
        }
    }

    private func save() {
        isSaving = true
        saveError = nil
        Task {
            do {
                try await tracker.save(notes: notes.isEmpty ? nil : notes)
                savedMessage = "Run saved"
                notes = ""
                tracker.reset()
            } catch {
                saveError = "Couldn't save your run. Please try again."
                print("Run save failed: \(error)")
            }
            isSaving = false
        }
    }
}
