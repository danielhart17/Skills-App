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
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Tab Selector
                Picker("", selection: $selectedTab) {
                    Text("Overview").tag(0)
                    Text("Bookings").tag(1)
                    Text("Challenges").tag(2)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Content
                TabView(selection: $selectedTab) {
                    TrainerOverviewView(bookings: bookings)
                        .tag(0)
                    
                    TrainerBookingsView(bookings: bookings)
                        .tag(1)
                    
                    TrainerChallengesView(challenges: challenges)
                        .tag(2)
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
        }
    }
    
    private func loadData() {
        Task {
            // In a real app, fetch trainer-specific data
            isLoading = false
        }
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
                
                Text(booking.status.rawValue.capitalized)
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
        case .pending:
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

