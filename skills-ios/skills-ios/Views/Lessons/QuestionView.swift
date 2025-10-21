//
//  QuestionView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct QuestionView: View {
    let lesson: Lesson
    let questions: [Question]
    
    @State private var currentQuestionIndex = 0
    @State private var selectedAnswer: String?
    @State private var isAnswered = false
    @State private var correctAnswers = 0
    @State private var showResults = false
    @State private var isSubmitting = false
    @Environment(\.presentationMode) var presentationMode
    
    private var currentQuestion: Question {
        questions[currentQuestionIndex]
    }
    
    private var progress: Double {
        Double(currentQuestionIndex + 1) / Double(questions.count)
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Progress Bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color(.systemGray5))
                        .frame(height: 4)
                    
                    Rectangle()
                        .fill(Color.orange)
                        .frame(width: geometry.size.width * progress, height: 4)
                }
            }
            .frame(height: 4)
            
            if showResults {
                ResultsView(
                    lesson: lesson,
                    totalQuestions: questions.count,
                    correctAnswers: correctAnswers,
                    onRetry: resetQuiz,
                    onExit: { presentationMode.wrappedValue.dismiss() }
                )
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Question Number
                        Text("Question \(currentQuestionIndex + 1) of \(questions.count)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        // Question Text
                        Text(currentQuestion.questionText)
                            .font(.title3)
                            .fontWeight(.semibold)
                            .fixedSize(horizontal: false, vertical: true)
                        
                        // Media (if any)
                        if currentQuestion.mediaType != .none, let mediaUrl = currentQuestion.mediaUrl {
                            if currentQuestion.mediaType == .image {
                                AsyncImage(url: URL(string: mediaUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                } placeholder: {
                                    ProgressView()
                                }
                                .frame(maxHeight: 200)
                                .cornerRadius(10)
                            }
                        }
                        
                        // Answer Options
                        VStack(spacing: 12) {
                            AnswerOption(
                                letter: "A",
                                text: currentQuestion.optionA,
                                isSelected: selectedAnswer == "A",
                                isCorrect: isAnswered ? currentQuestion.correctAnswer == "A" : nil,
                                isIncorrect: isAnswered && selectedAnswer == "A" && currentQuestion.correctAnswer != "A"
                            ) {
                                if !isAnswered {
                                    selectedAnswer = "A"
                                }
                            }
                            
                            AnswerOption(
                                letter: "B",
                                text: currentQuestion.optionB,
                                isSelected: selectedAnswer == "B",
                                isCorrect: isAnswered ? currentQuestion.correctAnswer == "B" : nil,
                                isIncorrect: isAnswered && selectedAnswer == "B" && currentQuestion.correctAnswer != "B"
                            ) {
                                if !isAnswered {
                                    selectedAnswer = "B"
                                }
                            }
                            
                            AnswerOption(
                                letter: "C",
                                text: currentQuestion.optionC,
                                isSelected: selectedAnswer == "C",
                                isCorrect: isAnswered ? currentQuestion.correctAnswer == "C" : nil,
                                isIncorrect: isAnswered && selectedAnswer == "C" && currentQuestion.correctAnswer != "C"
                            ) {
                                if !isAnswered {
                                    selectedAnswer = "C"
                                }
                            }
                            
                            AnswerOption(
                                letter: "D",
                                text: currentQuestion.optionD,
                                isSelected: selectedAnswer == "D",
                                isCorrect: isAnswered ? currentQuestion.correctAnswer == "D" : nil,
                                isIncorrect: isAnswered && selectedAnswer == "D" && currentQuestion.correctAnswer != "D"
                            ) {
                                if !isAnswered {
                                    selectedAnswer = "D"
                                }
                            }
                        }
                        
                        // Explanation (after answering)
                        if isAnswered, let explanation = currentQuestion.explanation {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Image(systemName: selectedAnswer == currentQuestion.correctAnswer ? "checkmark.circle.fill" : "xmark.circle.fill")
                                        .foregroundColor(selectedAnswer == currentQuestion.correctAnswer ? .green : .red)
                                    Text(selectedAnswer == currentQuestion.correctAnswer ? "Correct!" : "Incorrect")
                                        .fontWeight(.semibold)
                                }
                                Text(explanation)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(10)
                        }
                    }
                    .padding()
                }
                
                // Action Buttons
                VStack(spacing: 12) {
                    if !isAnswered {
                        Button(action: submitAnswer) {
                            Text("Submit Answer")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(selectedAnswer != nil ? Color.orange : Color.gray)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                        }
                        .disabled(selectedAnswer == nil)
                    } else {
                        Button(action: nextQuestion) {
                            Text(currentQuestionIndex < questions.count - 1 ? "Next Question" : "Finish")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.orange)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { presentationMode.wrappedValue.dismiss() }) {
                    Image(systemName: "xmark")
                        .foregroundColor(.primary)
                }
            }
        }
    }
    
    private func submitAnswer() {
        isAnswered = true
        if selectedAnswer == currentQuestion.correctAnswer {
            correctAnswers += 1
        }
    }
    
    private func nextQuestion() {
        if currentQuestionIndex < questions.count - 1 {
            currentQuestionIndex += 1
            selectedAnswer = nil
            isAnswered = false
        } else {
            finishQuiz()
        }
    }
    
    private func finishQuiz() {
        Task {
            do {
                try await APIService.shared.submitLessonAttempt(
                    lessonId: lesson.id,
                    totalQuestions: questions.count,
                    correctAnswers: correctAnswers
                )
                showResults = true
            } catch {
                print("Error submitting attempt: \(error)")
                showResults = true
            }
        }
    }
    
    private func resetQuiz() {
        currentQuestionIndex = 0
        selectedAnswer = nil
        isAnswered = false
        correctAnswers = 0
        showResults = false
    }
}

struct AnswerOption: View {
    let letter: String
    let text: String
    let isSelected: Bool
    let isCorrect: Bool?
    let isIncorrect: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 15) {
                // Letter Circle
                ZStack {
                    Circle()
                        .fill(backgroundColor)
                        .frame(width: 40, height: 40)
                    
                    Text(letter)
                        .font(.headline)
                        .foregroundColor(textColor)
                }
                
                Text(text)
                    .font(.body)
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.leading)
                
                Spacer()
                
                if isCorrect == true {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else if isIncorrect {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.red)
                }
            }
            .padding()
            .background(borderColor)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(borderColor, lineWidth: 2)
            )
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var backgroundColor: Color {
        if isCorrect == true {
            return .green
        } else if isIncorrect {
            return .red
        } else if isSelected {
            return .orange
        } else {
            return Color(.systemGray5)
        }
    }
    
    private var textColor: Color {
        if isCorrect == true || isIncorrect || isSelected {
            return .white
        } else {
            return .primary
        }
    }
    
    private var borderColor: Color {
        if isCorrect == true {
            return .green.opacity(0.2)
        } else if isIncorrect {
            return .red.opacity(0.2)
        } else if isSelected {
            return .orange.opacity(0.2)
        } else {
            return .clear
        }
    }
}

struct ResultsView: View {
    let lesson: Lesson
    let totalQuestions: Int
    let correctAnswers: Int
    let onRetry: () -> Void
    let onExit: () -> Void
    
    private var percentage: Int {
        Int((Double(correctAnswers) / Double(totalQuestions)) * 100)
    }
    
    private var passed: Bool {
        percentage >= 80
    }
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            // Result Icon
            Image(systemName: passed ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(passed ? .green : .red)
            
            // Result Text
            VStack(spacing: 10) {
                Text(passed ? "Congratulations!" : "Keep Practicing")
                    .font(.title)
                    .fontWeight(.bold)
                
                Text("You scored \(percentage)%")
                    .font(.title2)
                    .foregroundColor(.secondary)
                
                Text("\(correctAnswers) out of \(totalQuestions) correct")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            // XP Reward (if passed)
            if passed {
                HStack {
                    Image(systemName: "star.fill")
                        .foregroundColor(.orange)
                    Text("+\(lesson.xpReward) XP")
                        .font(.headline)
                        .foregroundColor(.orange)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(10)
            }
            
            Spacer()
            
            // Action Buttons
            VStack(spacing: 12) {
                if passed {
                    Button(action: onExit) {
                        Text("Back to Lessons")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                } else {
                    Button(action: onRetry) {
                        Text("Try Again")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }
                    
                    Button(action: onExit) {
                        Text("Back to Lessons")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray5))
                            .foregroundColor(.primary)
                            .cornerRadius(10)
                    }
                }
            }
            .padding()
        }
        .padding()
    }
}

#Preview {
    NavigationView {
        QuestionView(
            lesson: Lesson(
                id: UUID(),
                title: "Understanding Court Spacing",
                description: nil,
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
            ),
            questions: [
                Question(
                    id: UUID(),
                    lessonId: UUID(),
                    questionText: "What is the ideal spacing between players?",
                    mediaType: .none,
                    mediaUrl: nil,
                    optionA: "5-10 feet",
                    optionB: "15-18 feet",
                    optionC: "20-25 feet",
                    optionD: "10-12 feet",
                    correctAnswer: "B",
                    explanation: "15-18 feet is optimal for creating driving lanes and passing angles.",
                    orderIndex: 1,
                    createdAt: Date(),
                    updatedAt: Date()
                )
            ]
        )
    }
}

