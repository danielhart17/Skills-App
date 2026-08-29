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
        Task {
            async let users = try? SupabaseClient.shared.count(from: "profiles")
            async let lessons = try? SupabaseClient.shared.count(from: "lessons")
            async let challenges = try? SupabaseClient.shared.count(from: "challenges")
            async let drills = try? SupabaseClient.shared.count(from: "drills")
            async let events = try? SupabaseClient.shared.count(from: "training_events")
            async let trainers = try? SupabaseClient.shared.count(from: "trainers")

            stats = AdminStats(
                totalUsers: await users ?? 0,
                totalLessons: await lessons ?? 0,
                totalChallenges: await challenges ?? 0,
                totalDrills: await drills ?? 0,
                totalEvents: await events ?? 0,
                totalTrainers: await trainers ?? 0
            )
            isLoading = false
        }
    }
}

struct AdminContentView: View {
    @State private var selectedContentType = 0
    @State private var count = 0

    private var table: String {
        ["lessons", "challenges", "drills", "training_events"][selectedContentType]
    }

    private var label: String {
        ["Lessons", "Workouts", "Drills", "Events"][selectedContentType]
    }

    private func loadCount() async {
        count = (try? await SupabaseClient.shared.count(from: table)) ?? 0
    }

    var body: some View {
        VStack {
            Picker("", selection: $selectedContentType) {
                Text("Lessons").tag(0)
                Text("Workouts").tag(1)
                Text("Drills").tag(2)
                Text("Events").tag(3)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()
            
            ScrollView {
                VStack(spacing: 15) {
                    Text("\(count) \(label.lowercased())")
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("Content is created and edited in the web admin. This tab is read-only on mobile.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)

                    Link(destination: URL(string: Config.webAppURL)!) {
                        HStack {
                            Image(systemName: "safari.fill")
                            Text("Open Web Admin")
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
            .task(id: selectedContentType) {
                await loadCount()
            }
        }
    }
}

struct AdminUsersView: View {
    @State private var profiles: [PublicProfileWithRole] = []
    @State private var checksByUser: [UUID: BackgroundCheck] = [:]
    @State private var isLoading = true
    @State private var approving: UUID?
    @State private var errorMessage: String?

    /// Trainers first — they're the ones needing approval to be discoverable.
    private var sorted: [PublicProfileWithRole] {
        profiles.sorted { lhs, rhs in
            let lhsTrainer = lhs.role == "trainer"
            let rhsTrainer = rhs.role == "trainer"
            if lhsTrainer != rhsTrainer { return lhsTrainer }
            return lhs.displayName < rhs.displayName
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if isLoading {
                    ProgressView().padding(.top, 40)
                } else {
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                    ForEach(sorted) { profile in
                        userRow(profile)
                    }
                }
            }
            .padding()
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func userRow(_ profile: PublicProfileWithRole) -> some View {
        let check = checksByUser[profile.id]
        let isTrainer = profile.role == "trainer"
        let approved = check?.grantsDiscoverability == true

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(profile.displayName)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text(profile.role.capitalized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if isTrainer {
                    Text(approved ? "Discoverable" : (check?.status ?? "not_started").replacingOccurrences(of: "_", with: " "))
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background((approved ? Color.green : Color.orange).opacity(0.2))
                        .foregroundColor(approved ? .green : .orange)
                        .cornerRadius(8)
                }
            }

            if isTrainer && !approved {
                Button {
                    approve(profile)
                } label: {
                    HStack {
                        if approving == profile.id { ProgressView() }
                        Text("Approve for discovery")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(8)
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(approving != nil)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }

    private func load() async {
        async let profilesTask = try? APIService.shared.fetchAllProfiles()
        async let checksTask = try? APIService.shared.fetchBackgroundChecks()
        profiles = await profilesTask ?? []
        checksByUser = Dictionary(
            (await checksTask ?? []).map { ($0.userId, $0) },
            uniquingKeysWith: { first, _ in first }
        )
        isLoading = false
    }

    private func approve(_ profile: PublicProfileWithRole) {
        approving = profile.id
        errorMessage = nil
        Task {
            do {
                try await APIService.shared.approveTrainer(
                    userId: profile.id,
                    reason: "Manually vetted by admin in iOS app"
                )
                await load()
            } catch {
                errorMessage = error.localizedDescription
            }
            approving = nil
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

