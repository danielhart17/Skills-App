//
//  TrainerDetailView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct TrainerDetailView: View {
    let trainer: Trainer
    @State private var services: [TrainerService] = []
    @State private var isLoading = true
    @State private var showingBooking = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(spacing: 15) {
                    // Avatar
                    ZStack {
                        Circle()
                            .fill(Color.orange.opacity(0.2))
                            .frame(width: 120, height: 120)
                        
                        if let avatarUrl = trainer.avatarUrl, let url = URL(string: avatarUrl) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Image(systemName: "person.fill")
                                    .foregroundColor(.orange)
                                    .font(.system(size: 50))
                            }
                            .frame(width: 120, height: 120)
                            .clipShape(Circle())
                        } else {
                            Image(systemName: "person.fill")
                                .foregroundColor(.orange)
                                .font(.system(size: 50))
                        }
                    }
                    
                    // Name
                    Text(trainer.name)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    // Rating
                    HStack(spacing: 5) {
                        ForEach(0..<5) { index in
                            Image(systemName: index < Int(NSDecimalNumber(decimal: trainer.rating).doubleValue) ? "star.fill" : "star")
                                .foregroundColor(.yellow)
                        }
                        Text(String(format: "%.1f", NSDecimalNumber(decimal: trainer.rating).doubleValue))
                            .font(.subheadline)
                        Text("(\(trainer.totalReviews) reviews)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // Location
                    if let location = trainer.location {
                        Label(location, systemImage: "location.fill")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                
                VStack(alignment: .leading, spacing: 15) {
                    // Bio
                    if let bio = trainer.bio {
                        VStack(alignment: .leading, spacing: 5) {
                            Text("About")
                                .font(.headline)
                            Text(bio)
                                .font(.body)
                                .foregroundColor(.primary)
                        }
                    }
                    
                    // Experience
                    if let years = trainer.yearsExperience {
                        HStack {
                            Image(systemName: "calendar")
                                .foregroundColor(.orange)
                            Text("\(years) years of experience")
                                .font(.subheadline)
                        }
                    }
                    
                    // Specializations
                    if !trainer.specialization.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Specializations")
                                .font(.headline)
                            
                            FlowLayout(spacing: 10) {
                                ForEach(trainer.specialization, id: \.self) { spec in
                                    Text(spec)
                                        .font(.caption)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.orange.opacity(0.2))
                                        .foregroundColor(.orange)
                                        .cornerRadius(15)
                                }
                            }
                        }
                    }
                    
                    // Certifications
                    if let certifications = trainer.certifications, !certifications.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Certifications")
                                .font(.headline)
                            
                            ForEach(certifications, id: \.self) { cert in
                                HStack {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundColor(.blue)
                                    Text(cert)
                                        .font(.subheadline)
                                }
                            }
                        }
                    }
                    
                    Divider()
                    
                    // Services
                    Text("Services")
                        .font(.headline)
                    
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        ForEach(services) { service in
                            ServiceCard(service: service)
                        }
                    }
                    
                    // Book Button
                    Button(action: { showingBooking = true }) {
                        HStack {
                            Text("Book Session")
                                .fontWeight(.semibold)
                            Spacer()
                            Image(systemName: "calendar.badge.plus")
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadServices()
        }
        .sheet(isPresented: $showingBooking) {
            BookingView(trainer: trainer, services: services)
        }
    }
    
    private func loadServices() {
        Task {
            do {
                services = try await APIService.shared.fetchTrainerServices(trainerId: trainer.id)
            } catch {
                print("Error loading services: \(error)")
            }
            isLoading = false
        }
    }
}

struct ServiceCard: View {
    let service: TrainerService
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(service.serviceName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Spacer()
                Text("$\(formatPrice(service.price))")
                    .font(.headline)
                    .foregroundColor(.green)
            }
            
            if let description = service.description {
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Label("\(service.duration) minutes", systemImage: "clock")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
    
    private func formatPrice(_ decimal: Decimal) -> String {
        return String(format: "%.2f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 10
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.replacingUnspecifiedDimensions().width, subviews: subviews, spacing: spacing)
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []
        
        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if currentX + size.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }
                
                positions.append(CGPoint(x: currentX, y: currentY))
                lineHeight = max(lineHeight, size.height)
                currentX += size.width + spacing
            }
            
            self.size = CGSize(width: maxWidth, height: currentY + lineHeight)
        }
    }
}

struct BookingView: View {
    let trainer: Trainer
    let services: [TrainerService]
    
    @State private var selectedService: TrainerService?
    @State private var selectedDate = Date()
    @State private var notes = ""
    @State private var isSubmitting = false
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Service")) {
                    Picker("Select Service", selection: $selectedService) {
                        Text("Choose...").tag(nil as TrainerService?)
                        ForEach(services) { service in
                            Text("\(service.serviceName) - $\(formatServicePrice(service.price))").tag(service as TrainerService?)
                        }
                    }
                }
                
                if selectedService != nil {
                    Section(header: Text("Date & Time")) {
                        DatePicker("Date", selection: $selectedDate, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                    }
                    
                    Section(header: Text("Notes (Optional)")) {
                        TextEditor(text: $notes)
                            .frame(height: 100)
                    }
                    
                    Section {
                        Button(action: submitBooking) {
                            if isSubmitting {
                                HStack {
                                    Spacer()
                                    ProgressView()
                                    Spacer()
                                }
                            } else {
                                HStack {
                                    Spacer()
                                    Text("Confirm Booking")
                                        .fontWeight(.semibold)
                                    Spacer()
                                }
                            }
                        }
                        .disabled(selectedService == nil || isSubmitting)
                    }
                }
            }
            .navigationTitle("Book Session")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
    
    private func submitBooking() {
        guard let service = selectedService else { return }
        
        isSubmitting = true
        Task {
            do {
                try await APIService.shared.createBooking(
                    trainerId: trainer.id,
                    serviceId: service.id,
                    datetime: selectedDate,
                    notes: notes.isEmpty ? nil : notes,
                    price: service.price
                )
                presentationMode.wrappedValue.dismiss()
            } catch {
                print("Error creating booking: \(error)")
            }
            isSubmitting = false
        }
    }
    
    private func formatServicePrice(_ decimal: Decimal) -> String {
        return String(format: "%.2f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
}

#Preview {
    NavigationView {
        TrainerDetailView(trainer: Trainer(
            id: UUID(),
            userId: nil,
            name: "Coach Johnson",
            bio: "Professional basketball trainer with 10 years of experience.",
            specialization: ["Shooting", "Defense"],
            location: "Los Angeles, CA",
            hourlyRate: 100,
            rating: 4.8,
            totalReviews: 45,
            yearsExperience: 10,
            certifications: ["USA Basketball Certified"],
            avatarUrl: nil,
            isAvailable: true,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}

