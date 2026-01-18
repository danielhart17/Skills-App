//
//  ProfileView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct ProfileView: View {
    @StateObject private var authService = AuthService.shared
    @State private var sessions: [ShootingSession] = []
    @State private var bookings: [Booking] = []
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Profile Header
                    VStack(spacing: 15) {
                        // Avatar
                        ZStack {
                            Circle()
                                .fill(Color.orange.opacity(0.2))
                                .frame(width: 100, height: 100)
                            
                            Image(systemName: "person.fill")
                                .foregroundColor(.orange)
                                .font(.system(size: 50))
                        }
                        
                        // Name
                        Text(authService.currentUser?.fullName ?? "Player")
                            .font(.title)
                            .fontWeight(.bold)
                        
                        // Email
                        Text(authService.currentUser?.email ?? "")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        // Level Badge
                        HStack(spacing: 5) {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                            Text("Level \(authService.currentUser?.currentLevel ?? 1)")
                                .font(.headline)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.yellow.opacity(0.2))
                        .cornerRadius(20)
                    }
                    .padding()
                    
                    // Stats Grid
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
                        ProfileStatCard(
                            title: "Total XP",
                            value: "\(authService.currentUser?.totalXp ?? 0)",
                            icon: "bolt.fill",
                            color: .yellow
                        )
                        
                        ProfileStatCard(
                            title: "Current Streak",
                            value: "\(authService.currentUser?.currentStreak ?? 0) days",
                            icon: "flame.fill",
                            color: .red
                        )
                        
                        ProfileStatCard(
                            title: "Best Streak",
                            value: "\(authService.currentUser?.longestStreak ?? 0) days",
                            icon: "trophy.fill",
                            color: .purple
                        )
                        
                        ProfileStatCard(
                            title: "Sessions",
                            value: "\(sessions.count)",
                            icon: "basketball.fill",
                            color: .orange
                        )
                    }
                    .padding(.horizontal)
                    
                    // Shooting Stats
                    if !sessions.isEmpty {
                        VStack(alignment: .leading, spacing: 15) {
                            Text("Shooting Stats")
                                .font(.headline)
                                .padding(.horizontal)
                            
                            VStack(spacing: 10) {
                                StatRow(
                                    label: "Total Shots",
                                    value: "\(totalShots)"
                                )
                                
                                StatRow(
                                    label: "Made Shots",
                                    value: "\(madeShots)"
                                )
                                
                                StatRow(
                                    label: "Shooting %",
                                    value: "\(averagePercentage)%"
                                )
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(10)
                            .padding(.horizontal)
                        }
                    }
                    
                    // Recent Sessions
                    if !sessions.isEmpty {
                        VStack(alignment: .leading, spacing: 15) {
                            Text("Recent Sessions")
                                .font(.headline)
                                .padding(.horizontal)
                            
                            ForEach(sessions.prefix(5)) { session in
                                SessionRow(session: session)
                                    .padding(.horizontal)
                            }
                        }
                    }
                    
                    // Sign Out Button
                    Button(action: signOut) {
                        HStack {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign Out")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .padding()
                }
                .padding(.vertical)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: handleSignOut) {
                        HStack(spacing: 4) {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Sign Out")
                        }
                        .foregroundColor(.red)
                    }
                }
            }
            .onAppear {
                loadData()
            }
        }
    }
    
    private func handleSignOut() {
        Task {
            do {
                try await AuthService.shared.signOut()
            } catch {
                print("Error signing out: \(error)")
            }
        }
    }
    
    private var totalShots: Int {
        sessions.reduce(0) { $0 + $1.totalShots }
    }
    
    private var madeShots: Int {
        sessions.reduce(0) { $0 + $1.madeShots }
    }
    
    private var averagePercentage: Int {
        guard totalShots > 0 else { return 0 }
        return Int((Double(madeShots) / Double(totalShots)) * 100)
    }
    
    private func loadData() {
        Task {
            do {
                sessions = try await APIService.shared.fetchUserShootingSessions()
            } catch {
                print("Error loading data: \(error)")
            }
            isLoading = false
        }
    }
    
    private func signOut() {
        Task {
            try? await authService.signOut()
        }
    }
    
    private func formatPercentage(_ decimal: Decimal) -> String {
        return String(format: "%.0f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
}

struct ProfileStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
            
            Text(value)
                .font(.headline)
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

private struct StatRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
    }
}

private struct SessionRow: View {
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
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
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
    ProfileView()
}

