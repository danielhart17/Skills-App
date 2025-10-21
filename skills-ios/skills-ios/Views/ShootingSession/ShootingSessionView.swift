//
//  ShootingSessionView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct ShootingSessionView: View {
    @State private var isSessionActive = false
    @State private var shots: [Shot] = []
    @State private var timeElapsed = 0
    @State private var timer: Timer?
    @State private var showingSummary = false
    @Environment(\.presentationMode) var presentationMode
    
    private var madeShots: Int {
        shots.filter { $0.made }.count
    }
    
    private var percentage: Int {
        guard !shots.isEmpty else { return 0 }
        return Int((Double(madeShots) / Double(shots.count)) * 100)
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
                
                // Basketball Court
                GeometryReader { geometry in
                    ZStack {
                        // Court Background
                        BasketballCourt()
                            .stroke(Color.white, lineWidth: 2)
                            .background(Color.orange.opacity(0.1))
                        
                        // Shot Markers
                        ForEach(shots) { shot in
                            Circle()
                                .fill(shot.made ? Color.green : Color.red)
                                .frame(width: 20, height: 20)
                                .position(
                                    x: shot.x * geometry.size.width,
                                    y: shot.y * geometry.size.height
                                )
                        }
                    }
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onEnded { value in
                                if isSessionActive {
                                    let x = value.location.x / geometry.size.width
                                    let y = value.location.y / geometry.size.height
                                    // Default to made shot, user can toggle
                                    addShot(x: x, y: y, made: true)
                                }
                            }
                    )
                }
                
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
                    } else {
                        HStack(spacing: 12) {
                            // Made Button
                            Button(action: { addLastShotType(made: true) }) {
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
                            Button(action: { addLastShotType(made: false) }) {
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
                    onSave: saveSession,
                    onDiscard: {
                        showingSummary = false
                        presentationMode.wrappedValue.dismiss()
                    }
                )
            }
        }
    }
    
    private func startSession() {
        isSessionActive = true
        timeElapsed = 0
        shots = []
        
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            timeElapsed += 1
        }
    }
    
    private func endSession() {
        timer?.invalidate()
        timer = nil
        isSessionActive = false
        
        if !shots.isEmpty {
            showingSummary = true
        } else {
            presentationMode.wrappedValue.dismiss()
        }
    }
    
    private func addShot(x: Double, y: Double, made: Bool) {
        let shot = Shot(x: x, y: y, made: made)
        shots.append(shot)
    }
    
    private func addLastShotType(made: Bool) {
        if !shots.isEmpty {
            shots[shots.count - 1].made = made
        }
    }
    
    private func undoLastShot() {
        if !shots.isEmpty {
            shots.removeLast()
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
}

struct BasketballCourt: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        // Court outline
        path.addRect(rect)
        
        // Three-point line (simplified arc)
        path.addArc(
            center: CGPoint(x: rect.midX, y: rect.maxY),
            radius: rect.width * 0.35,
            startAngle: .degrees(180),
            endAngle: .degrees(0),
            clockwise: false
        )
        
        // Free throw circle
        path.addEllipse(in: CGRect(
            x: rect.midX - rect.width * 0.1,
            y: rect.maxY - rect.height * 0.25 - rect.width * 0.1,
            width: rect.width * 0.2,
            height: rect.width * 0.2
        ))
        
        // Key (paint)
        path.addRect(CGRect(
            x: rect.midX - rect.width * 0.15,
            y: rect.maxY - rect.height * 0.25,
            width: rect.width * 0.3,
            height: rect.height * 0.25
        ))
        
        // Hoop position
        path.addEllipse(in: CGRect(
            x: rect.midX - 5,
            y: rect.maxY - 5,
            width: 10,
            height: 10
        ))
        
        return path
    }
}

struct SessionSummaryView: View {
    let totalShots: Int
    let madeShots: Int
    let percentage: Int
    let duration: Int
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

#Preview {
    ShootingSessionView()
}

