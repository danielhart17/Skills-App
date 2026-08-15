//
//  ChallengesView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct ChallengesView: View {
    @State private var challenges: [Challenge] = []
    @State private var isLoading = true
    @State private var selectedCategory = "all"
    @State private var selectedDifficulty = "all"
    
    var featuredChallenge: Challenge? {
        challenges.first { $0.isFeatured }
    }
    
    var categories: [String] {
        var cats = Array(Set(challenges.map { $0.category })).sorted()
        return ["all"] + cats
    }
    
    var filteredChallenges: [Challenge] {
        challenges.filter { challenge in
            // Exclude featured from regular list
            if challenge.id == featuredChallenge?.id { return false }
            
            let categoryMatch = selectedCategory == "all" || challenge.category == selectedCategory
            let difficultyMatch = selectedDifficulty == "all" || challenge.difficulty.rawValue == selectedDifficulty
            
            return categoryMatch && difficultyMatch
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // Header
                            VStack(spacing: 10) {
                                HStack(spacing: 12) {
                                    ZStack {
                                        LinearGradient(
                                            colors: [Color.yellow, Color.orange],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                        .frame(width: 50, height: 50)
                                        .cornerRadius(12)
                                        
                                        Image(systemName: "trophy.fill")
                                            .font(.system(size: 24))
                                            .foregroundColor(.white)
                                    }
                                    
                                    Text("Challenge Library")
                                        .font(.title)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                    
                                    Spacer()
                                }
                                
                                Text("Push your limits with specialized drills and shooting challenges")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal)
                            .padding(.top)
                            
                            // Featured Challenge
                            if let featured = featuredChallenge {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.yellow)
                                            .font(.title3)
                                        Text("Featured Trainer Challenge")
                                            .font(.title3)
                                            .fontWeight(.bold)
                                            .foregroundColor(.white)
                                    }
                                    .padding(.horizontal)
                                    
                                    NavigationLink(destination: ChallengeDetailView(challenge: featured)) {
                                        FeaturedChallengeCard(challenge: featured)
                                            .padding(.horizontal)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            
                            // Live Shooting Session
                            NavigationLink(destination: ShootingSessionView()) {
                                LiveShootingCard()
                                    .padding(.horizontal)
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            // Filters
                            VStack(alignment: .leading, spacing: 15) {
                                // Category Filter
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "line.3.horizontal.decrease.circle")
                                            .foregroundColor(.orange)
                                        Text("Category:")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundColor(.white)
                                    }
                                    
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 10) {
                                            ForEach(categories, id: \.self) { category in
                                                FilterChip(
                                                    title: category.capitalized,
                                                    isSelected: selectedCategory == category,
                                                    color: .orange
                                                ) {
                                                    selectedCategory = category
                                                }
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }
                                
                                // Difficulty Filter
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack(spacing: 6) {
                                        Image(systemName: "chart.bar.fill")
                                            .foregroundColor(.blue)
                                        Text("Difficulty:")
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundColor(.white)
                                    }
                                    .padding(.horizontal)
                                    
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 10) {
                                            FilterChip(title: "All", isSelected: selectedDifficulty == "all", color: .blue) {
                                                selectedDifficulty = "all"
                                            }
                                            FilterChip(title: "Beginner", isSelected: selectedDifficulty == "beginner", color: .green) {
                                                selectedDifficulty = "beginner"
                                            }
                                            FilterChip(title: "Intermediate", isSelected: selectedDifficulty == "intermediate", color: .orange) {
                                                selectedDifficulty = "intermediate"
                                            }
                                            FilterChip(title: "Advanced", isSelected: selectedDifficulty == "advanced", color: .red) {
                                                selectedDifficulty = "advanced"
                                            }
                                        }
                                        .padding(.horizontal)
                                    }
                                }
                            }
                            
                            // Challenge List
                            VStack(spacing: 15) {
                                ForEach(filteredChallenges) { challenge in
                                    NavigationLink(destination: ChallengeDetailView(challenge: challenge)) {
                                        ChallengeCard(challenge: challenge)
                                            .padding(.horizontal)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .background(Color.appBackground)
            .navigationTitle("Workouts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: ProfileView()) {
                        Image(systemName: "person.circle.fill")
                            .font(.title2)
                            .foregroundColor(.brandOrange)
                    }
                }
            }
            .onAppear {
                loadData()
            }
        }
    }
    
    private func loadData() {
        Task {
            do {
                challenges = try await APIService.shared.fetchChallenges()
            } catch {
                print("Error loading data: \(error)")
            }
            isLoading = false
        }
    }
}

// MARK: - Featured Challenge Card
struct FeaturedChallengeCard: View {
    let challenge: Challenge
    
    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            // Header with category tag
            HStack {
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
                
                Spacer()
            }
            
            // Title and Description
            VStack(alignment: .leading, spacing: 8) {
                Text(challenge.title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                if let description = challenge.description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                        .lineLimit(2)
                }
            }
            
            // Meta Info
            HStack(spacing: 20) {
                if let duration = challenge.duration {
                    HStack(spacing: 4) {
                        Image(systemName: "clock")
                            .font(.caption)
                        Text("\(duration) min")
                            .font(.caption)
                    }
                }
                
                HStack(spacing: 4) {
                    Image(systemName: "trophy.fill")
                        .font(.caption)
                    Text("+\(challenge.xpReward) XP")
                        .font(.caption)
                }
                
                Spacer()
            }
            .foregroundColor(.white.opacity(0.9))
            
            // Difficulty Badge
            Text(challenge.difficulty.rawValue.capitalized)
                .font(.caption)
                .fontWeight(.bold)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(difficultyColor)
                .foregroundColor(.white)
                .cornerRadius(12)
            
            // Start Button
            HStack {
                Image(systemName: "play.fill")
                Text("Start Challenge")
                    .fontWeight(.semibold)
            }
            .foregroundColor(Color(red: 0.4, green: 0.3, blue: 0.8))
            .frame(maxWidth: .infinity)
            .padding()
            .background(.white)
            .cornerRadius(10)
            
            // Trainer Info (if available)
            VStack(alignment: .leading, spacing: 10) {
                Text("FROM TRAINER")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white.opacity(0.7))
                
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.white.opacity(0.3))
                        .frame(width: 50, height: 50)
                        .overlay(
                            Text("MJ")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        )
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Coach Mike Johnson")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.caption2)
                            Text("Verified Trainer")
                                .font(.caption)
                        }
                        .foregroundColor(.white.opacity(0.8))
                    }
                    
                    Spacer()
                }
            }
            .padding()
            .background(Color.white.opacity(0.1))
            .cornerRadius(10)
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color(red: 0.4, green: 0.3, blue: 0.8), Color(red: 0.5, green: 0.2, blue: 0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: Color.purple.opacity(0.3), radius: 10, x: 0, y: 5)
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

// MARK: - Live Shooting Session Card
struct LiveShootingCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack(spacing: 15) {
                Image(systemName: "target")
                    .font(.system(size: 40))
                    .foregroundColor(.white)
                
                VStack(alignment: .leading, spacing: 8) {
                    Text("Live Shooting Session")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Text("Track your makes and misses in real-time with our interactive court tracker")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.9))
                        .lineLimit(2)
                }
                
                Spacer()
            }
            
            HStack {
                Image(systemName: "target")
                Text("Start Shooting Session")
                    .fontWeight(.semibold)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.white.opacity(0.2))
            .cornerRadius(10)
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Color.orange, Color.red],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(16)
        .shadow(color: Color.orange.opacity(0.3), radius: 10, x: 0, y: 5)
    }
}

// MARK: - Filter Chip
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? color : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .secondary)
                .cornerRadius(20)
        }
    }
}

// MARK: - Challenge Card
struct ChallengeCard: View {
    let challenge: Challenge
    
    var body: some View {
        HStack(spacing: 15) {
            // Icon
            ZStack {
                Circle()
                    .fill(categoryColor.opacity(0.2))
                    .frame(width: 60, height: 60)
                
                Image(systemName: categoryIcon)
                    .font(.system(size: 30))
                    .foregroundColor(categoryColor)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 8) {
                Text(challenge.title)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .lineLimit(1)
                
                if let description = challenge.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                HStack(spacing: 15) {
                    if let duration = challenge.duration {
                        HStack(spacing: 4) {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text("\(duration)min")
                                .font(.caption2)
                        }
                        .foregroundColor(.secondary)
                    }
                    
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption2)
                        Text("+\(challenge.xpReward)XP")
                            .font(.caption2)
                    }
                    .foregroundColor(.orange)
                }
            }
            
            Spacer()
            
            // Difficulty Badge
            Text(challenge.difficulty.rawValue.capitalized)
                .font(.caption2)
                .fontWeight(.bold)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(difficultyColor)
                .foregroundColor(.white)
                .cornerRadius(8)
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
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

#Preview {
    ChallengesView()
}

