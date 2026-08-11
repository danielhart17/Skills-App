//
//  TrainerAthletesView.swift
//  skills-ios
//
//  Trainer's athlete roster: connections, streaks, last check-in, quick actions.
//  Keys on auth.users ids (currentUser.id) — NOT User.trainerId.
//

import SwiftUI

struct TrainerAthletesView: View {
    @StateObject private var authService = AuthService.shared
    @StateObject private var unreadStore = UnreadCountStore.shared
    @State private var roster: [RosterEntry] = []
    @State private var isLoading = true

    struct RosterEntry: Identifiable {
        let id: UUID  // athlete auth id
        let profile: PublicProfile
        let streak: AthleteStreak?
        let lastCheckin: DailyCheckin?
        let conversation: Conversation?
    }

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if roster.isEmpty {
                    VStack(spacing: 15) {
                        Image(systemName: "person.2")
                            .font(.system(size: 50))
                            .foregroundColor(.textSecondary)
                        Text("No athletes yet")
                            .font(.headline)
                            .foregroundColor(.textSecondary)
                        Text("Athletes appear here once a connection is active.")
                            .font(.caption)
                            .foregroundColor(.textMuted)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(roster) { entry in
                                AthleteRosterCard(
                                    entry: entry,
                                    unreadCount: entry.conversation.flatMap { unreadStore.byConversation[$0.id] } ?? 0
                                )
                            }
                        }
                        .padding()
                    }
                }
            }
            .background(Color.appBackground)
            .navigationTitle("Athletes")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await load()
            }
            .refreshable {
                await load()
            }
        }
    }

    private func load() async {
        guard let trainerId = authService.currentUser?.id else { return }
        do {
            let connections = try await APIService.shared.fetchActiveConnections(userId: trainerId, isTrainer: true)
            let profiles = try await APIService.shared.fetchProfiles(ids: connections.map(\.athleteId))
            let profileById = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })

            var entries: [RosterEntry] = []
            for connection in connections {
                guard let profile = profileById[connection.athleteId] else { continue }
                // Trainer RLS grants read-only on connected athletes' streaks/check-ins.
                let streaks: [AthleteStreak] = (try? await SupabaseClient.shared.select(
                    from: "athlete_streaks",
                    filter: "athlete_id=eq.\(connection.athleteId.uuidString)"
                )) ?? []
                let checkins: [DailyCheckin] = (try? await SupabaseClient.shared.select(
                    from: "daily_checkins",
                    filter: "athlete_id=eq.\(connection.athleteId.uuidString)",
                    order: "check_in_date.desc",
                    limit: 1
                )) ?? []
                let conversation = try? await APIService.shared.getOrCreateConversation(
                    trainerId: trainerId,
                    athleteId: connection.athleteId
                )
                entries.append(RosterEntry(
                    id: connection.athleteId,
                    profile: profile,
                    streak: streaks.first,
                    lastCheckin: checkins.first,
                    conversation: conversation
                ))
            }
            roster = entries.sorted {
                ($0.conversation?.lastMessageAt ?? .distantPast) > ($1.conversation?.lastMessageAt ?? .distantPast)
            }
            await unreadStore.refresh()
        } catch {
            print("Error loading roster: \(error)")
        }
        isLoading = false
    }
}

struct AthleteRosterCard: View {
    let entry: TrainerAthletesView.RosterEntry
    let unreadCount: Int

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                if let avatarUrl = entry.profile.avatarUrl, !avatarUrl.isEmpty {
                    AsyncImage(url: URL(string: avatarUrl)) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Circle().fill(Color.brandOrange.opacity(0.3))
                    }
                    .frame(width: 50, height: 50)
                    .clipShape(Circle())
                } else {
                    Circle()
                        .fill(Color.brandOrange.opacity(0.3))
                        .frame(width: 50, height: 50)
                        .overlay(
                            Text(String(entry.profile.displayName.prefix(1)))
                                .font(.headline)
                                .foregroundColor(.brandOrange)
                        )
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(entry.profile.displayName)
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    HStack(spacing: 10) {
                        Label("\(entry.streak?.currentStreak ?? 0)", systemImage: "flame.fill")
                            .foregroundColor(.brandOrange)
                        Text(entry.streak?.level ?? "Rookie")
                            .foregroundColor(.warningYellow)
                        if let checkin = entry.lastCheckin {
                            Text("Last: \(checkin.checkInDate) (\(checkin.status))")
                                .foregroundColor(.textSecondary)
                        } else {
                            Text("No check-ins")
                                .foregroundColor(.textMuted)
                        }
                    }
                    .font(.caption)
                }

                Spacer()

                if unreadCount > 0 {
                    Text("\(unreadCount)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.brandOrange)
                        .clipShape(Capsule())
                }
            }

            HStack(spacing: 10) {
                NavigationLink {
                    ConversationLoaderView(otherProfile: entry.profile)
                } label: {
                    Label("Message", systemImage: "message.fill")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(10)
                        .background(Color.brandOrange)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }

                NavigationLink {
                    ConversationLoaderView(otherProfile: entry.profile, openWorkoutBuilder: true)
                } label: {
                    Label("Send Workout", systemImage: "dumbbell.fill")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(10)
                        .background(Color.cardBackgroundHover)
                        .foregroundColor(.brandOrange)
                        .cornerRadius(10)
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}
