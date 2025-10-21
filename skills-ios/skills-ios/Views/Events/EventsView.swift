//
//  EventsView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct EventsView: View {
    @State private var events: [TrainingEvent] = []
    @State private var registrations: [UUID: EventRegistration] = [:]
    @State private var isLoading = true
    @State private var selectedFilter = EventFilter.upcoming
    
    enum EventFilter: String, CaseIterable {
        case upcoming = "Upcoming"
        case all = "All Events"
        case myEvents = "My Events"
    }
    
    var filteredEvents: [TrainingEvent] {
        let now = Date()
        
        switch selectedFilter {
        case .upcoming:
            return events.filter { $0.eventDate >= now }.sorted { $0.eventDate < $1.eventDate }
        case .all:
            return events.sorted { $0.eventDate < $1.eventDate }
        case .myEvents:
            let registeredEventIds = Set(registrations.keys)
            return events.filter { registeredEventIds.contains($0.id) }.sorted { $0.eventDate < $1.eventDate }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Picker
                Picker("Filter", selection: $selectedFilter) {
                    ForEach(EventFilter.allCases, id: \.self) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredEvents.isEmpty {
                    VStack(spacing: 15) {
                        Image(systemName: "calendar.badge.exclamationmark")
                            .font(.system(size: 50))
                            .foregroundColor(.secondary)
                        Text("No events found")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 15) {
                            ForEach(filteredEvents) { event in
                                NavigationLink(destination: EventDetailView(event: event, registration: registrations[event.id])) {
                                    EventCard(event: event, isRegistered: registrations[event.id] != nil)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Events")
            .onAppear {
                loadData()
            }
            .refreshable {
                await loadDataAsync()
            }
        }
    }
    
    private func loadData() {
        Task {
            await loadDataAsync()
        }
    }
    
    private func loadDataAsync() async {
        do {
            events = try await APIService.shared.fetchEvents()
            let regs = try await APIService.shared.fetchUserRegistrations()
            
            var regMap: [UUID: EventRegistration] = [:]
            for reg in regs {
                regMap[reg.eventId] = reg
            }
            registrations = regMap
        } catch {
            print("Error loading events: \(error)")
        }
        isLoading = false
    }
    
    private func formatPrice(_ decimal: Decimal) -> String {
        return String(format: "%.2f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
}

struct EventCard: View {
    let event: TrainingEvent
    let isRegistered: Bool
    
    private var isPast: Bool {
        event.eventDate < Date()
    }
    
    private var isFull: Bool {
        event.registeredCount >= event.maxParticipants
    }
    
    private func formatPrice(_ decimal: Decimal) -> String {
        return String(format: "%.2f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(event.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if let category = event.category {
                        Text(category)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.orange.opacity(0.2))
                            .foregroundColor(.orange)
                            .cornerRadius(5)
                    }
                }
                
                Spacer()
                
                if isRegistered {
                    HStack(spacing: 5) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text("Registered")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.green)
                    }
                } else if isFull {
                    Text("Full")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red.opacity(0.2))
                        .foregroundColor(.red)
                        .cornerRadius(5)
                } else if isPast {
                    Text("Past")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Info
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 5) {
                    Image(systemName: "calendar")
                        .foregroundColor(.secondary)
                        .font(.caption)
                    Text(event.eventDate, style: .date)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Text("•")
                        .foregroundColor(.secondary)
                    Text(event.eventDate, style: .time)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }
                
                HStack(spacing: 5) {
                    Image(systemName: "location.fill")
                        .foregroundColor(.secondary)
                        .font(.caption)
                    Text(event.location)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }
                
                HStack(spacing: 15) {
                    HStack(spacing: 5) {
                        Image(systemName: "person.3.fill")
                            .foregroundColor(.secondary)
                            .font(.caption)
                        Text("\(event.registeredCount)/\(event.maxParticipants)")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                    
                    if event.price > 0 {
                        HStack(spacing: 5) {
                            Image(systemName: "dollarsign.circle.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                            Text("$\(formatPrice(event.price))")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.green)
                        }
                    } else {
                        Text("Free")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.green.opacity(0.2))
                            .foregroundColor(.green)
                            .cornerRadius(5)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
        .opacity(isPast ? 0.6 : 1.0)
    }
}

struct EventDetailView: View {
    let event: TrainingEvent
    let registration: EventRegistration?
    
    @State private var isRegistering = false
    @State private var showError = false
    @State private var errorMessage = ""
    @Environment(\.presentationMode) var presentationMode
    
    private var isPast: Bool {
        event.eventDate < Date()
    }
    
    private var isFull: Bool {
        event.registeredCount >= event.maxParticipants
    }
    
    private var isRegistered: Bool {
        registration != nil
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Image
                Rectangle()
                    .fill(LinearGradient(
                        gradient: Gradient(colors: [.orange, .red]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(height: 200)
                    .overlay(
                        Image(systemName: "figure.basketball")
                            .font(.system(size: 60))
                            .foregroundColor(.white)
                    )
                
                VStack(alignment: .leading, spacing: 15) {
                    // Title
                    Text(event.title)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    // Meta Info
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 5) {
                            Image(systemName: "calendar")
                                .foregroundColor(.orange)
                            Text(event.eventDate, style: .date)
                            Text("at")
                                .foregroundColor(.secondary)
                            Text(event.eventDate, style: .time)
                        }
                        .font(.subheadline)
                        
                        HStack(spacing: 5) {
                            Image(systemName: "location.fill")
                                .foregroundColor(.orange)
                            Text(event.location)
                        }
                        .font(.subheadline)
                        
                        HStack(spacing: 15) {
                            HStack(spacing: 5) {
                                Image(systemName: "person.3.fill")
                                    .foregroundColor(.orange)
                                Text("\(event.registeredCount) / \(event.maxParticipants) participants")
                            }
                            .font(.subheadline)
                        }
                    }
                    
                    Divider()
                    
                    // Description
                    if let description = event.description {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("About")
                                .font(.headline)
                            Text(description)
                                .font(.body)
                                .foregroundColor(.primary)
                        }
                    }
                    
                    // Difficulty
                    if let difficulty = event.difficulty {
                        HStack {
                            Text("Difficulty:")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            Text(difficulty.rawValue.capitalized)
                                .font(.subheadline)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 5)
                                .background(difficultyColor.opacity(0.2))
                                .foregroundColor(difficultyColor)
                                .cornerRadius(5)
                        }
                    }
                    
                    // Price
                    HStack {
                        Text("Price:")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        if event.price > 0 {
                            Text("$\(formatEventPrice(event.price))")
                                .font(.headline)
                                .foregroundColor(.green)
                        } else {
                            Text("Free")
                                .font(.headline)
                                .foregroundColor(.green)
                        }
                    }
                    
                    // Registration Button
                    if isRegistered {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                            Text("You're registered for this event")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .foregroundColor(.green)
                        .cornerRadius(10)
                    } else if isPast {
                        Text("This event has passed")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray5))
                            .foregroundColor(.secondary)
                            .cornerRadius(10)
                    } else if isFull {
                        Text("Event is Full")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray5))
                            .foregroundColor(.secondary)
                            .cornerRadius(10)
                    } else {
                        Button(action: registerForEvent) {
                            if isRegistering {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                HStack {
                                    Text(event.price > 0 ? "Register ($\(formatEventPrice(event.price)))" : "Register (Free)")
                                        .fontWeight(.semibold)
                                    Spacer()
                                    Image(systemName: "arrow.right.circle.fill")
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .disabled(isRegistering)
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .alert("Registration Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }
    
    private var difficultyColor: Color {
        guard let difficulty = event.difficulty else { return .gray }
        switch difficulty {
        case .beginner:
            return .green
        case .intermediate:
            return .orange
        case .advanced:
            return .red
        }
    }
    
    private func registerForEvent() {
        isRegistering = true
        Task {
            do {
                if event.price > 0 {
                    // For paid events, would integrate Stripe here
                    // For now, show a message
                    errorMessage = "Payment integration coming soon. For now, free events only."
                    showError = true
                } else {
                    try await APIService.shared.registerForEvent(eventId: event.id)
                    presentationMode.wrappedValue.dismiss()
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
            isRegistering = false
        }
    }
    
    private func formatEventPrice(_ decimal: Decimal) -> String {
        return String(format: "%.2f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
}

#Preview {
    EventsView()
}

