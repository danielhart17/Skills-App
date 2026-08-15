//
//  HomeView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct HomeView: View {
    @StateObject private var authService = AuthService.shared
    @State private var sessions: [ShootingSession] = []
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Welcome Header
                    HStack {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Welcome back,")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text(authService.currentUser?.fullName ?? "Player")
                                .font(.title)
                                .fontWeight(.bold)
                        }
                        Spacer()
                        
                        Button(action: {
                            Task {
                                try? await authService.signOut()
                            }
                        }) {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .font(.title2)
                                .foregroundColor(.orange)
                        }
                    }
                    .padding()
                    
                    // Stats Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
                        StatCard(
                            title: "Level",
                            value: "\(authService.currentUser?.currentLevel ?? 1)",
                            icon: "star.fill",
                            color: .orange
                        )
                        
                        StatCard(
                            title: "Total XP",
                            value: "\(authService.currentUser?.totalXp ?? 0)",
                            icon: "bolt.fill",
                            color: .yellow
                        )
                        
                        StatCard(
                            title: "Streak",
                            value: "\(authService.currentUser?.currentStreak ?? 0) days",
                            icon: "flame.fill",
                            color: .red
                        )
                        
                        StatCard(
                            title: "Best Streak",
                            value: "\(authService.currentUser?.longestStreak ?? 0) days",
                            icon: "trophy.fill",
                            color: .purple
                        )
                    }
                    .padding(.horizontal)
                    
                    // Quick Actions
                    VStack(alignment: .leading, spacing: 15) {
                        Text("Quick Actions")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 15) {
                                NavigationLink(destination: IQModeView()) {
                                    QuickActionCard(
                                        title: "IQ Mode",
                                        icon: "brain.head.profile",
                                        color: .blue
                                    )
                                }
                                
                                NavigationLink(destination: ShootingSessionView()) {
                                    QuickActionCard(
                                        title: "Shooting",
                                        icon: "basketball.fill",
                                        color: .orange
                                    )
                                }
                                
                                NavigationLink(destination: ChallengesView()) {
                                    QuickActionCard(
                                        title: "Workouts",
                                        icon: "target",
                                        color: .green
                                    )
                                }
                                
                                NavigationLink(destination: TrainersView()) {
                                    QuickActionCard(
                                        title: "Trainers",
                                        icon: "person.3.fill",
                                        color: .purple
                                    )
                                }
                            }
                            .padding(.horizontal)
                        }
                    }
                    
                    // Recent Activity
                    if !sessions.isEmpty {
                        VStack(alignment: .leading, spacing: 15) {
                            Text("Recent Sessions")
                                .font(.headline)
                                .padding(.horizontal)
                            
                            ForEach(sessions.prefix(3)) { session in
                                RecentSessionCard(session: session)
                                    .padding(.horizontal)
                            }
                        }
                    }
                }
                .padding(.vertical)
            }
            .navigationBarHidden(true)
            .onAppear {
                loadData()
            }
        }
    }
    
    private func loadData() {
        Task {
            do {
                sessions = try await APIService.shared.fetchUserShootingSessions()
            } catch {
                print("Error loading sessions: \(error)")
            }
            isLoading = false
        }
    }
    
    private func formatPercentage(_ decimal: Decimal) -> String {
        return String(format: "%.0f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)
            
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct QuickActionCard: View {
    let title: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title)
                .foregroundColor(color)
            
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.primary)
        }
        .frame(width: 100, height: 100)
        .background(color.opacity(0.1))
        .cornerRadius(15)
    }
}

struct RecentSessionCard: View {
    let session: ShootingSession
    
    private func formatPercentage(_ decimal: Decimal) -> String {
        return String(format: "%.0f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 5) {
                Text("Shooting Session")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(session.date, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 5) {
                Text("\(session.madeShots)/\(session.totalShots)")
                    .font(.headline)
                
                Text("\(formatPercentage(session.shootingPercentage))%")
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

#Preview {
    HomeView()
}

