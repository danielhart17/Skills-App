//
//  NotificationsView.swift
//  skills-ios
//
//  Consumes rows from the notifications table (trainer workout fan-outs etc.).
//

import SwiftUI

struct NotificationsView: View {
    @State private var notifications: [AppNotification] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if notifications.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "bell.slash")
                        .font(.system(size: 40))
                        .foregroundColor(.textSecondary)
                    Text("No notifications")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(notifications) { notification in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            if notification.readAt == nil {
                                Circle()
                                    .fill(Color.brandOrange)
                                    .frame(width: 8, height: 8)
                            }
                            Text(notification.title)
                                .font(.subheadline)
                                .fontWeight(notification.readAt == nil ? .semibold : .regular)
                                .foregroundColor(.textPrimary)
                            Spacer()
                            Text(notification.createdAt, format: .relative(presentation: .named))
                                .font(.caption2)
                                .foregroundColor(.textMuted)
                        }
                        if let body = notification.body, !body.isEmpty {
                            Text(body)
                                .font(.caption)
                                .foregroundColor(.textSecondary)
                        }
                    }
                    .listRowBackground(Color.cardBackground)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        markRead(notification)
                    }
                }
                .listStyle(.plain)
            }
        }
        .background(Color.appBackground)
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await load()
        }
        .refreshable {
            await load()
        }
    }

    private func load() async {
        notifications = (try? await APIService.shared.fetchNotifications()) ?? []
        isLoading = false
    }

    private func markRead(_ notification: AppNotification) {
        guard notification.readAt == nil else { return }
        Task {
            try? await APIService.shared.markNotificationRead(id: notification.id)
            if let index = notifications.firstIndex(where: { $0.id == notification.id }) {
                notifications[index].readAt = Date()
            }
        }
    }
}
