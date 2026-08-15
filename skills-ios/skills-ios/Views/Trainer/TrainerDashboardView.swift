//
//  TrainerDashboardView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct TrainerDashboardView: View {
    @StateObject private var authService = AuthService.shared
    @State private var selectedTab = 0
    @State private var bookings: [Booking] = []
    @State private var challenges: [Challenge] = []
    @State private var services: [TrainerService] = []
    @State private var isLoading = true
    @State private var trainer: Trainer? = nil
    @State private var sessionSheetService: TrainerService? = nil
    @State private var showNewSessionSheet = false
    @State private var stripeOnboardingURL: URL? = nil
    @State private var stripeError: String? = nil
    @State private var isOnboarding = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                if let trainer = trainer {
                    StripePaymentsCard(
                        trainer: trainer,
                        isLoading: isOnboarding,
                        onSetupTap: startStripeOnboarding
                    )
                    .padding(.horizontal)
                    .padding(.top)
                }

                Picker("", selection: $selectedTab) {
                    Text("Overview").tag(0)
                    Text("Bookings").tag(1)
                    Text("Sessions").tag(2)
                    Text("Challenges").tag(3)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()

                TabView(selection: $selectedTab) {
                    TrainerOverviewView(bookings: bookings)
                        .tag(0)

                    TrainerBookingsView(bookings: bookings)
                        .tag(1)

                    TrainerSessionsView(
                        services: services,
                        onAdd: { showNewSessionSheet = true },
                        onEdit: { sessionSheetService = $0 }
                    )
                    .tag(2)

                    TrainerChallengesView(challenges: challenges)
                        .tag(3)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            }
            .navigationTitle("Trainer Dashboard")
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
            .sheet(isPresented: $showNewSessionSheet) {
                TrainerSessionSheet { saved in
                    services.append(saved)
                }
            }
            .sheet(item: $sessionSheetService) { service in
                TrainerSessionSheet(existing: service) { saved in
                    if let index = services.firstIndex(where: { $0.id == saved.id }) {
                        services[index] = saved
                    }
                }
            }
            .sheet(isPresented: Binding(
                get: { stripeOnboardingURL != nil },
                set: { if !$0 { handleOnboardingDismissed() } }
            )) {
                if let url = stripeOnboardingURL {
                    SafariView(url: url)
                        .ignoresSafeArea()
                }
            }
            .alert("Stripe Setup", isPresented: Binding(
                get: { stripeError != nil },
                set: { if !$0 { stripeError = nil } }
            )) {
                Button("OK") { stripeError = nil }
            } message: {
                Text(stripeError ?? "")
            }
        }
    }

    private func loadData() {
        Task {
            await refreshTrainer()
            isLoading = false
        }
    }

    private func refreshTrainer() async {
        guard let trainerId = authService.currentUser?.trainerId else { return }
        do {
            trainer = try await APIService.shared.fetchTrainer(id: trainerId)
            services = try await APIService.shared.fetchTrainerServices(trainerId: trainerId)
        } catch {
            print("Error fetching trainer: \(error)")
        }
    }

    private func startStripeOnboarding() {
        guard let trainerId = authService.currentUser?.trainerId else {
            stripeError = "No trainer profile found for this account."
            return
        }

        isOnboarding = true
        Task {
            do {
                let response = try await StripeService.shared.createConnectAccount(trainerId: trainerId)
                guard let url = URL(string: response.url) else {
                    stripeError = "Stripe returned an invalid onboarding URL."
                    isOnboarding = false
                    return
                }
                stripeOnboardingURL = url
                isOnboarding = false
            } catch {
                stripeError = "Could not start Stripe onboarding: \(error.localizedDescription)"
                isOnboarding = false
            }
        }
    }

    private func handleOnboardingDismissed() {
        stripeOnboardingURL = nil
        Task { await refreshTrainer() }
    }
}

struct StripePaymentsCard: View {
    let trainer: Trainer
    let isLoading: Bool
    let onSetupTap: () -> Void

    private var status: (title: String, subtitle: String, color: Color, ctaLabel: String) {
        if trainer.canAcceptPayments {
            return (
                "Payments Active",
                "You can accept bookings and receive payouts.",
                .green,
                "Manage Stripe Account"
            )
        }
        if trainer.stripeAccountId?.isEmpty == false {
            return (
                "Finish Stripe Setup",
                "Your Stripe account is created — complete onboarding to start accepting payments.",
                .orange,
                "Continue Setup"
            )
        }
        return (
            "Set Up Payments",
            "Connect a Stripe account to accept bookings (15% platform fee).",
            .blue,
            "Set Up Stripe"
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: trainer.canAcceptPayments ? "checkmark.seal.fill" : "creditcard.fill")
                    .foregroundColor(status.color)
                    .font(.title3)
                Text(status.title)
                    .font(.headline)
                Spacer()
            }

            Text(status.subtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)

            Button(action: onSetupTap) {
                HStack {
                    if isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text(status.ctaLabel)
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(status.color)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
            .disabled(isLoading)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
}

struct TrainerOverviewView: View {
    let bookings: [Booking]
    
    private var upcomingBookings: [Booking] {
        bookings.filter { $0.bookingDatetime >= Date() }
            .sorted { $0.bookingDatetime < $1.bookingDatetime }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Stats
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
                    TrainerStatCard(
                        title: "Total Bookings",
                        value: "\(bookings.count)",
                        icon: "calendar",
                        color: .blue
                    )
                    
                    TrainerStatCard(
                        title: "Upcoming",
                        value: "\(upcomingBookings.count)",
                        icon: "clock",
                        color: .orange
                    )
                    
                    TrainerStatCard(
                        title: "Revenue",
                        value: "$0",
                        icon: "dollarsign.circle",
                        color: .green
                    )
                    
                    TrainerStatCard(
                        title: "Rating",
                        value: "4.8",
                        icon: "star.fill",
                        color: .yellow
                    )
                }
                .padding()
                
                // Upcoming Sessions
                VStack(alignment: .leading, spacing: 15) {
                    Text("Upcoming Sessions")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    if upcomingBookings.isEmpty {
                        Text("No upcoming bookings")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        ForEach(upcomingBookings.prefix(5)) { booking in
                            BookingRow(booking: booking)
                                .padding(.horizontal)
                        }
                    }
                }
                
                // Quick Actions
                VStack(alignment: .leading, spacing: 15) {
                    Text("Quick Actions")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    VStack(spacing: 10) {
                        TrainerActionButton(
                            title: "Create Challenge",
                            icon: "plus.circle.fill",
                            color: .orange
                        ) {}
                        
                        TrainerActionButton(
                            title: "View Profile",
                            icon: "person.circle.fill",
                            color: .blue
                        ) {}
                        
                        TrainerActionButton(
                            title: "Edit Services",
                            icon: "pencil.circle.fill",
                            color: .green
                        ) {}
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
    }
}

struct TrainerBookingsView: View {
    let bookings: [Booking]
    
    var body: some View {
        ScrollView {
            if bookings.isEmpty {
                VStack(spacing: 15) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 50))
                        .foregroundColor(.secondary)
                    Text("No bookings yet")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: 300)
            } else {
                LazyVStack(spacing: 15) {
                    ForEach(bookings) { booking in
                        BookingRow(booking: booking)
                    }
                }
                .padding()
            }
        }
    }
}

struct TrainerSessionsView: View {
    let services: [TrainerService]
    var onAdd: () -> Void
    var onEdit: (TrainerService) -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Button(action: onAdd) {
                    Label("New Session", systemImage: "plus.circle.fill")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.brandOrange)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                }

                if services.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "calendar.badge.plus")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No sessions yet")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 40)
                } else {
                    ForEach(services) { service in
                        Button {
                            onEdit(service)
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    Text(service.name)
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Spacer()
                                    Text("$\(NSDecimalNumber(decimal: service.price).stringValue)")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.brandOrange)
                                }
                                HStack(spacing: 8) {
                                    if service.isRecurring == true {
                                        Label(
                                            (service.recurrenceDays ?? []).map { $0.prefix(3).capitalized }.joined(separator: " "),
                                            systemImage: "repeat"
                                        )
                                    } else if let date = service.sessionDate {
                                        Label(date, systemImage: "calendar")
                                    }
                                    if let time = service.startTime {
                                        Text(String(time.prefix(5)))
                                    }
                                    if let level = service.skillLevel, level != "all_levels" {
                                        Text(level.capitalized)
                                            .foregroundColor(.brandOrange)
                                    }
                                }
                                .font(.caption)
                                .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(10)
                        }
                    }
                }
            }
            .padding()
        }
    }
}

struct TrainerChallengesView: View {
    let challenges: [Challenge]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 15) {
                // Header
                HStack {
                    Text("My Challenges")
                        .font(.headline)
                    Spacer()
                    Button(action: {}) {
                        HStack {
                            Image(systemName: "plus")
                            Text("Create")
                        }
                        .font(.subheadline)
                        .foregroundColor(.orange)
                    }
                }
                .padding(.horizontal)
                
                if challenges.isEmpty {
                    VStack(spacing: 15) {
                        Image(systemName: "target")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("No challenges created")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        Text("Create challenges for your students")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: 300)
                } else {
                    LazyVStack(spacing: 15) {
                        ForEach(challenges) { challenge in
                            ChallengeCard(challenge: challenge)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical)
        }
    }
}

struct TrainerStatCard: View {
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

struct BookingRow: View {
    let booking: Booking
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 5) {
                Text("Session")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(booking.bookingDatetime, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 5) {
                Text(booking.bookingDatetime, style: .time)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Text(booking.status.displayName)
                    .font(.caption)
                    .foregroundColor(statusColor)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }

    private var statusColor: Color {
        switch booking.status {
        case .confirmed:
            return .green
        case .pending, .pendingPayment:
            return .orange
        case .completed:
            return .blue
        case .cancelled:
            return .red
        }
    }
}

struct TrainerActionButton: View {
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
    TrainerDashboardView()
}

