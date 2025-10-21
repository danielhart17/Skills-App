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
            return events.filter { $0.date >= now }.sorted { $0.date < $1.date }
        case .all:
            return events.sorted { $0.date < $1.date }
        case .myEvents:
            let registeredEventIds = Set(registrations.keys)
            return events.filter { registeredEventIds.contains($0.id) }.sorted { $0.date < $1.date }
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
        return event.date < Date()
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
                    Text(event.date, style: .date)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                    Text("•")
                        .foregroundColor(.secondary)
                    Text(event.date, style: .time)
                        .font(.subheadline)
                        .foregroundColor(.primary)
                }
                
                if let location = event.location {
                    HStack(spacing: 5) {
                        Image(systemName: "location.fill")
                            .foregroundColor(.secondary)
                            .font(.caption)
                        Text(location)
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                }
                
                HStack(spacing: 15) {
                    if let spots = event.spotsAvailable {
                        HStack(spacing: 5) {
                            Image(systemName: "person.3.fill")
                                .foregroundColor(.secondary)
                                .font(.caption)
                            Text("\(spots) spots")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                    }
                    
                    if let price = event.price, price > 0 {
                        HStack(spacing: 5) {
                            Image(systemName: "dollarsign.circle.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                            Text("$\(formatPrice(price))")
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
        return event.date < Date()
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
                            Text(event.date, style: .date)
                            Text("at")
                                .foregroundColor(.secondary)
                            Text(event.date, style: .time)
                        }
                        .font(.subheadline)
                        
                        if let location = event.location {
                            HStack(spacing: 5) {
                                Image(systemName: "location.fill")
                                    .foregroundColor(.orange)
                                Text(location)
                            }
                            .font(.subheadline)
                        }
                        
                        if let spots = event.spotsAvailable {
                            HStack(spacing: 5) {
                                Image(systemName: "person.3.fill")
                                    .foregroundColor(.orange)
                                Text("\(spots) spots available")
                            }
                            .font(.subheadline)
                        }
                    }
                    
                    Divider()
                    
                    // Price
                    HStack {
                        Text("Price:")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        if let price = event.price, price > 0 {
                            Text("$\(formatEventPrice(price))")
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
                    } else {
                        Button(action: registerForEvent) {
                            if isRegistering {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                HStack {
                                    Text((event.price ?? 0) > 0 ? "Register ($\(formatEventPrice(event.price ?? 0)))" : "Register (Free)")
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
    
    private func registerForEvent() {
        isRegistering = true
        Task {
            do {
                if (event.price ?? 0) > 0 {
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

