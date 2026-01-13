//
//  ShootingSessionView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

// Define court zones matching web version
struct CourtZone: Identifiable {
    let id: String
    let name: String
    let path: Path
    let color: Color
    
    func contains(point: CGPoint, in size: CGSize) -> Bool {
        let scaledPath = path.applying(CGAffineTransform(scaleX: size.width / 100, y: size.height / 100))
        return scaledPath.contains(point)
    }
}

struct ShootingSessionView: View {
    @State private var isSessionActive = false
    @State private var shots: [Shot] = []
    @State private var timeElapsed = 0
    @State private var timer: Timer?
    @State private var showingSummary = false
    @State private var selectedZone: String? = nil
    @State private var zoneStats: [String: ZoneStat] = [:]
    @Environment(\.presentationMode) var presentationMode
    
    private let courtZones: [CourtZone] = createCourtZones()
    
    private var madeShots: Int {
        shots.filter { $0.made }.count
    }
    
    private var percentage: Int {
        guard !shots.isEmpty else { return 0 }
        return Int((Double(madeShots) / Double(shots.count)) * 100)
    }
    
    private var bestZone: (name: String, percentage: Double, made: Int, attempts: Int)? {
        guard !zoneStats.isEmpty else { return nil }
        
        let best = zoneStats.max { a, b in
            let aPerc = Double(a.value.made) / Double(a.value.attempts)
            let bPerc = Double(b.value.made) / Double(b.value.attempts)
            return aPerc < bPerc
        }
        
        if let best = best {
            let zoneName = courtZones.first(where: { $0.id == best.key })?.name ?? best.key
            let percentage = (Double(best.value.made) / Double(best.value.attempts)) * 100
            return (zoneName, percentage, best.value.made, best.value.attempts)
        }
        return nil
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Stats Bar
                HStack {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("\(madeShots)/\(shots.count)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Made/Total")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    VStack(spacing: 5) {
                        Text("\(percentage)%")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.orange)
                        Text("Accuracy")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 5) {
                        Text(formatTime(timeElapsed))
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Time")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                
                // Basketball Court with Zones
                GeometryReader { geometry in
                    ZStack {
                        // Background court image
                        Image("half-court")
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: geometry.size.width, height: geometry.size.width)
                            .clipped()
                        
                        // Interactive zones overlay
                        Canvas { context, size in
                            for zone in courtZones {
                                let scaledPath = zone.path.applying(CGAffineTransform(scaleX: size.width / 100, y: size.height / 100))
                                
                                let stat = zoneStats[zone.id]
                                let isSelected = selectedZone == zone.id
                                let hasStats = stat != nil && stat!.attempts > 0
                                
                                // Fill zone
                                if isSelected {
                                    context.fill(scaledPath, with: .color(.blue.opacity(0.6)))
                                } else if hasStats {
                                    context.fill(scaledPath, with: .color(zone.color.opacity(0.5)))
                                } else {
                                    context.fill(scaledPath, with: .color(.white.opacity(0.1)))
                                }
                                
                                // Stroke zone
                                context.stroke(
                                    scaledPath,
                                    with: .color(isSelected ? .white : .white.opacity(0.3)),
                                    lineWidth: isSelected ? 2 : 1
                                )
                                
                                // Draw stats text
                                if let stat = stat, stat.attempts > 0 {
                                    let center = getZoneCenter(zone.path, size: size)
                                    let percentage = Int((Double(stat.made) / Double(stat.attempts)) * 100)
                                    
                                    // Made-Attempts text
                                    let madeAttemptsText = Text("\(stat.made)-\(stat.attempts)")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                    context.draw(madeAttemptsText, at: CGPoint(x: center.x, y: center.y - 8))
                                    
                                    // Percentage text
                                    let percentageText = Text("\(percentage)%")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(.white)
                                    context.draw(percentageText, at: CGPoint(x: center.x, y: center.y + 8))
                                }
                            }
                        }
                        .frame(width: geometry.size.width, height: geometry.size.width)
                        .contentShape(Rectangle())
                        .gesture(
                            DragGesture(minimumDistance: 0)
                                .onEnded { value in
                                    if isSessionActive {
                                        handleCourtTap(at: value.location, in: geometry.size)
                                    }
                                }
                        )
                        
                        // Instructions overlay
                        if !isSessionActive && shots.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "target")
                                    .font(.system(size: 60))
                                    .foregroundColor(.white)
                                Text("Start Your Session")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                Text("Tap zones to track shots")
                                    .font(.subheadline)
                                    .foregroundColor(.white.opacity(0.9))
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(Color.black.opacity(0.7))
                        }
                        
                        // Selected zone indicator
                        if let selectedZone = selectedZone, isSessionActive {
                            VStack(spacing: 4) {
                                Text(courtZones.first(where: { $0.id == selectedZone })?.name ?? "")
                                    .font(.headline)
                                    .fontWeight(.bold)
                                Text("Did you make the shot?")
                                    .font(.caption)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                            .shadow(radius: 5)
                            .frame(maxHeight: .infinity, alignment: .bottom)
                            .padding(.bottom, 20)
                        }
                    }
                    .frame(width: geometry.size.width, height: geometry.size.width)
                }
                .aspectRatio(1, contentMode: .fit)
                
                // Controls
                VStack(spacing: 15) {
                    if !isSessionActive {
                        Button(action: startSession) {
                            HStack {
                                Image(systemName: "play.circle.fill")
                                Text("Start Session")
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                    } else if selectedZone != nil {
                        HStack(spacing: 12) {
                            // Made Button
                            Button(action: { recordShot(made: true) }) {
                                VStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.title)
                                    Text("Made")
                                        .font(.caption)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.green)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                            }
                            
                            // Missed Button
                            Button(action: { recordShot(made: false) }) {
                                VStack {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.title)
                                    Text("Missed")
                                        .font(.caption)
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.red)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                            }
                        }
                    } else {
                        // Undo and End Session buttons when no zone is selected
                        HStack(spacing: 12) {
                            // Undo Button
                            Button(action: undoLastShot) {
                                HStack {
                                    Image(systemName: "arrow.uturn.backward")
                                    Text("Undo")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color(.systemGray5))
                                .foregroundColor(.primary)
                                .cornerRadius(10)
                            }
                            .disabled(shots.isEmpty)
                            
                            // End Session Button
                            Button(action: endSession) {
                                HStack {
                                    Image(systemName: "stop.circle.fill")
                                    Text("End Session")
                                }
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Shooting Session")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingSummary) {
                SessionSummaryView(
                    totalShots: shots.count,
                    madeShots: madeShots,
                    percentage: percentage,
                    duration: timeElapsed,
                    bestZone: bestZone,
                    onSave: saveSession,
                    onDiscard: {
                        showingSummary = false
                        presentationMode.wrappedValue.dismiss()
                    }
                )
            }
        }
    }
    
    private func handleCourtTap(at location: CGPoint, in size: CGSize) {
        // Find which zone was tapped
        for zone in courtZones {
            if zone.contains(point: location, in: CGSize(width: size.width, height: size.width)) {
                selectedZone = zone.id
                return
            }
        }
    }
    
    private func recordShot(made: Bool) {
        guard let zone = selectedZone else { return }
        
        let shot = Shot(x: 0, y: 0, made: made, zone: zone)
        shots.append(shot)
        
        // Update zone stats
        var stat = zoneStats[zone] ?? ZoneStat(made: 0, attempts: 0)
        stat.attempts += 1
        if made {
            stat.made += 1
        }
        zoneStats[zone] = stat
        
        selectedZone = nil
    }
    
    private func startSession() {
        isSessionActive = true
        timeElapsed = 0
        shots = []
        zoneStats = [:]
        selectedZone = nil
        
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            timeElapsed += 1
        }
    }
    
    private func endSession() {
        timer?.invalidate()
        timer = nil
        isSessionActive = false
        selectedZone = nil
        
        if !shots.isEmpty {
            showingSummary = true
        } else {
            presentationMode.wrappedValue.dismiss()
        }
    }
    
    private func undoLastShot() {
        guard !shots.isEmpty else { return }
        let lastShot = shots.removeLast()
        
        // Update zone stats
        if let zone = lastShot.zone, var stat = zoneStats[zone] {
            stat.attempts -= 1
            if lastShot.made {
                stat.made -= 1
            }
            if stat.attempts > 0 {
                zoneStats[zone] = stat
            } else {
                zoneStats.removeValue(forKey: zone)
            }
        }
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", minutes, secs)
    }
    
    private func saveSession() {
        Task {
            do {
                try await APIService.shared.saveShootingSession(
                    totalShots: shots.count,
                    madeShots: madeShots,
                    durationSeconds: timeElapsed,
                    shots: shots
                )
                showingSummary = false
                presentationMode.wrappedValue.dismiss()
            } catch {
                print("Error saving session: \(error)")
            }
        }
    }
    
    private func getZoneCenter(_ path: Path, size: CGSize) -> CGPoint {
        let scaledPath = path.applying(CGAffineTransform(scaleX: size.width / 100, y: size.height / 100))
        let bounds = scaledPath.boundingRect
        return CGPoint(x: bounds.midX, y: bounds.midY)
    }
}

// Helper to create court zones matching the reference screenshot
// Court orientation: Hoop at TOP (Y=0), Half-court at BOTTOM (Y=100)
func createCourtZones() -> [CourtZone] {
    return [
        CourtZone(
            id: "left-corner",
            name: "Left Corner",
            path: createPath("M 0 0 L 0 40 L 12 40 L 12 0 Z"),
            color: .gray
        ),
        CourtZone(
            id: "left-wing",
            name: "Left Wing",
            path: createPath("M 12 0 L 12 40 L 32 35 L 32 0 Z"),
            color: .blue
        ),
        CourtZone(
            id: "restricted",
            name: "Restricted Area",
            path: createPath("M 32 0 L 32 35 L 68 35 L 68 0 Z"),
            color: .red
        ),
        CourtZone(
            id: "right-wing",
            name: "Right Wing",
            path: createPath("M 68 0 L 68 35 L 88 40 L 88 0 Z"),
            color: .red
        ),
        CourtZone(
            id: "right-corner",
            name: "Right Corner",
            path: createPath("M 88 0 L 88 40 L 100 40 L 100 0 Z"),
            color: .gray
        ),
        CourtZone(
            id: "top-key",
            name: "Top of Key",
            path: createPath("M 32 35 L 32 55 L 68 55 L 68 35 Z"),
            color: .red
        ),
        CourtZone(
            id: "free-throw",
            name: "Free Throw",
            path: createPath("M 40 55 L 40 65 L 60 65 L 60 55 Z"),
            color: .red
        ),
        CourtZone(
            id: "left-mid",
            name: "Left Mid",
            path: createPath("M 12 40 L 12 100 L 32 100 L 32 55 L 32 35 Z"),
            color: .red
        ),
        CourtZone(
            id: "right-mid",
            name: "Right Mid",
            path: createPath("M 68 35 L 68 55 L 68 100 L 88 100 L 88 40 Z"),
            color: .red
        ),
        CourtZone(
            id: "left-baseline",
            name: "Left Baseline",
            path: createPath("M 32 55 L 32 100 L 40 100 L 40 65 Z"),
            color: .red
        ),
        CourtZone(
            id: "right-baseline",
            name: "Right Baseline",
            path: createPath("M 60 65 L 60 100 L 68 100 L 68 55 Z"),
            color: .red
        ),
    ]
}

// Helper to parse SVG-like path string into SwiftUI Path
func createPath(_ pathString: String) -> Path {
    var path = Path()
    let commands = pathString.split(separator: " ")
    var currentPoint = CGPoint.zero
    
    var i = 0
    while i < commands.count {
        let command = String(commands[i])
        
        switch command {
        case "M": // Move to
            if i + 2 < commands.count {
                let x = Double(commands[i + 1]) ?? 0
                let y = Double(commands[i + 2]) ?? 0
                currentPoint = CGPoint(x: x, y: y)
                path.move(to: currentPoint)
                i += 3
            } else {
                i += 1
            }
            
        case "L": // Line to
            if i + 2 < commands.count {
                let x = Double(commands[i + 1]) ?? 0
                let y = Double(commands[i + 2]) ?? 0
                currentPoint = CGPoint(x: x, y: y)
                path.addLine(to: currentPoint)
                i += 3
            } else {
                i += 1
            }
            
        case "Z": // Close path
            path.closeSubpath()
            i += 1
            
        default:
            i += 1
        }
    }
    
    return path
}

struct ZoneStat {
    var made: Int
    var attempts: Int
}

struct SessionSummaryView: View {
    let totalShots: Int
    let madeShots: Int
    let percentage: Int
    let duration: Int
    let bestZone: (name: String, percentage: Double, made: Int, attempts: Int)?
    let onSave: () -> Void
    let onDiscard: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                Spacer()
                
                // Trophy Icon
                Image(systemName: "basketball.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.orange)
                
                // Stats
                VStack(spacing: 20) {
                    Text("Session Complete!")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    VStack(spacing: 15) {
                        StatRow(label: "Total Shots", value: "\(totalShots)")
                        StatRow(label: "Made Shots", value: "\(madeShots)")
                        StatRow(label: "Accuracy", value: "\(percentage)%")
                        StatRow(label: "Duration", value: formatTime(duration))
                        
                        if let bestZone = bestZone {
                            Divider()
                            VStack(spacing: 8) {
                                HStack {
                                    Image(systemName: "trophy.fill")
                                        .foregroundColor(.yellow)
                                    Text("Best Zone")
                                        .font(.headline)
                                }
                                Text(bestZone.name)
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(.purple)
                                Text("\(bestZone.made)-\(bestZone.attempts) (\(Int(bestZone.percentage))%)")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color.purple.opacity(0.1))
                            .cornerRadius(8)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(10)
                }
                .padding(.horizontal)
                
                Spacer()
                
                // Actions
                VStack(spacing: 12) {
                    Button(action: onSave) {
                        Text("Save Session")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                    
                    Button(action: onDiscard) {
                        Text("Discard")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray5))
                            .foregroundColor(.primary)
                            .cornerRadius(10)
                    }
                }
                .padding()
            }
            .navigationTitle("Summary")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let secs = seconds % 60
        return String(format: "%02d:%02d", minutes, secs)
    }
}

struct StatRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.semibold)
        }
    }
}

#Preview {
    ShootingSessionView()
}
