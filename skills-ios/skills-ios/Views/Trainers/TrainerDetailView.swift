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
    @State private var challenges: [Challenge] = []
    @State private var isLoading = true
    @State private var isLoadingChallenges = true
    @State private var selectedServiceForBooking: TrainerService? = nil
    @State private var showingBooking = false
    @State private var showSignIn = false
    @State private var isFollowing = false
    @State private var isTogglingFollow = false
    
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
                        
                        if let profileImage = trainer.profileImage, let url = URL(string: profileImage) {
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
                    if let rating = trainer.rating {
                        HStack(spacing: 5) {
                            ForEach(0..<5) { index in
                                Image(systemName: index < Int(NSDecimalNumber(decimal: rating).doubleValue) ? "star.fill" : "star")
                                    .foregroundColor(.yellow)
                            }
                            Text(String(format: "%.1f", NSDecimalNumber(decimal: rating).doubleValue))
                                .font(.subheadline)
                        }
                    }
                    
                    // Location
                    if let location = trainer.location {
                        Label(location, systemImage: "location.fill")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    // Follow (keyed on trainers.user_id — the auth id the RPCs expect)
                    if trainer.userId != nil {
                        Button(action: toggleFollow) {
                            Label(isFollowing ? "Following" : "Follow",
                                  systemImage: isFollowing ? "checkmark" : "plus")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 8)
                                .background(isFollowing ? Color.cardBackground : Color.brandOrange)
                                .foregroundColor(isFollowing ? .brandOrange : .white)
                                .overlay(
                                    Capsule().stroke(Color.brandOrange, lineWidth: isFollowing ? 1 : 0)
                                )
                                .clipShape(Capsule())
                        }
                        .disabled(isTogglingFollow)
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
                    if let specializations = trainer.specializations, !specializations.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Specializations")
                                .font(.headline)
                            
                            FlowLayout(spacing: 10) {
                                ForEach(specializations, id: \.self) { spec in
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
                    
                    Divider()
                    
                    // Services
                    Text("Services")
                        .font(.headline)
                    
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        ForEach(services) { service in
                            ServiceCard(
                                service: service,
                                onBook: {
                                    // Guests must sign in before booking (App Store 5.1.1)
                                    guard AuthService.shared.currentUser != nil else {
                                        showSignIn = true
                                        return
                                    }
                                    selectedServiceForBooking = service
                                    showingBooking = true
                                }
                            )
                        }
                    }
                    
                    // Challenges Section
                    if !challenges.isEmpty {
                        Divider()
                            .padding(.top)
                        
                        Text("Workouts Created")
                            .font(.headline)
                        
                        if isLoadingChallenges {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            ForEach(challenges) { challenge in
                                NavigationLink(destination: ChallengeDetailView(challenge: challenge)) {
                                    TrainerChallengeCard(challenge: challenge)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadServices()
            loadChallenges()
            loadFollowState()
        }
        .sheet(isPresented: $showingBooking) {
            if let service = selectedServiceForBooking {
                BookingView(trainer: trainer, service: service)
            }
        }
        .sheet(isPresented: $showSignIn) {
            AuthView()
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
    
    private func loadChallenges() {
        Task {
            do {
                // Assuming trainer is linked to a user account with the same ID
                challenges = try await APIService.shared.fetchTrainerChallenges(trainerId: trainer.userId ?? trainer.id)
            } catch {
                print("Error loading challenges: \(error)")
            }
            isLoadingChallenges = false
        }
    }

    private func loadFollowState() {
        guard let trainerUserId = trainer.userId, AuthService.shared.currentUser != nil else { return }
        Task {
            isFollowing = (try? await APIService.shared.isFollowingTrainer(trainerUserId: trainerUserId)) ?? false
        }
    }

    private func toggleFollow() {
        guard AuthService.shared.currentUser != nil else {
            showSignIn = true
            return
        }
        guard let trainerUserId = trainer.userId else { return }
        isTogglingFollow = true
        Task {
            do {
                if isFollowing {
                    try await APIService.shared.unfollowTrainer(trainerUserId: trainerUserId)
                    isFollowing = false
                } else {
                    try await APIService.shared.followTrainer(trainerUserId: trainerUserId)
                    isFollowing = true
                }
            } catch {
                print("Follow toggle failed: \(error)")
            }
            isTogglingFollow = false
        }
    }
}

struct ServiceCard: View {
    let service: TrainerService
    let onBook: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(service.name)
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

            if service.isScheduledSession {
                HStack(spacing: 8) {
                    if service.isRecurring == true, let days = service.recurrenceDays, !days.isEmpty {
                        Label(days.map { $0.prefix(3).capitalized }.joined(separator: " "), systemImage: "repeat")
                    } else if let date = service.sessionDate {
                        Label(date, systemImage: "calendar")
                    }
                    if let time = service.startTime {
                        Text(String(time.prefix(5)))
                    }
                    if let level = service.skillLevel, level != "all_levels" {
                        Text(level.capitalized)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.2))
                            .foregroundColor(.orange)
                            .cornerRadius(8)
                    }
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }

            HStack {
                Label("\(service.durationMinutes) minutes", systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Button(action: onBook) {
                    Text("Book")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                }
            }
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

struct TrainerChallengeCard: View {
    let challenge: Challenge
    
    var body: some View {
        HStack(spacing: 12) {
            // Challenge Icon
            ZStack {
                Circle()
                    .fill(getDifficultyColor(challenge.difficulty).opacity(0.2))
                    .frame(width: 50, height: 50)
                
                Image(systemName: getCategoryIcon(challenge.category))
                    .foregroundColor(getDifficultyColor(challenge.difficulty))
                    .font(.title3)
            }
            
            // Challenge Info
            VStack(alignment: .leading, spacing: 4) {
                Text(challenge.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
                
                HStack(spacing: 8) {
                    Text(challenge.difficulty.rawValue.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(getDifficultyColor(challenge.difficulty).opacity(0.2))
                        .foregroundColor(getDifficultyColor(challenge.difficulty))
                        .cornerRadius(4)
                    
                    if let duration = challenge.duration {
                        Label("\(duration) min", systemImage: "clock")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Label("\(challenge.xpReward) XP", systemImage: "star.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
                .font(.caption)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
    
    private func getDifficultyColor(_ difficulty: Difficulty) -> Color {
        switch difficulty {
        case .beginner: return .green
        case .intermediate: return .orange
        case .advanced: return .red
        }
    }
    
    private func getCategoryIcon(_ category: String) -> String {
        switch category.lowercased() {
        case "shooting": return "target"
        case "dribbling": return "figure.basketball"
        case "defense": return "shield.lefthalf.filled"
        case "passing": return "arrow.triangle.turn.up.right.diamond.fill"
        case "conditioning": return "bolt.heart.fill"
        case "footwork": return "figure.walk"
        default: return "sportscourt"
        }
    }
}

#Preview {
    NavigationView {
        TrainerDetailView(trainer: Trainer(
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
            verified: true,
            createdAt: Date()
        ))
    }
}

