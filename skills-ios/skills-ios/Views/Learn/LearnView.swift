//
//  LearnView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct LearnView: View {
    @State private var lessons: [Lesson] = []
    @State private var completedLessonIds: [UUID] = []
    @State private var isLoading = true
    @State private var selectedMode: LessonMode = .iq
    @State private var selectedChapter: String?
    
    var chapters: [String] {
        Array(Set(filteredByMode.compactMap { $0.chapter })).sorted()
    }
    
    var filteredByMode: [Lesson] {
        lessons.filter { $0.mode == selectedMode }
    }
    
    var filteredLessons: [Lesson] {
        if let selectedChapter = selectedChapter {
            return filteredByMode.filter { $0.chapter == selectedChapter }
        }
        return filteredByMode
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Mode Toggle
                Picker("Mode", selection: $selectedMode) {
                    Text("IQ Mode").tag(LessonMode.iq)
                    Text("On Court").tag(LessonMode.oncourt)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // Header
                            VStack(alignment: .leading, spacing: 5) {
                                Text(selectedMode == .iq ? "IQ Mode" : "On Court")
                                    .font(.largeTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                Text(selectedMode == .iq ? "Master basketball theory and strategy" : "Develop your physical skills on the court")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal)
                            
                            // Chapter Filter
                            if !chapters.isEmpty {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 10) {
                                        LearnChapterFilterChip(title: "All", isSelected: selectedChapter == nil) {
                                            selectedChapter = nil
                                        }
                                        
                                        ForEach(chapters, id: \.self) { chapter in
                                            LearnChapterFilterChip(
                                                title: chapter,
                                                isSelected: selectedChapter == chapter
                                            ) {
                                                selectedChapter = chapter
                                            }
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                            
                            // Lessons List
                            LazyVStack(spacing: 15) {
                                ForEach(filteredLessons) { lesson in
                                    NavigationLink(destination: LessonDetailView(lesson: lesson)) {
                                        LearnLessonCard(
                                            lesson: lesson,
                                            isCompleted: completedLessonIds.contains(lesson.id)
                                        )
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.horizontal)
                        }
                        .padding(.vertical)
                    }
                }
            }
            .background(Color.black)
            .navigationTitle("Learn")
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
            .onChange(of: selectedMode) { _ in
                selectedChapter = nil
            }
        }
    }
    
    private func loadData() {
        Task {
            do {
                lessons = try await APIService.shared.fetchLessons()
                completedLessonIds = try await APIService.shared.fetchCompletedLessons()
            } catch {
                print("Error loading lessons: \(error)")
            }
            isLoading = false
        }
    }
}

// MARK: - Supporting Views

private struct LearnChapterFilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.orange : Color.gray.opacity(0.2))
                .foregroundColor(isSelected ? .white : .secondary)
                .cornerRadius(20)
        }
    }
}

private struct LearnLessonCard: View {
    let lesson: Lesson
    let isCompleted: Bool
    
    private func getDifficultyColor(_ difficulty: String) -> Color {
        switch difficulty.lowercased() {
        case "beginner":
            return .green
        case "intermediate":
            return .orange
        case "advanced":
            return .red
        default:
            return .gray
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with completion badge
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(lesson.title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .lineLimit(2)
                    
                    if let chapter = lesson.chapter {
                        Text(chapter)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                if isCompleted {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundColor(.green)
                }
            }
            
            // Description
            if let description = lesson.description {
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            // Meta Info
            HStack(spacing: 15) {
                // Difficulty
                if let difficulty = lesson.difficulty {
                    HStack(spacing: 4) {
                        Image(systemName: "chart.bar.fill")
                            .font(.caption)
                        Text(difficulty.rawValue.capitalized)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(getDifficultyColor(difficulty.rawValue))
                }
                
                // Time
                if let estimatedTime = lesson.estimatedTime {
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .font(.caption)
                        Text("\(estimatedTime) min")
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }
                
                // XP
                if let xpReward = lesson.xpReward {
                    HStack(spacing: 4) {
                        Image(systemName: "bolt.fill")
                            .font(.caption)
                        Text("\(xpReward) XP")
                            .font(.caption)
                    }
                    .foregroundColor(.yellow)
                }
                
                Spacer()
            }
        }
        .padding()
        .background(Color.gray.opacity(0.15))
        .cornerRadius(12)
    }
}

#Preview {
    LearnView()
}

