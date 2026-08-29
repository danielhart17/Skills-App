//
//  RunHistoryView.swift
//  skills-ios
//
//  Past runs, newest first. Runs saved on the web appear here too.
//

import SwiftUI

struct RunHistoryView: View {
    @State private var runs: [Run] = []
    @State private var isLoading = true

    private var totals: (miles: Double, seconds: Int)? {
        guard !runs.isEmpty else { return nil }
        return (
            runs.reduce(0) { $0 + $1.distanceMiles },
            runs.reduce(0) { $0 + $1.durationSeconds }
        )
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if isLoading {
                    ProgressView().padding(.top, 40)
                } else if runs.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "figure.run")
                            .font(.system(size: 40))
                            .foregroundColor(.textSecondary)
                        Text("No runs yet")
                            .font(.subheadline)
                            .foregroundColor(.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 50)
                } else {
                    if let totals {
                        HStack(spacing: 10) {
                            StatCard(
                                title: "Runs",
                                value: "\(runs.count)",
                                icon: "figure.run",
                                color: .brandOrange
                            )
                            StatCard(
                                title: "Miles",
                                value: String(format: "%.1f", totals.miles),
                                icon: "map",
                                color: .infoBlue
                            )
                            StatCard(
                                title: "Time",
                                value: RunTrackerService.formatDuration(totals.seconds),
                                icon: "stopwatch",
                                color: .successGreen
                            )
                        }
                    }

                    ForEach(runs) { run in
                        RunRow(run: run)
                    }
                }
            }
            .padding()
        }
        .background(Color.appBackground)
        .navigationTitle("Run History")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        runs = (try? await APIService.shared.fetchRuns()) ?? []
        isLoading = false
    }
}

struct RunRow: View {
    let run: Run

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(String(format: "%.2f mi", run.distanceMiles))
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                Spacer()
                Text(run.startedAt, format: .dateTime.month().day().hour().minute())
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }

            HStack(spacing: 14) {
                Label(RunTrackerService.formatDuration(run.durationSeconds), systemImage: "stopwatch")
                Label("\(RunTrackerService.formatPace(run.avgPaceMinPerMile)) /mi", systemImage: "speedometer")
                if let maxSpeed = run.maxSpeedMph {
                    Label(String(format: "%.1f mph max", maxSpeed), systemImage: "bolt.fill")
                }
            }
            .font(.caption)
            .foregroundColor(.textSecondary)

            if let notes = run.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}
