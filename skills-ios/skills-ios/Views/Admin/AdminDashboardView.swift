//
//  AdminDashboardView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct AdminDashboardView: View {
    @StateObject private var authService = AuthService.shared
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Selector
                Picker("", selection: $selectedTab) {
                    Text("Overview").tag(0)
                    Text("Content").tag(1)
                    Text("Users").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Content
                TabView(selection: $selectedTab) {
                    AdminOverviewView()
                        .tag(0)
                    
                    AdminContentView()
                        .tag(1)
                    
                    AdminUsersView()
                        .tag(2)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
            .navigationTitle("Admin Dashboard")
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
        }
    }
}

struct AdminOverviewView: View {
    @State private var stats: AdminStats?
    @State private var isLoading = true
    
    struct AdminStats {
        var totalUsers: Int = 0
        var totalLessons: Int = 0
        var totalChallenges: Int = 0
        var totalDrills: Int = 0
        var totalEvents: Int = 0
        var totalTrainers: Int = 0
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Quick Stats
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
                    AdminStatCard(
                        title: "Users",
                        value: "\(stats?.totalUsers ?? 0)",
                        icon: "person.3.fill",
                        color: .blue
                    )
                    
                    AdminStatCard(
                        title: "Lessons",
                        value: "\(stats?.totalLessons ?? 0)",
                        icon: "book.fill",
                        color: .green
                    )
                    
                    AdminStatCard(
                        title: "Workouts",
                        value: "\(stats?.totalChallenges ?? 0)",
                        icon: "target",
                        color: .orange
                    )
                    
                    AdminStatCard(
                        title: "Drills",
                        value: "\(stats?.totalDrills ?? 0)",
                        icon: "figure.basketball",
                        color: .purple
                    )
                    
                    AdminStatCard(
                        title: "Events",
                        value: "\(stats?.totalEvents ?? 0)",
                        icon: "calendar",
                        color: .red
                    )
                    
                    AdminStatCard(
                        title: "Trainers",
                        value: "\(stats?.totalTrainers ?? 0)",
                        icon: "person.2.fill",
                        color: .indigo
                    )
                }
                .padding()
                
                // Quick Actions
                VStack(alignment: .leading, spacing: 15) {
                    Text("Quick Actions")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    VStack(spacing: 10) {
                        AdminActionButton(
                            title: "Manage Content",
                            icon: "square.and.pencil",
                            color: .blue
                        ) {
                            // Switch to content tab
                        }
                        
                        AdminActionButton(
                            title: "View Users",
                            icon: "person.3.fill",
                            color: .green
                        ) {
                            // Switch to users tab
                        }
                        
                        AdminActionButton(
                            title: "System Settings",
                            icon: "gearshape.fill",
                            color: .orange
                        ) {
                            // Navigate to settings
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
        .onAppear {
            loadStats()
        }
    }
    
    private func loadStats() {
        // In a real app, fetch stats from API
        Task {
            // Simulate loading
            try? await Task.sleep(nanoseconds: 500_000_000)
            stats = AdminStats(
                totalUsers: 0,
                totalLessons: 0,
                totalChallenges: 0,
                totalDrills: 0,
                totalEvents: 0,
                totalTrainers: 0
            )
            isLoading = false
        }
    }
}

struct AdminContentView: View {
    @State private var selectedContentType = 0
    
    var body: some View {
        VStack {
            Picker("", selection: $selectedContentType) {
                Text("Lessons").tag(0)
                Text("Challenges").tag(1)
                Text("Drills").tag(2)
                Text("Events").tag(3)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()
            
            ScrollView {
                VStack(spacing: 15) {
                    Text("Content management UI")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Text("Create, edit, and delete content items")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    Button(action: {}) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Add New Content")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                }
                .padding()
            }
        }
    }
}

struct AdminUsersView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 15) {
                Text("User management UI")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Text("View and manage user accounts, roles, and permissions")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
        }
    }
}

struct AdminStatCard: View {
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

struct AdminActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)
                Text(title)
                    .foregroundColor(.primary)
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(10)
        }
    }
}

#Preview {
    AdminDashboardView()
}

