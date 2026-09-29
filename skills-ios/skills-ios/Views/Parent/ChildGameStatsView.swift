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
                statPill("TO", game.turnovers)
                statPill("MIN", game.minutesPlayed)
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

            if !(game.shotChart ?? []).isEmpty {
                SavedHalfCourtChart(shots: game.shotChart ?? [])
                    .frame(maxWidth: 200)
                    .frame(maxWidth: .infinity)
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
    let child: LinkedChild?
    var athleteName: String? = nil
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
    @State private var shotChart: [ShotChartEntry] = []
    @State private var pendingShotMode: String? = nil
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            Form {
                Section("Shot Chart") {
                    Text(pendingShotMode == nil
                         ? "Choose a shot type, then tap the court."
                         : "Tap the court to place the shot.")
                        .font(.caption)
                        .foregroundColor(.textSecondary)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        shotModeButton("2PT Make", mode: "2pt-make")
                        shotModeButton("2PT Miss", mode: "2pt-miss")
                        shotModeButton("3PT Make", mode: "3pt-make")
                        shotModeButton("3PT Miss", mode: "3pt-miss")
                    }
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))

                    HalfCourtShotChart(shots: shotChart) { location, size in
                        placeShot(at: location, in: size)
                    }
                    .frame(maxWidth: .infinity)
                    .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
                    .listRowBackground(Color.clear)

                    if !shotChart.isEmpty {
                        Button("Undo Last Shot") {
                            undoLastShot()
                        }
                        .foregroundColor(.brandOrange)
                    }
                }

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
                    Stepper("Free throws made: \(ftMade)", value: $ftMade, in: 0...100)
                    Stepper("Free throws attempted: \(ftAttempted)", value: $ftAttempted, in: 0...100)
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
            .tint(Color.brandOrange)
            .navigationTitle("Log Game")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }.disabled(isSaving)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") { save() }
                        .fontWeight(.semibold)
                        .foregroundColor(.brandOrange)
                        .disabled(isSaving || !isValid)
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
                    childId: child?.childId,
                    gameDate: DateFormatter.yyyyMMdd.string(from: gameDate),
                    opponent: opponent.isEmpty ? nil : opponent,
                    points: points, rebounds: rebounds, assists: assists,
                    steals: steals, blocks: blocks, turnovers: turnovers,
                    minutesPlayed: minutesPlayed,
                    fgMade: fgMade, fgAttempted: fgAttempted,
                    threeMade: threeMade, threeAttempted: threeAttempted,
                    ftMade: ftMade, ftAttempted: ftAttempted,
                    notes: notes.isEmpty ? nil : notes,
                    shotChart: shotChart,
                    athleteName: child == nil ? athleteName : nil
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

    private func shotModeButton(_ title: String, mode: String) -> some View {
        let selected = pendingShotMode == mode
        return Button {
            pendingShotMode = selected ? nil : mode
        } label: {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(selected ? Color.brandOrange : Color.cardBackground)
                .foregroundColor(selected ? .white : .textPrimary)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(selected ? Color.brandOrange : Color.textMuted.opacity(0.3), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    private func classifyShotZone(_ xPct: Double, _ yPct: Double) -> String {
        let inPaint = yPct <= 50 && xPct >= 27.5 && xPct <= 72.5
        if inPaint { return "paint" }
        let wing = xPct <= 22 || xPct >= 78
        let upper = yPct <= 55
        let deepOrWingThree = yPct <= 42 && (wing || yPct <= 28)
        if !inPaint && upper && (wing || deepOrWingThree) { return "three" }
        return "mid"
    }

    private func placeShot(at location: CGPoint, in size: CGSize) {
        guard let mode = pendingShotMode, size.width > 0, size.height > 0 else { return }
        let x = min(100, max(0, (location.x / size.width) * 100))
        let y = min(100, max(0, (location.y / size.height) * 100))
        let parts = mode.split(separator: "-")
        guard parts.count == 2 else { return }
        let kind = String(parts[0])
        let result = String(parts[1])
        let entry = ShotChartEntry(
            x: x,
            y: y,
            zone: classifyShotZone(x, y),
            type: result,
            shot_kind: kind
        )
        shotChart.append(entry)
        applyBoxScore(mode: mode, reverse: false)
        pendingShotMode = nil
    }

    private func undoLastShot() {
        guard let last = shotChart.popLast() else { return }
        let mode = "\(last.shot_kind)-\(last.type)"
        applyBoxScore(mode: mode, reverse: true)
    }

    private func applyBoxScore(mode: String, reverse: Bool) {
        let d = reverse ? -1 : 1
        switch mode {
        case "2pt-make":
            points = max(0, points + 2 * d)
            fgMade = max(0, fgMade + d)
            fgAttempted = max(0, fgAttempted + d)
        case "2pt-miss":
            fgAttempted = max(0, fgAttempted + d)
        case "3pt-make":
            points = max(0, points + 3 * d)
            threeMade = max(0, threeMade + d)
            threeAttempted = max(0, threeAttempted + d)
            fgMade = max(0, fgMade + d)
            fgAttempted = max(0, fgAttempted + d)
        case "3pt-miss":
            threeAttempted = max(0, threeAttempted + d)
            fgAttempted = max(0, fgAttempted + d)
        default:
            break
        }
    }
}

private struct HalfCourtShotChart: View {
    let shots: [ShotChartEntry]
    var onTap: (CGPoint, CGSize) -> Void

    var body: some View {
        Image("HalfCourt")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .overlay {
                GeometryReader { geo in
                    ZStack {
                        ForEach(shots) { shot in
                            Circle()
                                .fill(shot.type == "make" ? Color.green : Color.red)
                                .frame(width: 10, height: 10)
                                .position(
                                    x: geo.size.width * shot.x / 100,
                                    y: geo.size.height * shot.y / 100
                                )
                        }
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onEnded { value in
                                onTap(value.location, geo.size)
                            }
                    )
                }
            }
    }
}

private struct SavedHalfCourtChart: View {
    let shots: [ShotChartEntry]

    var body: some View {
        Image("HalfCourt")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .overlay {
                GeometryReader { geo in
                    ZStack {
                        ForEach(shots) { shot in
                            Circle()
                                .fill(shot.type == "make" ? Color.green : Color.red)
                                .frame(width: 8, height: 8)
                                .position(
                                    x: geo.size.width * shot.x / 100,
                                    y: geo.size.height * shot.y / 100
                                )
                        }
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                    .allowsHitTesting(false)
                }
            }
    }
}

struct ParentGameStatsTabView: View {
    @State private var children: [LinkedChild] = []
    @State private var isLoading = true
    @State private var hasLoaded = false
    @State private var selectedChildId: UUID?
    @AppStorage("unlinkedAthleteName") private var unlinkedAthleteName = ""
    @State private var unassignedGames: [PlayerGameStat] = []
    @State private var showLogSheet = false
    @State private var refreshToken = 0
    @State private var showAssignConfirm = false
    @State private var assignError: String?

    private var trimmedAthleteName: String {
        unlinkedAthleteName.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var targetChild: LinkedChild? {
        if children.count == 1 { return children[0] }
        return children.first(where: { $0.childId == selectedChildId })
    }

    private var unassignedTitle: String {
        let n = unassignedGames.count
        return n == 1 ? "1 game logged before linking" : "\(n) games logged before linking"
    }

    private var unassignedNamesSubtitle: String? {
        let names = Array(Set(
            unassignedGames.compactMap { game -> String? in
                let t = game.athleteName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                return t.isEmpty ? nil : t
            }
        )).sorted()
        guard !names.isEmpty else { return nil }
        return "Logged for: \(names.joined(separator: ", "))"
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading && !hasLoaded {
                    ProgressView()
                } else if children.isEmpty {
                    unlinkedBody
                } else if children.count == 1 {
                    VStack(spacing: 0) {
                        if !unassignedGames.isEmpty {
                            unassignedCard
                        }
                        ChildGameStatsView(child: children[0])
                            .id("\(children[0].childId)-\(refreshToken)")
                    }
                } else {
                    VStack(spacing: 0) {
                        Picker("Athlete", selection: $selectedChildId) {
                            ForEach(children) { child in
                                Text(child.displayName).tag(Optional(child.childId))
                            }
                        }
                        .pickerStyle(.menu)
                        .tint(Color.brandOrange)
                        .padding()
                        if !unassignedGames.isEmpty {
                            unassignedCard
                        }
                        if let selected = children.first(where: { $0.childId == selectedChildId }) {
                            ChildGameStatsView(child: selected)
                                .id("\(selected.childId)-\(refreshToken)")
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.appBackground)
            .navigationTitle("Game Stats")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if hasLoaded && children.isEmpty {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button { showLogSheet = true } label: {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.brandOrange)
                        }
                        .disabled(trimmedAthleteName.isEmpty)
                    }
                }
            }
            .sheet(isPresented: $showLogSheet) {
                LogGameSheet(child: nil, athleteName: trimmedAthleteName) {
                    Task { await load() }
                }
            }
            .alert(
                assignConfirmTitle,
                isPresented: $showAssignConfirm
            ) {
                Button("Cancel", role: .cancel) {}
                Button("Add") { assignUnassignedGames() }
            }
            .alert(
                "Couldn't add games",
                isPresented: Binding(
                    get: { assignError != nil },
                    set: { if !$0 { assignError = nil } }
                )
            ) {
                Button("OK", role: .cancel) { assignError = nil }
            } message: {
                Text(assignError ?? "")
            }
        }
        .onAppear {
            Task { await load() }
        }
    }

    private var assignConfirmTitle: String {
        let n = unassignedGames.count
        let games = n == 1 ? "1 game" : "\(n) games"
        let name = targetChild?.displayName ?? "this athlete"
        return "Add \(games) to \(name)'s profile?"
    }

    private var unassignedCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(unassignedTitle)
                .font(.headline)
                .foregroundColor(.textPrimary)
            if let subtitle = unassignedNamesSubtitle {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
            }
            if let target = targetChild {
                Button("Add to \(target.displayName)'s profile") {
                    showAssignConfirm = true
                }
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding(10)
                .background(Color.brandOrange)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
        .padding()
    }

    private var unlinkedBody: some View {
        ScrollView {
            VStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Athlete name")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                    TextField("e.g. Christian", text: $unlinkedAthleteName)
                        .textFieldStyle(.roundedBorder)
                        .foregroundColor(.textPrimary)
                }
                Text("Games you log here are saved to your account. Link your athlete on the Athletes tab to add them to their profile.")
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)

                if unassignedGames.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "list.clipboard")
                            .font(.system(size: 40))
                            .foregroundColor(.textSecondary)
                        Text("No games logged yet.")
                            .font(.subheadline)
                            .foregroundColor(.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                } else {
                    ForEach(unassignedGames) { game in
                        GameStatRow(game: game) { delete(game) }
                    }
                }
            }
            .padding()
        }
        .background(Color.appBackground)
    }

    private func load() async {
        if !hasLoaded { isLoading = true }
        let loaded = (try? await APIService.shared.fetchLinkedChildren()) ?? []
        children = loaded
        unassignedGames = (try? await APIService.shared.fetchUnassignedGameStats()) ?? []
        if !loaded.isEmpty,
           selectedChildId == nil || !loaded.contains(where: { $0.childId == selectedChildId }) {
            selectedChildId = loaded.first?.childId
        }
        isLoading = false
        hasLoaded = true
    }

    private func assignUnassignedGames() {
        guard let target = targetChild else { return }
        let ids = unassignedGames.map(\.id)
        Task {
            do {
                try await APIService.shared.assignGameStats(ids: ids, toChildId: target.childId)
                refreshToken += 1
                await load()
            } catch {
                assignError = error.localizedDescription
            }
        }
    }

    private func delete(_ game: PlayerGameStat) {
        Task {
            try? await APIService.shared.deleteGameStat(id: game.id)
            await load()
        }
    }
}
