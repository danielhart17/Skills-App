//
//  ChildGameStatsView.swift
//  skills-ios
//
//  Parent-logged game stats for a linked child (player_game_stats).
//  The web version also has an interactive shot chart; the shot_chart
//  column defaults to [] so rows written here stay compatible.
//

import SwiftUI

struct ChildGameStatsView: View {
    let child: LinkedChild

    @State private var games: [PlayerGameStat] = []
    @State private var isLoading = true
    @State private var showLogSheet = false

    private var averages: (points: Double, rebounds: Double, assists: Double)? {
        guard !games.isEmpty else { return nil }
        let count = Double(games.count)
        return (
            Double(games.reduce(0) { $0 + $1.points }) / count,
            Double(games.reduce(0) { $0 + $1.rebounds }) / count,
            Double(games.reduce(0) { $0 + $1.assists }) / count
        )
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if isLoading {
                    ProgressView().padding(.top, 40)
                } else {
                    if let averages {
                        HStack(spacing: 10) {
                            StatCard(title: "PPG", value: String(format: "%.1f", averages.points),
                                     icon: "basketball.fill", color: .brandOrange)
                            StatCard(title: "RPG", value: String(format: "%.1f", averages.rebounds),
                                     icon: "arrow.up.circle.fill", color: .infoBlue)
                            StatCard(title: "APG", value: String(format: "%.1f", averages.assists),
                                     icon: "hand.point.right.fill", color: .successGreen)
                        }
                    }

                    if games.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "list.clipboard")
                                .font(.system(size: 40))
                                .foregroundColor(.textSecondary)
                            Text("No games logged yet")
                                .font(.subheadline)
                                .foregroundColor(.textSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    } else {
                        ForEach(games) { game in
                            GameStatRow(game: game) { delete(game) }
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color.appBackground)
        .navigationTitle(child.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button { showLogSheet = true } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.brandOrange)
                }
            }
        }
        .sheet(isPresented: $showLogSheet) {
            LogGameSheet(child: child) {
                Task { await load() }
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        games = (try? await APIService.shared.fetchGameStats(childId: child.childId)) ?? []
        isLoading = false
    }

    private func delete(_ game: PlayerGameStat) {
        Task {
            try? await APIService.shared.deleteGameStat(id: game.id)
            await load()
        }
    }
}

struct GameStatRow: View {
    let game: PlayerGameStat
    var onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(game.opponent.map { "vs \($0)" } ?? "Game")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    Text(game.gameDate)
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

            HStack(spacing: 14) {
                statPill("PTS", game.points)
                statPill("REB", game.rebounds)
                statPill("AST", game.assists)
                statPill("STL", game.steals)
                statPill("BLK", game.blocks)
            }

            HStack(spacing: 14) {
                Text("FG \(game.fgMade)/\(game.fgAttempted) (\(game.fgPercent))")
                Text("3P \(game.threeMade)/\(game.threeAttempted)")
                Text("FT \(game.ftMade)/\(game.ftAttempted)")
            }
            .font(.caption)
            .foregroundColor(.textSecondary)

            if let notes = game.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }

    private func statPill(_ label: String, _ value: Int) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
            Text(label)
                .font(.caption2)
                .foregroundColor(.textMuted)
        }
    }
}

struct LogGameSheet: View {
    let child: LinkedChild
    var onSaved: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var gameDate = Date()
    @State private var opponent = ""
    @State private var points = 0
    @State private var rebounds = 0
    @State private var assists = 0
    @State private var steals = 0
    @State private var blocks = 0
    @State private var turnovers = 0
    @State private var minutesPlayed = 0
    @State private var fgMade = 0
    @State private var fgAttempted = 0
    @State private var threeMade = 0
    @State private var threeAttempted = 0
    @State private var ftMade = 0
    @State private var ftAttempted = 0
    @State private var notes = ""
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            Form {
                Section("Game") {
                    DatePicker("Date", selection: $gameDate, displayedComponents: .date)
                    TextField("Opponent", text: $opponent)
                    Stepper("Minutes: \(minutesPlayed)", value: $minutesPlayed, in: 0...60)
                }

                Section("Box score") {
                    Stepper("Points: \(points)", value: $points, in: 0...200)
                    Stepper("Rebounds: \(rebounds)", value: $rebounds, in: 0...100)
                    Stepper("Assists: \(assists)", value: $assists, in: 0...100)
                    Stepper("Steals: \(steals)", value: $steals, in: 0...100)
                    Stepper("Blocks: \(blocks)", value: $blocks, in: 0...100)
                    Stepper("Turnovers: \(turnovers)", value: $turnovers, in: 0...100)
                }

                Section("Shooting") {
                    Stepper("FG made: \(fgMade)", value: $fgMade, in: 0...100)
                    Stepper("FG attempted: \(fgAttempted)", value: $fgAttempted, in: 0...100)
                    Stepper("3PT made: \(threeMade)", value: $threeMade, in: 0...100)
                    Stepper("3PT attempted: \(threeAttempted)", value: $threeAttempted, in: 0...100)
                    Stepper("FT made: \(ftMade)", value: $ftMade, in: 0...100)
                    Stepper("FT attempted: \(ftAttempted)", value: $ftAttempted, in: 0...100)
                }

                Section("Notes") {
                    TextField("How did it go?", text: $notes, axis: .vertical)
                        .lineLimit(2...5)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
            .navigationTitle("Log Game")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }.disabled(isSaving)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") { save() }.disabled(isSaving || !isValid)
                }
            }
        }
    }

    /// Made can't exceed attempted — the DB has no check for this.
    private var isValid: Bool {
        fgMade <= fgAttempted && threeMade <= threeAttempted && ftMade <= ftAttempted
    }

    private func save() {
        isSaving = true
        errorMessage = nil
        Task {
            do {
                try await APIService.shared.logGameStat(
                    childId: child.childId,
                    gameDate: DateFormatter.yyyyMMdd.string(from: gameDate),
                    opponent: opponent.isEmpty ? nil : opponent,
                    points: points, rebounds: rebounds, assists: assists,
                    steals: steals, blocks: blocks, turnovers: turnovers,
                    minutesPlayed: minutesPlayed,
                    fgMade: fgMade, fgAttempted: fgAttempted,
                    threeMade: threeMade, threeAttempted: threeAttempted,
                    ftMade: ftMade, ftAttempted: ftAttempted,
                    notes: notes.isEmpty ? nil : notes
                )
                onSaved()
                dismiss()
            } catch {
                errorMessage = "Couldn't save the game. Please try again."
                print("Game stat save failed: \(error)")
            }
            isSaving = false
        }
    }
}
