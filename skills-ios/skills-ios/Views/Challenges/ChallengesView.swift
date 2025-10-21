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
    
    var featuredChallenges: [Challenge] {
        challenges.filter { $0.isFeatured }
    }
    
    var regularChallenges: [Challenge] {
        challenges.filter { !$0.isFeatured }
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
                            // Featured Section
                            if !featuredChallenges.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    HStack(spacing: 8) {
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.yellow)
                                            .font(.title3)
                                        Text("Featured")
                                            .font(.title3)
                                            .fontWeight(.bold)
                                    }
                                    .padding(.horizontal)
                                    
                                    ForEach(featuredChallenges) { challenge in
                                        ChallengeCard(challenge: challenge)
                                            .padding(.horizontal)
                                    }
                                }
                            }
                            
                            // Regular Challenges
                            ForEach(regularChallenges) { challenge in
                                ChallengeCard(challenge: challenge)
                                    .padding(.horizontal)
                            }
                        }
                        .padding(.vertical)
                    }
                }
            }
            .background(Color.black)
            .navigationTitle("Challenges")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: ProfileView()) {
                        Image(systemName: "person.circle.fill")
                            .font(.title2)
                            .foregroundColor(.orange)
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

struct ChallengeCard: View {
    let challenge: Challenge
    
    var body: some View {
        HStack(spacing: 15) {
            // Content
            VStack(alignment: .leading, spacing: 12) {
                // Title
                Text(challenge.title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .lineLimit(2)
                
                // Description
                if let description = challenge.description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                // Meta Info
                HStack(spacing: 15) {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption)
                        Text("\(challenge.xpReward) XP")
                            .font(.caption)
                    }
                    .foregroundColor(.orange)
                    
                    Spacer()
                    
                    Text(challenge.difficulty.rawValue.capitalized)
                        .font(.caption)
                        .fontWeight(.medium)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(difficultyColor)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }
            }
            
            Spacer()
            
            // Icon
            Image(systemName: categoryIcon)
                .font(.system(size: 50))
                .foregroundColor(.orange)
        }
        .padding(20)
        .background(Color.gray.opacity(0.15))
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

#Preview {
    ChallengesView()
}

