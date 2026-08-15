//
//  ProfileView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI
import PhotosUI

struct ProfileView: View {
    @StateObject private var authService = AuthService.shared
    @State private var sessions: [ShootingSession] = []
    @State private var bookings: [Booking] = []
    @State private var isLoading = true
    @State private var showEditSheet = false
    @State private var showDeleteAlert = false
    @State private var showDeleteConfirmSheet = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Profile Header Card
                ZStack(alignment: .topTrailing) {
                    VStack(spacing: 15) {
                        // Avatar
                        ZStack {
                            if let avatarUrl = authService.currentUser?.avatarUrl,
                               let url = URL(string: avatarUrl) {
                                AsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.purple, Color.pink],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                }
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                            } else {
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.purple, Color.pink],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 100, height: 100)
                                
                                Text(authService.currentUser?.fullName?.prefix(1).uppercased() ?? "P")
                                    .font(.system(size: 40, weight: .bold))
                                    .foregroundColor(.white)
                            }
                        }
                        .frame(width: 100, height: 100)
                        
                        // Name
                        Text(authService.currentUser?.fullName ?? "Player")
                            .font(.title)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        // Email
                        Text(authService.currentUser?.email ?? "")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.8))
                    
                    // Stats Row
                    HStack(spacing: 30) {
                        ProfileHeaderStat(
                            value: "\(authService.currentUser?.currentLevel ?? 1)",
                            label: "Level"
                        )
                        ProfileHeaderStat(
                            value: "\(authService.currentUser?.totalXp ?? 0)",
                            label: "Total XP"
                        )
                        ProfileHeaderStat(
                            value: "\(authService.currentUser?.currentStreak ?? 0)",
                            label: "Day Streak"
                        )
                        ProfileHeaderStat(
                            value: "\(authService.currentUser?.badges?.count ?? 0)",
                            label: "Badges"
                        )
                        }
                        .padding(.top, 10)
                    }
                    .padding(25)
                    .frame(maxWidth: .infinity)
                    .background(
                        LinearGradient(
                            colors: [Color.purple, Color.pink.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .cornerRadius(20)
                    
                    // Edit Button
                    Button(action: { showEditSheet = true }) {
                        Image(systemName: "pencil")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(Color.white.opacity(0.2))
                            .clipShape(Circle())
                    }
                    .padding(12)
                }
                .padding(.horizontal)
                
                // Level Progress & Activity Streak Row
                HStack(spacing: 15) {
                    // Level Progress
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "star.fill")
                                .foregroundColor(.yellow)
                            Text("Level Progress")
                                .font(.headline)
                        }
                        
                        Text("Level \(authService.currentUser?.currentLevel ?? 1)")
                            .font(.title3)
                            .fontWeight(.semibold)
                        
                        // Progress Bar
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 5)
                                    .fill(Color.gray.opacity(0.3))
                                    .frame(height: 8)
                                
                                RoundedRectangle(cornerRadius: 5)
                                    .fill(
                                        LinearGradient(
                                            colors: [.orange, .red],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geometry.size.width * levelProgress, height: 8)
                            }
                        }
                        .frame(height: 8)
                        
                        HStack {
                            Text("\(currentLevelXP) XP")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(nextLevelXP) XP")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Text("\(xpToNextLevel) XP to next level")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(15)
                    
                    // Activity Streak
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "flame.fill")
                                .foregroundColor(.orange)
                            Text("Activity Streak")
                                .font(.headline)
                        }
                        
                        Text("\(authService.currentUser?.currentStreak ?? 0)")
                            .font(.system(size: 40, weight: .bold))
                            .foregroundColor(.orange)
                        
                        Text("Days in a row")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        HStack {
                            Text("Best streak:")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("\(authService.currentUser?.longestStreak ?? 0) days")
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(15)
                }
                .padding(.horizontal)
                
                // Shooting Stats & Performance Row
                HStack(spacing: 15) {
                    // Shooting Stats
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "target")
                                .foregroundColor(.red)
                            Text("Shooting Stats")
                                .font(.headline)
                        }
                        
                        HStack(spacing: 20) {
                            VStack {
                                Text("\(averagePercentage)%")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.red)
                                Text("Avg Accuracy")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            VStack {
                                Text("\(totalShots)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.blue)
                                Text("Total Shots")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Text("\(sessions.count) shooting sessions completed")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(15)
                    
                    // Performance
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "chart.line.uptrend.xyaxis")
                                .foregroundColor(.green)
                            Text("Performance")
                                .font(.headline)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Lessons Completed")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("\(authService.currentUser?.completedLessons?.count ?? 0)")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                            }
                            
                            HStack {
                                Text("Favorite Position")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(authService.currentUser?.favoritePosition ?? "Not set")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.gray.opacity(0.2))
                                    .cornerRadius(4)
                            }
                            
                            HStack {
                                Text("Last Active")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(formatLastActive())
                                    .font(.caption)
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color(.systemGray6))
                    .cornerRadius(15)
                }
                .padding(.horizontal)
                
                // Achievements & Badges
                VStack(alignment: .leading, spacing: 15) {
                    HStack {
                        Image(systemName: "trophy.fill")
                            .foregroundColor(.yellow)
                        Text("Achievements & Badges")
                            .font(.headline)
                    }
                    .padding(.horizontal)
                    
                    if let badges = authService.currentUser?.badges, !badges.isEmpty {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
                            ForEach(badges, id: \.self) { badge in
                                BadgeCard(badgeId: badge)
                            }
                        }
                        .padding(.horizontal)
                    } else {
                        VStack(spacing: 15) {
                            Image(systemName: "medal")
                                .font(.system(size: 50))
                                .foregroundColor(.gray.opacity(0.5))
                            
                            Text("No Badges Yet")
                                .font(.headline)
                                .foregroundColor(.orange)
                            
                            Text("Complete lessons and challenges to earn your first badge!")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(30)
                        .background(Color(.systemGray6))
                        .cornerRadius(15)
                        .padding(.horizontal)
                    }
                }
                
                // Recent Sessions
                if !sessions.isEmpty {
                    VStack(alignment: .leading, spacing: 15) {
                        HStack {
                            Image(systemName: "chart.bar.fill")
                                .foregroundColor(.purple)
                            Text("Recent Shooting Sessions")
                                .font(.headline)
                        }
                        .padding(.horizontal)
                        
                        ForEach(sessions.prefix(5)) { session in
                            SessionRow(session: session)
                                .padding(.horizontal)
                        }
                    }
                }
                
                // Sign Out Button
                Button(action: signOut) {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Sign Out")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.red)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .padding(.horizontal)

                // Delete Account Button (required by App Store Guideline 5.1.1(v))
                Button(action: { showDeleteAlert = true }) {
                    HStack {
                        Image(systemName: "trash")
                        Text("Delete Account")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.clear)
                    .foregroundColor(.red)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.red, lineWidth: 1)
                    )
                }
                .padding(.horizontal)
                .padding(.bottom)
            }
            .padding(.vertical)
        }
        .background(Color.appBackground)
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: handleSignOut) {
                    HStack(spacing: 4) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Sign Out")
                    }
                    .foregroundColor(.red)
                }
            }
        }
        .onAppear {
            loadData()
        }
        .sheet(isPresented: $showEditSheet) {
            EditProfileSheet(authService: authService)
        }
        .alert("Delete Account?", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Continue", role: .destructive) {
                showDeleteConfirmSheet = true
            }
        } message: {
            Text("This will permanently delete your account, profile, XP, sessions, and progress. This cannot be undone.")
        }
        .sheet(isPresented: $showDeleteConfirmSheet) {
            DeleteAccountConfirmSheet(authService: authService)
        }
    }
    
    // MARK: - Computed Properties
    
    // XP thresholds matching database: calculate_level_from_xp()
    // Level 1: 0-99, Level 2: 100-249, Level 3: 250-449, Level 4: 450-699, Level 5: 700-999, Level 6+: 1000+
    private func xpRequiredForLevel(_ level: Int) -> Int {
        switch level {
        case 1: return 0
        case 2: return 100
        case 3: return 250
        case 4: return 450
        case 5: return 700
        default: return 1000 + (level - 6) * 300
        }
    }
    
    private var currentLevelXP: Int {
        let level = authService.currentUser?.currentLevel ?? 1
        return xpRequiredForLevel(level)
    }
    
    private var nextLevelXP: Int {
        let level = authService.currentUser?.currentLevel ?? 1
        return xpRequiredForLevel(level + 1)
    }
    
    private var xpToNextLevel: Int {
        max(0, nextLevelXP - (authService.currentUser?.totalXp ?? 0))
    }
    
    private var levelProgress: Double {
        let current = authService.currentUser?.totalXp ?? 0
        let currentLevelStart = currentLevelXP
        let nextLevel = nextLevelXP
        guard nextLevel > currentLevelStart else { return 1.0 }
        let progress = Double(current - currentLevelStart) / Double(nextLevel - currentLevelStart)
        return min(max(progress, 0), 1)
    }
    
    private var totalShots: Int {
        sessions.reduce(0) { $0 + $1.totalShots }
    }
    
    private var madeShots: Int {
        sessions.reduce(0) { $0 + $1.madeShots }
    }
    
    private var averagePercentage: Int {
        guard totalShots > 0 else { return 0 }
        return Int((Double(madeShots) / Double(totalShots)) * 100)
    }
    
    // MARK: - Functions
    
    private func formatLastActive() -> String {
        if let dateString = authService.currentUser?.lastActivityDate {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            if let date = formatter.date(from: dateString) {
                let displayFormatter = DateFormatter()
                displayFormatter.dateFormat = "MMM d, yyyy"
                return displayFormatter.string(from: date)
            }
        }
        return "Today"
    }
    
    private func handleSignOut() {
        Task {
            do {
                try await AuthService.shared.signOut()
            } catch {
                print("Error signing out: \(error)")
            }
        }
    }
    
    private func loadData() {
        Task {
            do {
                sessions = try await APIService.shared.fetchUserShootingSessions()
            } catch {
                print("Error loading data: \(error)")
            }
            isLoading = false
        }
    }
    
    private func signOut() {
        Task {
            try? await authService.signOut()
        }
    }
}

// MARK: - Supporting Views

struct ProfileHeaderStat: View {
    let value: String
    let label: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(label)
                .font(.caption)
                .foregroundColor(.white.opacity(0.8))
        }
    }
}

struct ProfileStatCard: View {
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
                .font(.headline)
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

struct BadgeCard: View {
    let badgeId: String
    
    private var badgeEmoji: String {
        switch badgeId {
        case "first_lesson": return "🎓"
        case "streak_7": return "🔥"
        case "streak_30": return "🏆"
        case "sharpshooter": return "🎯"
        case "consistent": return "📈"
        case "dedicated": return "💪"
        default: return "🏅"
        }
    }
    
    private var badgeName: String {
        switch badgeId {
        case "first_lesson": return "First Lesson"
        case "streak_7": return "7-Day Streak"
        case "streak_30": return "30-Day Streak"
        case "sharpshooter": return "Sharpshooter"
        case "consistent": return "Consistent"
        case "dedicated": return "Dedicated"
        default: return "Achievement"
        }
    }
    
    var body: some View {
        VStack(spacing: 8) {
            Text(badgeEmoji)
                .font(.system(size: 30))
            Text(badgeName)
                .font(.caption)
                .fontWeight(.semibold)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(
            LinearGradient(
                colors: [Color.yellow.opacity(0.2), Color.orange.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.yellow.opacity(0.5), lineWidth: 1)
        )
    }
}

private struct StatRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
        }
    }
}

private struct SessionRow: View {
    let session: ShootingSession
    
    private func formatPercentage(_ decimal: Decimal) -> String {
        return String(format: "%.0f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
    
    var body: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "calendar")
                    .foregroundColor(.secondary)
                
                Text(session.date, style: .date)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }
            
            Spacer()
            
            HStack(spacing: 12) {
                Text("\(session.madeShots)/\(session.totalShots) shots")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("\(formatPercentage(session.shootingPercentage))%")
                    .font(.caption)
                    .fontWeight(.bold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        NSDecimalNumber(decimal: session.shootingPercentage).doubleValue >= 50
                            ? Color.green.opacity(0.2)
                            : Color.red.opacity(0.2)
                    )
                    .foregroundColor(
                        NSDecimalNumber(decimal: session.shootingPercentage).doubleValue >= 50
                            ? .green
                            : .red
                    )
                    .cornerRadius(6)
                
                Image(systemName: "eye")
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

// MARK: - Edit Profile Sheet

struct EditProfileSheet: View {
    @ObservedObject var authService: AuthService
    @Environment(\.dismiss) private var dismiss
    
    @State private var fullName: String = ""
    @State private var favoritePosition: String = "Not set"
    @State private var avatarUrl: String = ""
    @State private var isSaving = false
    @State private var showImagePicker = false
    @State private var selectedImage: UIImage?
    @State private var showError = false
    @State private var errorMessage = ""
    
    let positions = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center", "Guard", "Forward", "Not set"]
    
    var body: some View {
        NavigationView {
            Form {
                // Avatar Section
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            ZStack {
                                if let image = selectedImage {
                                    Image(uiImage: image)
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                        .frame(width: 100, height: 100)
                                        .clipShape(Circle())
                                } else if let urlString = authService.currentUser?.avatarUrl,
                                          !urlString.isEmpty,
                                          let url = URL(string: urlString) {
                                    AsyncImage(url: url) { image in
                                        image
                                            .resizable()
                                            .aspectRatio(contentMode: .fill)
                                    } placeholder: {
                                        Circle()
                                            .fill(Color.purple.opacity(0.3))
                                    }
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                                } else {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                colors: [Color.purple, Color.pink],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 100, height: 100)
                                    
                                    Text(fullName.prefix(1).uppercased())
                                        .font(.system(size: 40, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                            
                            Button(action: { showImagePicker = true }) {
                                Label("Change Photo", systemImage: "camera")
                                    .font(.subheadline)
                            }
                        }
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }
                
                // Profile Info
                Section(header: Text("Profile Information")) {
                    TextField("Full Name", text: $fullName)
                    
                    Picker("Favorite Position", selection: $favoritePosition) {
                        ForEach(positions, id: \.self) { position in
                            Text(position).tag(position)
                        }
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveProfile()
                    }
                    .fontWeight(.semibold)
                    .disabled(isSaving)
                }
            }
            .onAppear {
                fullName = authService.currentUser?.fullName ?? ""
                favoritePosition = authService.currentUser?.favoritePosition ?? "Not set"
                avatarUrl = authService.currentUser?.avatarUrl ?? ""
            }
            .sheet(isPresented: $showImagePicker) {
                ImagePicker(image: $selectedImage)
            }
            .onChange(of: selectedImage) { newImage in
                if newImage != nil {
                    uploadImage()
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    private func uploadImage() {
        guard let image = selectedImage,
              let imageData = image.jpegData(compressionQuality: 0.7) else { return }
        
        Task {
            do {
                guard let userId = authService.currentUser?.id else { return }
                let fileName = "avatars/\(userId.uuidString)-\(Date().timeIntervalSince1970).jpg"
                
                try await SupabaseClient.shared.uploadFile(
                    bucket: "assets",
                    path: fileName,
                    data: imageData
                )
                
                let publicUrl = SupabaseClient.shared.getPublicUrl(bucket: "assets", path: fileName)
                
                await MainActor.run {
                    avatarUrl = publicUrl
                }
            } catch {
                print("Error uploading image: \(error)")
                await MainActor.run {
                    errorMessage = "Failed to upload image. Please try again."
                    showError = true
                }
            }
        }
    }
    
    private func saveProfile() {
        isSaving = true
        
        Task {
            do {
                guard let userId = authService.currentUser?.id else { return }
                
                try await APIService.shared.updateProfile(
                    userId: userId,
                    fullName: fullName,
                    favoritePosition: favoritePosition == "Not set" ? nil : favoritePosition,
                    avatarUrl: avatarUrl.isEmpty ? nil : avatarUrl
                )
                
                // Refresh user data
                try await authService.refreshUser()
                
                await MainActor.run {
                    isSaving = false
                    dismiss()
                }
            } catch {
                print("Error saving profile: \(error)")
                await MainActor.run {
                    isSaving = false
                    errorMessage = "Failed to save profile. Please try again."
                    showError = true
                }
            }
        }
    }
}

// MARK: - Image Picker

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = .photoLibrary
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

// MARK: - Delete Account Confirmation Sheet

struct DeleteAccountConfirmSheet: View {
    @ObservedObject var authService: AuthService
    @Environment(\.dismiss) private var dismiss
    @State private var confirmationText = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?

    private let requiredPhrase = "DELETE"

    private var canDelete: Bool {
        confirmationText == requiredPhrase && !isDeleting
    }

    var body: some View {
        NavigationView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                            .font(.title2)
                        Text("This is permanent")
                            .font(.headline)
                    }
                    Text("Deleting your account will:")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    VStack(alignment: .leading, spacing: 6) {
                        BulletRow(text: "Permanently remove your login and personal info (name, email, photo)")
                        BulletRow(text: "Remove your XP, level, and streaks")
                        BulletRow(text: "Keep past bookings on record, anonymized, for payment history")
                    }
                    Text("If you have upcoming confirmed sessions, cancel them first — deletion is blocked while any remain. This cannot be undone.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Type \(requiredPhrase) to confirm")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    TextField(requiredPhrase, text: $confirmationText)
                        .textFieldStyle(.roundedBorder)
                        .autocapitalization(.allCharacters)
                        .disableAutocorrection(true)
                        .disabled(isDeleting)
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundColor(.red)
                }

                Spacer()

                Button(action: performDelete) {
                    HStack {
                        if isDeleting {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(isDeleting ? "Deleting..." : "Delete Account")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(canDelete ? Color.red : Color.red.opacity(0.4))
                    .foregroundColor(.white)
                    .cornerRadius(10)
                }
                .disabled(!canDelete)
            }
            .padding()
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                        .disabled(isDeleting)
                }
            }
            .interactiveDismissDisabled(isDeleting)
        }
    }

    private func performDelete() {
        isDeleting = true
        errorMessage = nil
        Task {
            do {
                try await authService.deleteAccount()
                // Auth state changed; the app's root will swap to the auth screen.
            } catch {
                await MainActor.run {
                    if case SupabaseError.functionRejected(let message) = error {
                        errorMessage = message
                    } else {
                        errorMessage = "Couldn't delete your account. Please check your connection and try again."
                    }
                    isDeleting = false
                }
            }
        }
    }
}

private struct BulletRow: View {
    let text: String
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•").foregroundColor(.secondary)
            Text(text).font(.subheadline)
        }
    }
}

#Preview {
    NavigationView {
        ProfileView()
    }
}
