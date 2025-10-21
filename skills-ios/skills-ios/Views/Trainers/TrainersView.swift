//
//  TrainersView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct TrainersView: View {
    @State private var trainers: [Trainer] = []
    @State private var isLoading = true
    @State private var searchText = ""
    
    var filteredTrainers: [Trainer] {
        if searchText.isEmpty {
            return trainers
        }
        return trainers.filter { trainer in
            trainer.name.localizedCaseInsensitiveContains(searchText) ||
            (trainer.specializations?.contains { $0.localizedCaseInsensitiveContains(searchText) } ?? false)
        }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Search trainers...", text: $searchText)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding()
                
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 15) {
                            ForEach(filteredTrainers) { trainer in
                                NavigationLink(destination: TrainerDetailView(trainer: trainer)) {
                                    TrainerCard(trainer: trainer)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Trainers")
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
                loadTrainers()
            }
        }
    }
    
    private func loadTrainers() {
        Task {
            do {
                trainers = try await APIService.shared.fetchTrainers()
            } catch {
                print("Error loading trainers: \(error)")
            }
            isLoading = false
        }
    }
}

struct TrainerCard: View {
    let trainer: Trainer
    
    var body: some View {
        HStack(spacing: 15) {
            // Avatar
            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.2))
                    .frame(width: 60, height: 60)
                
                if let profileImage = trainer.profileImage, let url = URL(string: profileImage) {
                    AsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Image(systemName: "person.fill")
                            .foregroundColor(.orange)
                    }
                    .frame(width: 60, height: 60)
                    .clipShape(Circle())
                } else {
                    Image(systemName: "person.fill")
                        .foregroundColor(.orange)
                        .font(.title2)
                }
            }
            
            // Info
            VStack(alignment: .leading, spacing: 5) {
                Text(trainer.name)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                // Rating
                if let rating = trainer.rating {
                    HStack(spacing: 5) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                        Text(String(format: "%.1f", NSDecimalNumber(decimal: rating).doubleValue))
                            .font(.subheadline)
                    }
                }
                
                // Specializations
                if let specializations = trainer.specializations, !specializations.isEmpty {
                    Text(specializations.prefix(2).joined(separator: ", "))
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
                
                // Rate
                if let hourlyRate = trainer.hourlyRate {
                    Text("$\(formatRate(hourlyRate))/hr")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.green)
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(15)
    }
    
    private func formatRate(_ decimal: Decimal) -> String {
        return String(format: "%.2f", NSDecimalNumber(decimal: decimal).doubleValue)
    }
}

#Preview {
    TrainersView()
}

