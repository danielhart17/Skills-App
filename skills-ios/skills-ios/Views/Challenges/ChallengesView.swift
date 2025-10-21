//
//  ChallengesView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct ChallengesView: View {
    @State private var challenges: [Challenge] = []
    @State private var drills: [Drill] = []
    @State private var isLoading = true
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Selector
                Picker("", selection: $selectedTab) {
                    Text("Challenges").tag(0)
                    Text("Drills").tag(1)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 15) {
                            if selectedTab == 0 {
                                ForEach(challenges) { challenge in
                                    ChallengeCard(challenge: challenge)
                                }
                            } else {
                                ForEach(drills) { drill in
                                    NavigationLink(destination: DrillDetailView(drill: drill)) {
                                        DrillCard(drill: drill)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Challenges & Drills")
            .onAppear {
                loadData()
            }
        }
    }
    
    private func loadData() {
        Task {
            do {
                challenges = try await APIService.shared.fetchChallenges()
                drills = try await APIService.shared.fetchDrills()
            } catch {
                print("Error loading data: \(error)")
            }
            isLoading = false
        }
    }
}

struct ChallengeCard: View {
    let challenge: Challenge
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 5) {
                    if challenge.isFeatured {
                        HStack(spacing: 5) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                            Text("Featured")
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                    }
                    
                    Text(challenge.title)
                        .font(.headline)
                }
                
                Spacer()
                
                Image(systemName: categoryIcon)
                    .font(.title2)
                    .foregroundColor(.orange)
            }
            
            // Description
            if let description = challenge.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            // Meta Info
            HStack(spacing: 15) {
                if let duration = challenge.duration {
                    Label("\(duration) min", systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Label("\(challenge.xpReward) XP", systemImage: "star.fill")
                    .font(.caption)
                    .foregroundColor(.orange)
                
                Spacer()
                
                Text(challenge.difficulty.rawValue.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(difficultyColor.opacity(0.2))
                    .foregroundColor(difficultyColor)
                    .cornerRadius(5)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
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
        default:
            return "target"
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

struct DrillCard: View {
    let drill: Drill
    
    var body: some View {
        HStack(spacing: 15) {
            // Icon
            ZStack {
                Circle()
                    .fill(difficultyColor.opacity(0.2))
                    .frame(width: 50, height: 50)
                
                Image(systemName: categoryIcon)
                    .foregroundColor(difficultyColor)
                    .font(.title3)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 5) {
                Text(drill.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                HStack(spacing: 10) {
                    if let duration = drill.duration {
                        Label("\(duration) min", systemImage: "clock")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Label("\(drill.xpReward) XP", systemImage: "star.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                    
                    Text(drill.difficulty.rawValue.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(difficultyColor.opacity(0.2))
                        .foregroundColor(difficultyColor)
                        .cornerRadius(5)
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private var categoryIcon: String {
        switch drill.category.lowercased() {
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
        default:
            return "target"
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
}

#Preview {
    ChallengesView()
}

