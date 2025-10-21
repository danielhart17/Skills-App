//
//  LessonDetailView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct LessonDetailView: View {
    let lesson: Lesson
    @State private var questions: [Question] = []
    @State private var isLoading = true
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Image (placeholder)
                Rectangle()
                    .fill(LinearGradient(
                        gradient: Gradient(colors: [.orange, .blue]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(height: 200)
                    .overlay(
                        Image(systemName: "book.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.white)
                    )
                
                VStack(alignment: .leading, spacing: 15) {
                    // Title
                    Text(lesson.title)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    // Meta Info
                    HStack(spacing: 15) {
                        Label("\(lesson.estimatedTime) min", systemImage: "clock")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Label("\(lesson.xpReward) XP", systemImage: "star.fill")
                            .font(.subheadline)
                            .foregroundColor(.orange)
                        
                        Text(lesson.difficulty.rawValue.capitalized)
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(difficultyColor.opacity(0.2))
                            .foregroundColor(difficultyColor)
                            .cornerRadius(5)
                    }
                    
                    Divider()
                    
                    // Description
                    if let description = lesson.description {
                        Text(description)
                            .font(.body)
                            .foregroundColor(.primary)
                    }
                    
                    // Question Count
                    if !questions.isEmpty {
                        HStack {
                            Image(systemName: "questionmark.circle.fill")
                                .foregroundColor(.blue)
                            Text("\(questions.count) questions")
                                .font(.subheadline)
                            Text("• Pass with 80% or higher")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                    }
                    
                    // Start Button
                    if !questions.isEmpty {
                        NavigationLink(destination: QuestionView(lesson: lesson, questions: questions)) {
                            HStack {
                                Text("Start Lesson")
                                    .fontWeight(.semibold)
                                Spacer()
                                Image(systemName: "play.circle.fill")
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                    } else if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Text("No questions available for this lesson yet")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadQuestions()
        }
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
    
    private func loadQuestions() {
        Task {
            do {
                questions = try await APIService.shared.fetchQuestions(lessonId: lesson.id)
            } catch {
                print("Error loading questions: \(error)")
            }
            isLoading = false
        }
    }
}

#Preview {
    NavigationView {
        LessonDetailView(lesson: Lesson(
            id: UUID(),
            title: "Understanding Court Spacing",
            description: "Learn the fundamentals of proper court spacing and positioning.",
            mode: .iq,
            chapter: "Fundamentals",
            chapterId: nil,
            difficulty: .beginner,
            level: 1,
            orderIndex: 1,
            estimatedTime: 15,
            xpReward: 50,
            thumbnailUrl: nil,
            videoUrl: nil,
            content: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
}

