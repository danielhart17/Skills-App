//
//  ChallengeDetailView.swift
//  skills-ios
//
//  Created by Daniel Hart on 11/1/25.
//

import SwiftUI

struct ChallengeDetailView: View {
    let challenge: Challenge
    @State private var isStarted = false
    @State private var isCompleted = false
    @State private var showCompletionSheet = false
    @State private var timeSpent: String = ""
    @State private var notes: String = ""
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 25) {
                // Header Image/Gradient
                ZStack(alignment: .bottomLeading) {
                    LinearGradient(
                        colors: [categoryColor, categoryColor.opacity(0.7)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(height: 200)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 6) {
                            Image(systemName: "bolt.fill")
                                .font(.caption)
                            Text(challenge.category.uppercased())
                                .font(.caption)
                                .fontWeight(.bold)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.white.opacity(0.2))
                        .foregroundColor(.white)
                        .cornerRadius(8)
                        
                        Text(challenge.title)
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }
                    .padding()
                }
                .cornerRadius(0)

                // Workout video
                if let youtubeUrl = challenge.youtubeUrl, !youtubeUrl.isEmpty {
                    VideoPlayerView(videoURL: youtubeUrl)
                        .padding(.horizontal)
                }

                VStack(alignment: .leading, spacing: 20) {
                    // Status Badge
                    if isCompleted {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("Completed")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.green)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(10)
                    } else if isStarted {
                        HStack(spacing: 8) {
                            Image(systemName: "play.circle.fill")
                                .foregroundColor(.orange)
                            Text("In Progress")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.orange)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(10)
                    }
                    
                    // Description
                    if let description = challenge.description {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Description")
                                .font(.headline)
                                .foregroundColor(.white)
                            
                            Text(description)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    // Meta Info Cards
                    HStack(spacing: 15) {
                        // Duration
                        if let duration = challenge.duration {
                            MetaCard(
                                icon: "clock.fill",
                                title: "Duration",
                                value: "\(duration) min",
                                color: .blue
                            )
                        }
                        
                        // XP Reward
                        MetaCard(
                            icon: "star.fill",
                            title: "XP Reward",
                            value: "+\(challenge.xpReward)",
                            color: .orange
                        )
                    }
                    
                    HStack(spacing: 15) {
                        // Difficulty
                        MetaCard(
                            icon: "chart.bar.fill",
                            title: "Difficulty",
                            value: challenge.difficulty.rawValue.capitalized,
                            color: difficultyColor
                        )
                        
                        // Category
                        MetaCard(
                            icon: categoryIcon,
                            title: "Category",
                            value: challenge.category.capitalized,
                            color: categoryColor
                        )
                    }
                    
                    // Space & Players Info (if available)
                    if challenge.spaceRequired != nil || challenge.playersNeeded != nil {
                        HStack(spacing: 15) {
                            // Space Required
                            if let spaceRequired = challenge.spaceRequired {
                                MetaCard(
                                    icon: "square.dashed",
                                    title: "Space Required",
                                    value: spaceRequired,
                                    color: .cyan
                                )
                            }
                            
                            // Players Needed
                            if let playersNeeded = challenge.playersNeeded {
                                MetaCard(
                                    icon: "person.2.fill",
                                    title: "Players Needed",
                                    value: "\(playersNeeded)",
                                    color: .indigo
                                )
                            }
                        }
                    }
                    
                    // Purpose Section
                    if let purpose = challenge.purpose {
                        DetailSection(
                            title: "Purpose",
                            icon: "target",
                            content: purpose,
                            color: .orange
                        )
                    }
                    
                    // Focus Section
                    if let focus = challenge.focus {
                        DetailSection(
                            title: "Focus Areas",
                            icon: "scope",
                            content: focus,
                            color: .yellow
                        )
                    }
                    
                    // Setup Section
                    if let setup = challenge.setup {
                        DetailSection(
                            title: "Setup",
                            icon: "square.and.pencil",
                            content: setup,
                            color: .blue
                        )
                    }
                    
                    // Instructions Section
                    if let instructions = challenge.instructions {
                        DetailSection(
                            title: "Instructions",
                            icon: "list.number",
                            content: instructions,
                            color: .green
                        )
                    }
                    
                    // Action Buttons
                    VStack(spacing: 15) {
                        if !isStarted && !isCompleted {
                            Button(action: {
                                isStarted = true
                            }) {
                                HStack {
                                    Image(systemName: "play.fill")
                                    Text("Start Workout")
                                        .fontWeight(.semibold)
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(categoryColor)
                                .cornerRadius(12)
                            }
                        }
                        
                        if isStarted && !isCompleted {
                            Button(action: {
                                showCompletionSheet = true
                            }) {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Mark as Complete")
                                        .fontWeight(.semibold)
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.green)
                                .cornerRadius(12)
                            }
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
        .background(Color.appBackground)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showCompletionSheet) {
            CompletionSheet(
                challenge: challenge,
                timeSpent: $timeSpent,
                notes: $notes,
                onComplete: {
                    isCompleted = true
                    showCompletionSheet = false
                }
            )
        }
    }
    
    private var categoryIcon: String {
        switch challenge.category.lowercased() {
        case "shooting":
            return "basketball.fill"
        case "dribbling":
            return "figure.basketball"
        case "defense":
            return "shield.fill"
        case "passing":
            return "arrow.triangle.swap"
        case "conditioning":
            return "bolt.fill"
        case "footwork":
            return "shoe.2.fill"
        default:
            return "target"
        }
    }
    
    private var categoryColor: Color {
        switch challenge.category.lowercased() {
        case "shooting":
            return .orange
        case "dribbling":
            return .yellow
        case "defense":
            return .blue
        case "passing":
            return .green
        case "conditioning":
            return .red
        case "footwork":
            return .purple
        default:
            return .brandOrange
        }
    }
    
    private var difficultyColor: Color {
        switch challenge.difficulty {
        case .beginner:
            return .green
        case .intermediate:
            return .orange
        case .advanced:
            return .red
        }
    }
}

// MARK: - Meta Card
struct MetaCard: View {
    let icon: String
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}

// MARK: - Detail Section
struct DetailSection: View {
    let title: String
    let icon: String
    let content: String
    let color: Color
    
    private var contentLines: [String] {
        // Handle both actual newlines and escaped \n strings
        let normalizedContent = content.replacingOccurrences(of: "\\n", with: "\n")
        
        // Split by newline characters
        return normalizedContent.components(separatedBy: CharacterSet.newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
    
    private var shouldShowAsList: Bool {
        // Show as list if there are multiple lines or if lines start with numbers
        contentLines.count > 1 || contentLines.first?.first?.isNumber == true
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.headline)
                    .foregroundColor(color)
                
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
            }
            
            if shouldShowAsList {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(Array(contentLines.enumerated()), id: \.offset) { index, line in
                        HStack(alignment: .top, spacing: 12) {
                            Text("\(index + 1).")
                                .font(.body)
                                .fontWeight(.semibold)
                                .foregroundColor(.brandOrange)
                                .frame(width: 25, alignment: .trailing)
                            
                            Text(line.replacingOccurrences(of: #"^\d+\.\s*"#, with: "", options: .regularExpression))
                                .font(.body)
                                .foregroundColor(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
            } else {
                Text(content)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}

// MARK: - Completion Sheet
struct CompletionSheet: View {
    let challenge: Challenge
    @Binding var timeSpent: String
    @Binding var notes: String
    let onComplete: () -> Void
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            VStack(spacing: 25) {
                // Success Icon
                ZStack {
                    Circle()
                        .fill(Color.green.opacity(0.2))
                        .frame(width: 100, height: 100)
                    
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.green)
                }
                .padding(.top, 30)
                
                Text("Complete Workout")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(challenge.title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                
                VStack(alignment: .leading, spacing: 20) {
                    // Time Spent
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Time Spent (minutes)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        TextField("Enter time in minutes", text: $timeSpent)
                            .keyboardType(.numberPad)
                            .padding()
                            .background(Color.cardBackground)
                            .cornerRadius(10)
                            .foregroundColor(.white)
                    }
                    
                    // Notes
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Notes (optional)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        TextEditor(text: $notes)
                            .frame(height: 100)
                            .padding(8)
                            .background(Color.cardBackground)
                            .cornerRadius(10)
                            .foregroundColor(.white)
                    }
                }
                .padding(.horizontal)
                
                Spacer()
                
                // Complete Button
                Button(action: {
                    onComplete()
                }) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        Text("Complete Workout")
                            .fontWeight(.semibold)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.green)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.bottom, 30)
            }
            .background(Color.appBackground)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                    .foregroundColor(.brandOrange)
                }
            }
        }
    }
}

#Preview {
    NavigationView {
        ChallengeDetailView(challenge: Challenge(
            id: UUID(),
            title: "Elite Ball Handler",
            description: "Complete advanced dribbling drills without losing control",
            category: "dribbling",
            difficulty: .advanced,
            xpReward: 150,
            duration: 30,
            isFeatured: true,
            createdBy: nil,
            thumbnailUrl: nil,
            setup: "Place 5 cones in a zig-zag pattern, 3 feet apart. Have a basketball ready.",
            instructions: "1. Start at the first cone with the ball in your right hand\n2. Dribble through each cone using crossover dribbles\n3. At the last cone, turn around and come back using between-the-legs dribbles\n4. Repeat 5 times without losing control",
            spaceRequired: "10x15 feet",
            playersNeeded: 1,
            purpose: "Develop advanced ball handling skills and improve dribbling control under pressure",
            focus: "Crossover dribbles, between-the-legs moves, maintaining control at speed",
            createdAt: Date(),
            updatedAt: nil
        ))
    }
}

