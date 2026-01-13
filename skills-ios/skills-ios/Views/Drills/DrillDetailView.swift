//
//  DrillDetailView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct DrillDetailView: View {
    let drill: Drill
    @State private var showingCompletion = false
    @State private var notes = ""
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Video or Header Image
                if let videoUrl = drill.videoUrl, !videoUrl.isEmpty {
                    VideoPlayerView(videoURL: videoUrl)
                        .frame(height: 250)
                        .clipped()
                } else if let thumbnailUrl = drill.thumbnailUrl, !thumbnailUrl.isEmpty {
                    RemoteImageView(
                        imageURL: thumbnailUrl,
                        maxHeight: 200,
                        cornerRadius: 0,
                        contentMode: .fill
                    )
                    .clipped()
                } else {
                    // Fallback placeholder
                    Rectangle()
                        .fill(LinearGradient(
                            gradient: Gradient(colors: [.brandOrange, .purple]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(height: 200)
                        .overlay(
                            Image(systemName: "figure.basketball")
                                .font(.system(size: 60))
                                .foregroundColor(.white)
                        )
                }
                
                VStack(alignment: .leading, spacing: 15) {
                    // Title
                    Text(drill.title)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    // Meta Info
                    HStack(spacing: 15) {
                        if let duration = drill.duration {
                            Label("\(duration) min", systemImage: "clock")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Label("\(drill.xpReward) XP", systemImage: "star.fill")
                            .font(.subheadline)
                            .foregroundColor(.orange)
                        
                        Text(drill.difficulty.rawValue.capitalized)
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(difficultyColor.opacity(0.2))
                            .foregroundColor(difficultyColor)
                            .cornerRadius(5)
                    }
                    
                    Divider()
                    
                    // Description
                    if let description = drill.description {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Description")
                                .font(.headline)
                            Text(description)
                                .font(.body)
                                .foregroundColor(.primary)
                        }
                    }
                    
                    // Equipment
                    if !drill.equipment.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Equipment Needed")
                                .font(.headline)
                            
                            ForEach(drill.equipment, id: \.self) { item in
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                    Text(item)
                                        .font(.subheadline)
                                }
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                    }
                    
                    // Instructions
                    if let instructions = drill.instructions {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Instructions")
                                .font(.headline)
                            Text(instructions)
                                .font(.body)
                                .foregroundColor(.primary)
                        }
                    }
                    
                    // Mark Complete Button
                    Button(action: { showingCompletion = true }) {
                        HStack {
                            Text("Mark as Complete")
                                .fontWeight(.semibold)
                            Spacer()
                            Image(systemName: "checkmark.circle.fill")
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingCompletion) {
            DrillCompletionView(drill: drill, onComplete: completeDrill)
        }
    }
    
    private var difficultyColor: Color {
        switch drill.difficulty {
        case .beginner:
            return .green
        case .intermediate:
            return .orange
        case .advanced:
            return .red
        }
    }
    
    private func completeDrill(timeSpent: Int, notes: String) {
        Task {
            do {
                try await APIService.shared.markDrillComplete(
                    drillId: drill.id,
                    timeSpent: timeSpent,
                    notes: notes
                )
                presentationMode.wrappedValue.dismiss()
            } catch {
                print("Error marking drill complete: \(error)")
            }
        }
    }
}

struct DrillCompletionView: View {
    let drill: Drill
    let onComplete: (Int, String) -> Void
    
    @State private var timeSpent = 30
    @State private var notes = ""
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Time Spent")) {
                    Stepper(value: $timeSpent, in: 1...120, step: 5) {
                        Text("\(timeSpent) minutes")
                    }
                }
                
                Section(header: Text("Notes (Optional)")) {
                    TextEditor(text: $notes)
                        .frame(height: 100)
                }
                
                Section {
                    Button(action: {
                        onComplete(timeSpent, notes)
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack {
                            Spacer()
                            Text("Complete Drill")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Complete Drill")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationView {
        DrillDetailView(drill: Drill(
            id: UUID(),
            title: "Form Shooting",
            description: "Perfect your shooting form with close-range shots.",
            category: "Shooting",
            difficulty: .beginner,
            duration: 20,
            xpReward: 50,
            equipment: ["Basketball", "Hoop"],
            instructions: "Start 5 feet from the basket. Focus on proper form. Make 10 shots in a row before moving back.",
            videoUrl: nil,
            thumbnailUrl: nil,
            createdBy: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}

