//
//  ConversationsListView.swift
//  skills-ios
//
//  Conversation list for trainers and athletes, with polling.
//

import SwiftUI
import Combine

/// App-wide unread count for the Messages tab badge. Polls every 30s.
@MainActor
final class UnreadCountStore: ObservableObject {
    static let shared = UnreadCountStore()
    @Published var total = 0
    @Published var byConversation: [UUID: Int] = [:]

    private init() {}

    func refresh() async {
        guard let userId = AuthService.shared.currentUser?.id else {
            total = 0
            byConversation = [:]
            return
        }
        guard let rows = try? await APIService.shared.fetchUnreadMessages(receiverId: userId) else { return }
        total = rows.count
        byConversation = Dictionary(grouping: rows, by: \.conversationId).mapValues(\.count)
    }
}

struct ConversationsListView: View {
    @StateObject private var authService = AuthService.shared
    @StateObject private var unreadStore = UnreadCountStore.shared
    @State private var connections: [TrainerAthleteConnection] = []
    @State private var profiles: [UUID: PublicProfile] = [:]
    @State private var conversations: [UUID: Conversation] = [:]  // keyed by other party's id
    @State private var isLoading = true

    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if connections.isEmpty {
                    VStack(spacing: 15) {
                        Image(systemName: "message")
                            .font(.system(size: 50))
                            .foregroundColor(.textSecondary)
                        Text(authService.isTrainer()
                             ? "No athletes connected yet"
                             : "No trainer connected yet")
                            .font(.headline)
                            .foregroundColor(.textSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(connections) { connection in
                                let otherId = otherPartyId(connection)
                                if let profile = profiles[otherId] {
                                    NavigationLink {
                                        ConversationLoaderView(otherProfile: profile)
                                    } label: {
                                        ConversationRow(
                                            profile: profile,
                                            conversation: conversations[otherId],
                                            unreadCount: conversations[otherId].flatMap { unreadStore.byConversation[$0.id] } ?? 0
                                        )
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .background(Color.appBackground)
            .navigationTitle("Messages")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                while !Task.isCancelled {
                    await load()
                    try? await Task.sleep(for: .seconds(30))
                }
            }
            .refreshable {
                await load()
            }
        }
    }

    private func otherPartyId(_ connection: TrainerAthleteConnection) -> UUID {
        authService.isTrainer() ? connection.athleteId : connection.trainerId
    }

    private func load() async {
        guard let userId = authService.currentUser?.id else { return }
        do {
            let fetched = try await APIService.shared.fetchActiveConnections(
                userId: userId,
                isTrainer: authService.isTrainer()
            )
            connections = fetched.sorted { first, second in
                let firstDate = conversations[otherPartyId(first)]?.lastMessageAt ?? .distantPast
                let secondDate = conversations[otherPartyId(second)]?.lastMessageAt ?? .distantPast
                return firstDate > secondDate
            }

            let otherIds = fetched.map(otherPartyId)
            let fetchedProfiles = try await APIService.shared.fetchProfiles(ids: otherIds)
            profiles = Dictionary(uniqueKeysWithValues: fetchedProfiles.map { ($0.id, $0) })

            for connection in fetched {
                let conversation = try await APIService.shared.getOrCreateConversation(
                    trainerId: connection.trainerId,
                    athleteId: connection.athleteId
                )
                conversations[otherPartyId(connection)] = conversation
            }
            await unreadStore.refresh()
        } catch {
            print("Error loading conversations: \(error)")
        }
        isLoading = false
    }
}

/// Resolves the conversation for the other party, then shows it.
struct ConversationLoaderView: View {
    let otherProfile: PublicProfile
    var openWorkoutBuilder = false
    @StateObject private var authService = AuthService.shared
    @State private var conversation: Conversation?

    var body: some View {
        Group {
            if let conversation {
                ConversationView(
                    conversation: conversation,
                    otherProfile: otherProfile,
                    openWorkoutBuilder: openWorkoutBuilder
                )
            } else {
                ProgressView()
                    .task {
                        guard let me = authService.currentUser?.id else { return }
                        let trainerId = authService.isTrainer() ? me : otherProfile.id
                        let athleteId = authService.isTrainer() ? otherProfile.id : me
                        conversation = try? await APIService.shared.getOrCreateConversation(
                            trainerId: trainerId,
                            athleteId: athleteId
                        )
                    }
            }
        }
    }
}

struct ConversationRow: View {
    let profile: PublicProfile
    let conversation: Conversation?
    let unreadCount: Int

    var body: some View {
        HStack(spacing: 12) {
            if let avatarUrl = profile.avatarUrl, !avatarUrl.isEmpty {
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
                        Text(String(profile.displayName.prefix(1)))
                            .font(.headline)
                            .foregroundColor(.brandOrange)
                    )
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(profile.displayName)
                    .font(.headline)
                    .foregroundColor(.textPrimary)
                if let lastMessageAt = conversation?.lastMessageAt {
                    Text(lastMessageAt, style: .relative)
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
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

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.textMuted)
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}
