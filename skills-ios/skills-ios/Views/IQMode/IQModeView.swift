//
//  IQModeView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct IQModeView: View {
    @State private var lessons: [Lesson] = []
    @State private var completedLessonIds: [UUID] = []
    @State private var isLoading = true
    @State private var selectedChapter: String?
    
    var chapters: [String] {
        Array(Set(lessons.compactMap { $0.chapter })).sorted()
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 5) {
                        Text("IQ Mode")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        Text("Master basketball theory and strategy")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    
                    // Chapter Filter
                    if !chapters.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ChapterFilterChip(title: "All", isSelected: selectedChapter == nil) {
                                    selectedChapter = nil
                                }
                                
                                ForEach(chapters, id: \.self) { chapter in
                                    ChapterFilterChip(
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
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, maxHeight: 200)
                    } else {
                        LazyVStack(spacing: 15) {
                            ForEach(filteredLessons) { lesson in
                                NavigationLink(destination: LessonDetailView(lesson: lesson)) {
                                    LessonCard(
                                        lesson: lesson,
                                        isCompleted: completedLessonIds.contains(lesson.id)
                                    )
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationBarHidden(true)
            .onAppear {
                loadData()
            }
        }
    }
    
    private var filteredLessons: [Lesson] {
        if let selectedChapter = selectedChapter {
            return lessons.filter { $0.chapter == selectedChapter }
        }
        return lessons
    }
    
    private func loadData() {
        Task {
            do {
                lessons = try await APIService.shared.fetchLessons(mode: .iq)
                completedLessonIds = try await APIService.shared.fetchCompletedLessons()
            } catch {
                print("Error loading lessons: \(error)")
            }
            isLoading = false
        }
    }
}

struct ChapterFilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color(.systemGray5))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

struct LessonCard: View {
    let lesson: Lesson
    let isCompleted: Bool
    
    var body: some View {
        HStack(spacing: 15) {
            // Icon
            ZStack {
                Circle()
                    .fill(difficultyColor.opacity(0.2))
                    .frame(width: 50, height: 50)
                
                Image(systemName: isCompleted ? "checkmark.circle.fill" : "book.fill")
                    .foregroundColor(isCompleted ? .green : difficultyColor)
                    .font(.title3)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 5) {
                Text(lesson.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                HStack(spacing: 10) {
                    Label("\(lesson.estimatedTime) min", systemImage: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Label("\(lesson.xpReward) XP", systemImage: "star.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                    
                    Text(lesson.difficulty.rawValue.capitalized)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(difficultyColor.opacity(0.2))
                        .foregroundColor(difficultyColor)
                        .cornerRadius(5)
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
    
    private var difficultyColor: Color {
        switch lesson.difficulty {
        case .beginner:
            return .green
        case .intermediate:
            return .orange
        case .advanced:
            return .red
        }
    }
}

#Preview {
    IQModeView()
}

