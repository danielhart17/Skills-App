//
//  ParentDashboardView.swift
//  skills-ios
//
//  Parent home: link to an athlete by invite code, then follow their progress.
//  Mirrors the web ParentDashboard "progress" tab.
//

import SwiftUI

struct ParentDashboardView: View {
    @StateObject private var authService = AuthService.shared
    @State private var children: [LinkedChild] = []
    @State private var progressByChild: [UUID: ChildProgressSummary] = [:]
    @State private var isLoading = true
    @State private var linkCode = ""
    @State private var isLinking = false
    @State private var linkError: String?
    @State private var toastText: String?

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 16) {
                    if isLoading {
                        ProgressView()
                            .padding(.top, 60)
                    } else {
                        if children.isEmpty {
                            emptyState
                        } else {
                            ForEach(children) { child in
                                ChildProgressCard(
                                    child: child,
                                    progress: progressByChild[child.childId]
                                )
                            }
                        }
                        linkCard
                    }

                    if let toastText {
                        Text(toastText)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.successGreen)
                            .frame(maxWidth: .infinity)
                            .padding(10)
                            .background(Color.successGreen.opacity(0.1))
                            .cornerRadius(10)
                    }
                }
                .padding()
            }
            .background(Color.appBackground)
            .navigationTitle("My Athletes")
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
            .task {
                await load()
            }
            .refreshable {
                await load()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "figure.2.and.child.holdinghands")
                .font(.system(size: 44))
                .foregroundColor(.textSecondary)
            Text("No athletes linked yet")
                .font(.headline)
                .foregroundColor(.textPrimary)
            Text("Ask your athlete to open Skills, go to their profile, and generate an invite code.")
                .font(.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
    }

    private var linkCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Link an athlete", systemImage: "link")
                .font(.headline)
                .foregroundColor(.textPrimary)
            Text("Enter the 6-character invite code from your athlete's profile.")
                .font(.caption)
                .foregroundColor(.textSecondary)

            TextField("Invite code", text: $linkCode)
                .textFieldStyle(.roundedBorder)
                .autocapitalization(.allCharacters)
                .disableAutocorrection(true)
                .disabled(isLinking)

            if let linkError {
                Text(linkError)
                    .font(.caption)
                    .foregroundColor(.errorRed)
            }

            Button(action: link) {
                HStack {
                    if isLinking { ProgressView().tint(.white) }
                    Text(isLinking ? "Linking..." : "Link Athlete")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(10)
                .background(canLink ? Color.brandOrange : Color.brandOrange.opacity(0.4))
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .disabled(!canLink)
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }

    private var canLink: Bool {
        !linkCode.trimmingCharacters(in: .whitespaces).isEmpty && !isLinking
    }

    private func load() async {
        do {
            children = try await APIService.shared.fetchLinkedChildren()
            for child in children {
                progressByChild[child.childId] = try? await APIService.shared
                    .fetchChildProgress(childId: child.childId)
            }
        } catch {
            print("Error loading linked children: \(error)")
        }
        isLoading = false
    }

    private func link() {
        isLinking = true
        linkError = nil
        Task {
            do {
                try await APIService.shared.linkChild(code: linkCode)
                linkCode = ""
                await load()
                showToast("Athlete linked!")
            } catch {
                // Server messages here are user-facing (bad code, expired,
                // wrong role) — show them verbatim.
                linkError = error.localizedDescription
            }
            isLinking = false
        }
    }

    private func showToast(_ text: String) {
        toastText = text
        Task {
            try? await Task.sleep(for: .seconds(3))
            toastText = nil
        }
    }
}

struct ChildProgressCard: View {
    let child: LinkedChild
    let progress: ChildProgressSummary?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.brandOrange.opacity(0.3))
                    .frame(width: 46, height: 46)
                    .overlay(
                        Text(String(child.displayName.prefix(1)))
                            .font(.headline)
                            .foregroundColor(.brandOrange)
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(child.displayName)
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    Text("Level \(progress?.currentLevel ?? child.childLevel ?? 1)")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
                Spacer()
            }

            HStack(spacing: 10) {
                StatCard(
                    title: "Streak",
                    value: "\(progress?.currentStreak ?? child.childStreak ?? 0)",
                    icon: "flame.fill",
                    color: .brandOrange
                )
                StatCard(
                    title: "Total XP",
                    value: "\(progress?.totalXp ?? child.childXp ?? 0)",
                    icon: "star.fill",
                    color: .warningYellow
                )
                StatCard(
                    title: "Best",
                    value: "\(progress?.longestStreak ?? 0)",
                    icon: "trophy.fill",
                    color: .successGreen
                )
            }

            HStack(spacing: 10) {
                StatCard(
                    title: "Lessons",
                    value: "\(progress?.totalLessonsCompleted ?? 0)",
                    icon: "book.fill",
                    color: .infoBlue
                )
                StatCard(
                    title: "Workouts",
                    value: "\(progress?.totalChallengesCompleted ?? 0)",
                    icon: "target",
                    color: .brandBlue
                )
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}
