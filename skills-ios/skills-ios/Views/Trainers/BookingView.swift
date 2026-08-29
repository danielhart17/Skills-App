import SwiftUI

struct BookingView: View {
    let trainer: Trainer
    let service: TrainerService

    @Environment(\.presentationMode) var presentationMode
    @State private var currentStep = 1
    @State private var selectedDate = Date()
    @State private var selectedTime: Date? = nil
    @State private var userNotes = ""
    @State private var bookedTimes: [Date] = []
    @State private var isLoading = false
    @State private var showConfirmation = false
    @State private var bookingError: String? = nil
    @State private var checkoutURL: URL? = nil
    @State private var pendingBookingId: String? = nil
    @State private var paymentStatus: BookingPaymentStatus = .none

    enum BookingPaymentStatus {
        case none, awaitingPayment, paid, cancelled
    }
    
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Custom Header
                HStack {
                    Button(action: {
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "xmark")
                                .font(.system(size: 16, weight: .semibold))
                            Text("Cancel")
                                .font(.body)
                        }
                        .foregroundColor(.brandOrange)
                        .padding(.leading, 4)
                    }
                    
                    Spacer()
                    
                    Text("Book Session")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    
                    Spacer()
                    
                    // Spacer to balance the layout. Needs an explicit height —
                    // a bare Color expands to fill all available vertical space.
                    Color.clear
                        .frame(width: 80, height: 1)
                }
                .padding(.horizontal)
                .padding(.vertical, 16)
                .background(Color.cardBackground)
                
                Divider()
                    .background(Color.borderColor)
                
                if showConfirmation {
                    confirmationView
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Progress Indicator
                            progressIndicator
                                .padding(.top, 20)
                            
                            // Step Content
                            VStack(alignment: .leading, spacing: 24) {
                                // Step 1: Service Info (Always visible)
                                bookingStep(
                                    number: 1,
                                    title: "Service Selected",
                                    isActive: currentStep >= 1
                                ) {
                                    serviceInfoView
                                }
                                
                                // Step 2: Date & Time
                                bookingStep(
                                    number: 2,
                                    title: "Choose Date & Time",
                                    isActive: currentStep >= 2
                                ) {
                                    if currentStep >= 2 {
                                        dateTimeView
                                    }
                                }
                                
                                // Step 3: Notes & Confirmation
                                bookingStep(
                                    number: 3,
                                    title: "Add Notes & Confirm",
                                    isActive: currentStep >= 3
                                ) {
                                    if currentStep >= 3 {
                                        notesView
                                    }
                                }
                            }
                            .padding()
                            
                            // Booking Summary
                            if currentStep >= 1 {
                                bookingSummary
                            }
                            
                            // Navigation Buttons
                            HStack(spacing: 16) {
                                // Back Button
                                if currentStep > 1 {
                                    Button(action: {
                                        withAnimation {
                                            currentStep -= 1
                                        }
                                    }) {
                                        HStack {
                                            Image(systemName: "chevron.left")
                                            Text("Back")
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Color.cardBackground)
                                        .foregroundColor(.textPrimary)
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.borderColor, lineWidth: 1)
                                        )
                                    }
                                }
                                
                                // Next/Confirm Button
                                if currentStep < 3 {
                                    Button(action: {
                                        withAnimation {
                                            currentStep += 1
                                        }
                                    }) {
                                        HStack {
                                            Text("Next")
                                            Image(systemName: "chevron.right")
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(
                                            LinearGradient(
                                                colors: [Color.brandOrange, Color.brandOrange.opacity(0.8)],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .foregroundColor(.white)
                                        .cornerRadius(12)
                                    }
                                    .disabled(currentStep == 2 && selectedTime == nil)
                                } else if currentStep == 3 && selectedTime != nil {
                                    Button(action: confirmBooking) {
                                        HStack {
                                            if isLoading {
                                                ProgressView()
                                                    .tint(.white)
                                            } else {
                                                Image(systemName: "lock.fill")
                                                Text("Pay $\(formatCents(feeEstimate.total))")
                                                    .fontWeight(.semibold)
                                            }
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(
                                            LinearGradient(
                                                colors: [Color.green, Color.green.opacity(0.8)],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            )
                                        )
                                        .foregroundColor(.white)
                                        .cornerRadius(12)
                                    }
                                    .disabled(isLoading)
                                }
                            }
                            .padding(.horizontal)
                        }
                        .padding(.vertical)
                    }
                }
            }
        }
        .onAppear {
            print("BookingView appeared")
            print("Trainer: \(trainer.name)")
            print("Service: \(service.name)")
            loadBookedTimes()
        }
        .alert("Booking Error", isPresented: .constant(bookingError != nil)) {
            Button("OK") { bookingError = nil }
        } message: {
            Text(bookingError ?? "")
        }
        .sheet(isPresented: Binding(
            get: { checkoutURL != nil },
            set: { if !$0 { handleCheckoutDismissed() } }
        )) {
            if let url = checkoutURL {
                SafariView(url: url)
                    .ignoresSafeArea()
            }
        }
    }
    
    // MARK: - Progress Indicator
    
    private var progressIndicator: some View {
        HStack(spacing: 16) {
            ForEach(1...3, id: \.self) { step in
                HStack {
                    Circle()
                        .fill(currentStep >= step ? Color.brandOrange : Color.gray.opacity(0.3))
                        .frame(width: 30, height: 30)
                        .overlay(
                            Text("\(step)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        )
                    
                    if step < 3 {
                        Rectangle()
                            .fill(currentStep > step ? Color.brandOrange : Color.gray.opacity(0.3))
                            .frame(height: 2)
                    }
                }
            }
        }
        .padding(.horizontal)
    }
    
    // MARK: - Booking Step Component
    
    private func bookingStep<Content: View>(
        number: Int,
        title: String,
        isActive: Bool,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Circle()
                    .fill(isActive ? Color.brandOrange : Color.gray.opacity(0.3))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Text("\(number)")
                            .font(.headline)
                            .foregroundColor(.white)
                    )
                
                Text(title)
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(isActive ? .textPrimary : .textSecondary)
            }
            
            content()
                .padding(.leading, 44)
        }
        .opacity(isActive ? 1.0 : 0.4)
        .animation(.easeInOut, value: isActive)
    }
    
    // MARK: - Service Info View
    
    private var serviceInfoView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(service.name)
                .font(.headline)
                .foregroundColor(.textPrimary)
            
            if let description = service.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
            }
            
            HStack {
                Label("\(service.durationMinutes) min", systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                
                Spacer()
                
                Text("$\(formatPrice(service.price))")
                    .font(.headline)
                    .foregroundColor(.brandOrange)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
    
    // MARK: - Date & Time View
    
    private var dateTimeView: some View {
        VStack(spacing: 16) {
            // Date Picker
            DatePicker(
                "Select Date",
                selection: $selectedDate,
                in: Date()...,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .accentColor(.brandOrange)
            .onChange(of: selectedDate) { _ in
                selectedTime = nil
                loadBookedTimes()
            }
            
            // Time Slots
            let slots = generateTimeSlots()
            if slots.isEmpty {
                Text(sessionEmptyText)
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
                    .padding()
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Available Times")
                        .font(.headline)
                        .foregroundColor(.textPrimary)
                    
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 12) {
                        ForEach(slots, id: \.self) { time in
                            Button(action: {
                                selectedTime = time
                                withAnimation {
                                    currentStep = 3
                                }
                            }) {
                                Text(formatTime(time))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundColor(selectedTime == time ? .white : .textPrimary)
                                    .padding(.vertical, 12)
                                    .frame(maxWidth: .infinity)
                                    .background(selectedTime == time ? Color.brandOrange : Color.cardBackground)
                                    .cornerRadius(8)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(selectedTime == time ? Color.brandOrange : Color.gray.opacity(0.3), lineWidth: 1)
                                    )
                            }
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Notes View
    
    private var notesView: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Add any notes for \(trainer.name.split(separator: " ").first ?? "") (e.g., specific skills you want to work on)")
                .font(.subheadline)
                .foregroundColor(.textSecondary)
            
            TextEditor(text: $userNotes)
                .frame(height: 100)
                .padding(8)
                .background(Color.cardBackground)
                .cornerRadius(8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                )
        }
    }
    
    // MARK: - Booking Summary
    
    private var bookingSummary: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Booking Summary")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
            
            VStack(spacing: 12) {
                summaryRow(label: "Trainer", value: trainer.name)
                summaryRow(label: "Service", value: service.name)

                if let time = selectedTime {
                    summaryRow(label: "Date", value: formatDate(time))
                    summaryRow(label: "Time", value: formatTime(time))
                }

                Divider()

                summaryRow(label: "Session", value: "$\(formatPrice(service.price))")
                summaryRow(label: "Service fee", value: "$\(formatCents(feeEstimate.serviceFee))")

                HStack {
                    Text("Total")
                        .font(.headline)
                        .foregroundColor(.textSecondary)
                    Spacer()
                    Text("$\(formatCents(feeEstimate.total))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.brandOrange)
                }
            }
            .padding()
            .background(Color.cardBackground)
            .cornerRadius(12)
        }
        .padding(.horizontal)
    }
    
    private func summaryRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.textPrimary)
        }
    }
    
    // MARK: - Confirmation View
    
    private var confirmationView: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.green)
            
            Text("Booking Confirmed!")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.textPrimary)
            
            Text("Your session with \(trainer.name) is scheduled. You'll receive an email with the details.")
                .font(.body)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            if let time = selectedTime {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Service:")
                            .fontWeight(.bold)
                        Text(service.name)
                    }
                    HStack {
                        Text("Date:")
                            .fontWeight(.bold)
                        Text(formatDate(time))
                    }
                    HStack {
                        Text("Time:")
                            .fontWeight(.bold)
                        Text(formatTime(time))
                    }
                }
                .font(.subheadline)
                .padding()
                .background(Color.cardBackground)
                .cornerRadius(12)
            }
            
            Button(action: {
                presentationMode.wrappedValue.dismiss()
            }) {
                Text("Done")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.brandOrange)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal)
            
            Spacer()
        }
        .padding()
    }
    
    // MARK: - Helper Functions
    
    private func loadBookedTimes() {
        Task {
            do {
                // RPC sees ALL bookings for the trainer (RLS hides other
                // athletes' rows from a direct bookings select).
                let slots = try await APIService.shared.fetchTrainerBookedSlots(
                    trainerId: trainer.id,
                    day: DateFormatter.yyyyMMdd.string(from: selectedDate)
                )
                bookedTimes = slots.map(\.bookingDatetime)
            } catch {
                print("Error loading booked times: \(error)")
            }
        }
    }

    private var sessionEmptyText: String {
        if service.isRecurring == true, let days = service.recurrenceDays, !days.isEmpty {
            let names = days.map { $0.prefix(3).capitalized }.joined(separator: ", ")
            return "This session runs on: \(names). Pick one of those days."
        }
        if let date = service.sessionDate {
            return "This session runs on \(date) only."
        }
        return "No available slots for this date"
    }

    /// Web sessionBooking.js parity: is this date bookable for a scheduled session?
    private func isDateAvailableForSession(_ date: Date) -> Bool {
        if service.isRecurring == true {
            guard service.startTime != nil else { return false }
            let weekdayIndex = Calendar.current.component(.weekday, from: date) - 1  // 0 = Sunday
            let dayName = TrainerSessionSheet.dayNames[weekdayIndex]
            return (service.recurrenceDays ?? []).contains(dayName)
        }
        if let sessionDate = service.sessionDate {
            return DateFormatter.yyyyMMdd.string(from: date) == sessionDate
        }
        return false
    }
    
    private func generateTimeSlots() -> [Date] {
        // Scheduled sessions offer exactly one slot at the session's start time,
        // only on dates the session runs.
        if service.isScheduledSession {
            guard isDateAvailableForSession(selectedDate),
                  let time = service.startTime else { return [] }
            let parts = time.split(separator: ":").compactMap { Int($0) }
            var components = Calendar.current.dateComponents([.year, .month, .day], from: selectedDate)
            components.hour = parts.first ?? 0
            components.minute = parts.count > 1 ? parts[1] : 0
            guard let slotTime = Calendar.current.date(from: components),
                  slotTime > Date().addingTimeInterval(30 * 60) else { return [] }
            let slotEnd = slotTime.addingTimeInterval(TimeInterval(service.durationMinutes * 60))
            let isBooked = bookedTimes.contains { bookedTime in
                let bookedEnd = bookedTime.addingTimeInterval(TimeInterval(service.durationMinutes * 60))
                return slotTime < bookedEnd && bookedTime < slotEnd
            }
            return isBooked ? [] : [slotTime]
        }

        var slots: [Date] = []
        let calendar = Calendar.current
        
        // Generate slots from 9 AM to 5 PM
        for hour in 9..<17 {
            for minute in stride(from: 0, to: 60, by: 30) {
                var components = calendar.dateComponents([.year, .month, .day], from: selectedDate)
                components.hour = hour
                components.minute = minute
                
                guard let slotTime = calendar.date(from: components) else { continue }
                
                // Check if slot is in the future (at least 30 minutes from now)
                let thirtyMinutesFromNow = Date().addingTimeInterval(30 * 60)
                guard slotTime > thirtyMinutesFromNow else { continue }
                
                // Check if slot overlaps with booked times
                let slotEnd = slotTime.addingTimeInterval(TimeInterval(service.durationMinutes * 60))
                let isBooked = bookedTimes.contains { bookedTime in
                    let bookedEnd = bookedTime.addingTimeInterval(TimeInterval(service.durationMinutes * 60))
                    return slotTime < bookedEnd && bookedTime < slotEnd
                }
                
                if !isBooked {
                    slots.append(slotTime)
                }
            }
        }
        
        return slots.sorted()
    }
    
    private func confirmBooking() {
        guard let selectedTime = selectedTime else { return }

        guard trainer.canAcceptPayments else {
            bookingError = "This trainer hasn't finished setting up payments yet. Please contact them directly."
            return
        }

        isLoading = true

        Task {
            do {
                guard let userId = AuthService.shared.currentUser?.id else {
                    bookingError = "User not authenticated"
                    isLoading = false
                    return
                }

                let response = try await StripeService.shared.createBookingCheckoutSession(
                    trainerId: trainer.id,
                    userId: userId,
                    serviceId: service.id,
                    serviceName: service.name,
                    servicePrice: service.price,
                    serviceDuration: service.durationMinutes,
                    bookingDatetime: selectedTime,
                    userNotes: userNotes.isEmpty ? nil : userNotes
                )

                pendingBookingId = response.bookingId
                paymentStatus = .awaitingPayment

                guard let urlString = response.url, let url = URL(string: urlString) else {
                    bookingError = "Stripe did not return a checkout URL."
                    isLoading = false
                    return
                }

                checkoutURL = url
                isLoading = false
            } catch {
                isLoading = false
                bookingError = "Failed to start checkout: \(error.localizedDescription)"
                print("Error starting checkout: \(error)")
            }
        }
    }

    private func handleCheckoutDismissed() {
        checkoutURL = nil
        guard let bookingIdString = pendingBookingId,
              let bookingUUID = UUID(uuidString: bookingIdString) else { return }

        Task {
            do {
                let bookings: [BookingPaymentRow] = try await SupabaseClient.shared.select(
                    from: "bookings",
                    columns: "id,payment_status,status",
                    filter: "id=eq.\(bookingUUID.uuidString)"
                )
                guard let row = bookings.first else { return }

                if row.payment_status == "paid" {
                    paymentStatus = .paid
                    withAnimation { showConfirmation = true }
                } else {
                    paymentStatus = .cancelled
                    bookingError = "Payment was not completed. Your session was not booked."
                }
            } catch {
                print("Error refetching booking status: \(error)")
                bookingError = "Could not verify payment status. Please check your bookings."
            }
        }
    }
    
    /// Local estimate of what checkout will charge; server breakdown is authoritative.
    private var feeEstimate: (serviceFee: Int, total: Int) {
        let baseCents = NSDecimalNumber(decimal: service.price * 100).intValue
        return estimatedBookingFees(basePriceCents: baseCents)
    }

    private func formatCents(_ cents: Int) -> String {
        String(format: "%.2f", Double(cents) / 100.0)
    }

    private func formatPrice(_ price: Decimal) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSDecimalNumber(decimal: price)) ?? "0.00"
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
    
    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
}

private struct BookingPaymentRow: Decodable {
    let id: String
    let payment_status: String?
    let status: String?
}

// MARK: - Preview

#Preview {
    BookingView(
        trainer: Trainer(
            id: UUID(),
            userId: UUID(),
            name: "Coach Johnson",
            bio: "Professional basketball trainer with 10 years of experience.",
            specializations: ["Shooting", "Defense"],
            location: "Los Angeles, CA",
            hourlyRate: 100,
            rating: 4.8,
            yearsExperience: 10,
            profileImage: nil,
            createdAt: Date()
        ),
        service: TrainerService(
            id: UUID(),
            trainerId: UUID(),
            name: "1-on-1 Shooting Session",
            description: "Personalized shooting technique and form improvement",
            durationMinutes: 60,
            price: 100.0,
            createdAt: Date()
        )
    )
}

