//
//  EntryExamView.swift
//  skills-ios
//
//  Entry exam for new users to assess their skill level
//

import SwiftUI

struct EntryExamView: View {
    @StateObject private var viewModel = EntryExamViewModel()
    @Binding var isExamCompleted: Bool
    
    var body: some View {
        ZStack {
            // Gradient background
            LinearGradient(
                colors: [Color.black, Color(hex: "#1a1a2e"), Color.black],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            switch viewModel.phase {
            case .loading:
                LoadingView()
                
            case .intro:
                ExamIntroView(onStart: viewModel.startExam)
                
            case .exam:
                ExamQuestionView(viewModel: viewModel)
                
            case .results:
                ExamResultsView(viewModel: viewModel, onContinue: {
                    isExamCompleted = true
                })
            }
        }
    }
}

// MARK: - View Model

class EntryExamViewModel: ObservableObject {
    enum Phase {
        case loading, intro, exam, results
    }
    
    @Published var phase: Phase = .loading
    @Published var questions: [ExamQuestion] = []
    @Published var currentQuestionIndex = 0
    @Published var selectedAnswer: String? = nil
    @Published var hasAnswered = false
    @Published var userAnswers: [ExamAnswerRecord] = []
    @Published var examResult: ExamResultData? = nil
    
    private var startTime: Date?
    
    var currentQuestion: ExamQuestion? {
        guard currentQuestionIndex < questions.count else { return nil }
        return questions[currentQuestionIndex]
    }
    
    var progress: Double {
        guard !questions.isEmpty else { return 0 }
        return Double(currentQuestionIndex + 1) / Double(questions.count)
    }
    
    init() {
        loadQuestions()
    }
    
    func loadQuestions() {
        Task { @MainActor in
            do {
                // Check if already completed
                let hasCompleted = try await APIService.shared.hasCompletedEntryExam()
                if hasCompleted {
                    // Already completed, skip to results or mark as done
                    self.phase = .results
                    return
                }
                
                // Load questions
                let allQuestions = try await APIService.shared.fetchExamQuestions()
                
                // Separate and shuffle by difficulty
                let beginnerQs = allQuestions.filter { $0.difficulty == .beginner }.shuffled().prefix(4)
                let intermediateQs = allQuestions.filter { $0.difficulty == .intermediate }.shuffled().prefix(4)
                let advancedQs = allQuestions.filter { $0.difficulty == .advanced }.shuffled().prefix(4)
                
                self.questions = Array(beginnerQs) + Array(intermediateQs) + Array(advancedQs)
                self.phase = .intro
            } catch {
                print("Error loading exam questions: \(error)")
                self.phase = .intro
            }
        }
    }
    
    func startExam() {
        startTime = Date()
        phase = .exam
    }
    
    func selectAnswer(_ answer: String) {
        guard !hasAnswered else { return }
        selectedAnswer = answer
    }
    
    func submitAnswer() {
        guard let answer = selectedAnswer, let question = currentQuestion, !hasAnswered else { return }
        
        hasAnswered = true
        let isCorrect = answer == question.correctAnswer
        
        let record = ExamAnswerRecord(
            questionId: question.id,
            difficulty: question.difficulty,
            answer: answer,
            isCorrect: isCorrect
        )
        userAnswers.append(record)
    }
    
    func nextQuestion() {
        if currentQuestionIndex < questions.count - 1 {
            currentQuestionIndex += 1
            selectedAnswer = nil
            hasAnswered = false
        } else {
            finishExam()
        }
    }
    
    func finishExam() {
        let timeSpent = Int(Date().timeIntervalSince(startTime ?? Date()))
        
        let beginnerCorrect = userAnswers.filter { $0.difficulty == .beginner && $0.isCorrect }.count
        let intermediateCorrect = userAnswers.filter { $0.difficulty == .intermediate && $0.isCorrect }.count
        let advancedCorrect = userAnswers.filter { $0.difficulty == .advanced && $0.isCorrect }.count
        
        let totalCorrect = beginnerCorrect + intermediateCorrect + advancedCorrect
        let totalQuestions = questions.count
        let percentage = totalQuestions > 0 ? (totalCorrect * 100) / totalQuestions : 0
        
        // Calculate XP and Level
        let startingXP = (beginnerCorrect * 10) + (intermediateCorrect * 25) + (advancedCorrect * 50)
        let startingLevel: Int
        if startingXP <= 50 { startingLevel = 1 }
        else if startingXP <= 150 { startingLevel = 2 }
        else if startingXP <= 300 { startingLevel = 3 }
        else { startingLevel = 4 }
        
        examResult = ExamResultData(
            beginnerCorrect: beginnerCorrect,
            intermediateCorrect: intermediateCorrect,
            advancedCorrect: advancedCorrect,
            totalCorrect: totalCorrect,
            totalQuestions: totalQuestions,
            percentage: percentage,
            startingXP: startingXP,
            startingLevel: startingLevel,
            timeSpent: timeSpent
        )
        
        // Save to database
        Task {
            do {
                try await APIService.shared.submitEntryExamResult(
                    beginnerCorrect: beginnerCorrect,
                    intermediateCorrect: intermediateCorrect,
                    advancedCorrect: advancedCorrect,
                    totalCorrect: totalCorrect,
                    percentage: percentage,
                    startingXP: startingXP,
                    startingLevel: startingLevel,
                    timeSpent: timeSpent
                )
            } catch {
                print("Error saving exam result: \(error)")
            }
        }
        
        phase = .results
    }
}

struct ExamResultData {
    let beginnerCorrect: Int
    let intermediateCorrect: Int
    let advancedCorrect: Int
    let totalCorrect: Int
    let totalQuestions: Int
    let percentage: Int
    let startingXP: Int
    let startingLevel: Int
    let timeSpent: Int
}

// MARK: - Loading View

private struct LoadingView: View {
    var body: some View {
        VStack {
            Image(systemName: "basketball.fill")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            Text("Loading Assessment...")
                .foregroundColor(.gray)
                .padding(.top)
        }
    }
}

// MARK: - Intro View

private struct ExamIntroView: View {
    let onStart: () -> Void
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // Icon
            ZStack {
                Circle()
                    .fill(LinearGradient(
                        colors: [.orange, .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(width: 100, height: 100)
                
                Image(systemName: "target")
                    .font(.system(size: 50))
                    .foregroundColor(.white)
            }
            
            Text("Skills Assessment")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Text("Let's see where you're at!")
                .foregroundColor(.gray)
            
            // How it works
            VStack(alignment: .leading, spacing: 16) {
                Text("How It Works:")
                    .font(.headline)
                    .foregroundColor(.white)
                
                DifficultyRow(
                    count: 4,
                    label: "Beginner",
                    xp: 10,
                    color: .green
                )
                DifficultyRow(
                    count: 4,
                    label: "Intermediate",
                    xp: 25,
                    color: .yellow
                )
                DifficultyRow(
                    count: 4,
                    label: "Advanced",
                    xp: 50,
                    color: .red
                )
            }
            .padding()
            .background(Color.white.opacity(0.1))
            .cornerRadius(12)
            .padding(.horizontal)
            
            // XP Banner
            HStack {
                Image(systemName: "bolt.fill")
                    .foregroundColor(.yellow)
                Text("Earn up to 340 XP!")
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
            }
            .padding()
            .background(Color.blue.opacity(0.2))
            .cornerRadius(8)
            
            Text("Your answers will determine your starting level and XP.")
                .font(.caption)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Spacer()
            
            // Start Button
            Button(action: onStart) {
                HStack {
                    Text("Start Assessment")
                        .fontWeight(.semibold)
                    Image(systemName: "arrow.right")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.orange)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 40)
        }
    }
}

private struct DifficultyRow: View {
    let count: Int
    let label: String
    let xp: Int
    let color: Color
    
    var body: some View {
        HStack {
            ZStack {
                Circle()
                    .fill(color.opacity(0.2))
                    .frame(width: 30, height: 30)
                Text("\(count)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(color)
            }
            
            Text(label)
                .foregroundColor(color)
                .fontWeight(.semibold)
            
            Text("questions (\(xp) XP each)")
                .foregroundColor(.gray)
            
            Spacer()
        }
    }
}

// MARK: - Question View

private struct ExamQuestionView: View {
    @ObservedObject var viewModel: EntryExamViewModel
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 12) {
                HStack {
                    Text("Skills Assessment")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    if let question = viewModel.currentQuestion {
                        DifficultyBadge(difficulty: question.difficulty)
                    }
                }
                
                HStack {
                    Text("Question \(viewModel.currentQuestionIndex + 1) of \(viewModel.questions.count)")
                        .font(.caption)
                        .foregroundColor(.gray)
                    Spacer()
                }
                
                ProgressView(value: viewModel.progress)
                    .tint(.orange)
            }
            .padding()
            
            ScrollView {
                if let question = viewModel.currentQuestion {
                    VStack(alignment: .leading, spacing: 20) {
                        // Question text
                        Text(question.questionText)
                            .font(.title3)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        // Media (if any)
                        if let mediaUrl = question.mediaUrl, !mediaUrl.isEmpty {
                            if question.mediaType == "image" {
                                AsyncImage(url: URL(string: mediaUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fit)
                                        .cornerRadius(8)
                                } placeholder: {
                                    ProgressView()
                                }
                                .frame(maxHeight: 200)
                            }
                        }
                        
                        // Options
                        VStack(spacing: 12) {
                            AnswerOption(
                                letter: "A",
                                text: question.optionA,
                                isSelected: viewModel.selectedAnswer == "A",
                                isCorrect: question.correctAnswer == "A",
                                hasAnswered: viewModel.hasAnswered,
                                onTap: { viewModel.selectAnswer("A") }
                            )
                            AnswerOption(
                                letter: "B",
                                text: question.optionB,
                                isSelected: viewModel.selectedAnswer == "B",
                                isCorrect: question.correctAnswer == "B",
                                hasAnswered: viewModel.hasAnswered,
                                onTap: { viewModel.selectAnswer("B") }
                            )
                            AnswerOption(
                                letter: "C",
                                text: question.optionC,
                                isSelected: viewModel.selectedAnswer == "C",
                                isCorrect: question.correctAnswer == "C",
                                hasAnswered: viewModel.hasAnswered,
                                onTap: { viewModel.selectAnswer("C") }
                            )
                            AnswerOption(
                                letter: "D",
                                text: question.optionD,
                                isSelected: viewModel.selectedAnswer == "D",
                                isCorrect: question.correctAnswer == "D",
                                hasAnswered: viewModel.hasAnswered,
                                onTap: { viewModel.selectAnswer("D") }
                            )
                        }
                        
                        // Explanation (after answering)
                        if viewModel.hasAnswered, let explanation = question.explanation, !explanation.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Explanation:")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.blue)
                                Text(explanation)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                        }
                    }
                    .padding()
                }
            }
            
            // Action Button
            VStack(spacing: 12) {
                if !viewModel.hasAnswered {
                    Button(action: viewModel.submitAnswer) {
                        Text("Submit Answer")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(viewModel.selectedAnswer != nil ? Color.blue : Color.gray)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                    }
                    .disabled(viewModel.selectedAnswer == nil)
                } else {
                    Button(action: viewModel.nextQuestion) {
                        HStack {
                            Text(viewModel.currentQuestionIndex < viewModel.questions.count - 1 ? "Next Question" : "View Results")
                                .fontWeight(.semibold)
                            Image(systemName: "arrow.right")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.orange)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                }
                
                // XP indicator
                if let question = viewModel.currentQuestion {
                    HStack {
                        Image(systemName: "bolt.fill")
                            .foregroundColor(.yellow)
                        Text("+\(question.difficulty.xpValue) XP for correct answer")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
            .padding()
        }
    }
}

private struct DifficultyBadge: View {
    let difficulty: ExamDifficulty
    
    var color: Color {
        switch difficulty {
        case .beginner: return .green
        case .intermediate: return .yellow
        case .advanced: return .red
        }
    }
    
    var body: some View {
        Text(difficulty.displayName)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundColor(color)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(color.opacity(0.2))
            .cornerRadius(12)
    }
}

private struct AnswerOption: View {
    let letter: String
    let text: String
    let isSelected: Bool
    let isCorrect: Bool
    let hasAnswered: Bool
    let onTap: () -> Void
    
    var backgroundColor: Color {
        if !hasAnswered {
            return isSelected ? Color.blue.opacity(0.3) : Color.white.opacity(0.1)
        }
        if isCorrect {
            return Color.green.opacity(0.3)
        }
        if isSelected && !isCorrect {
            return Color.red.opacity(0.3)
        }
        return Color.white.opacity(0.05)
    }
    
    var borderColor: Color {
        if !hasAnswered {
            return isSelected ? Color.blue : Color.gray.opacity(0.3)
        }
        if isCorrect {
            return Color.green
        }
        if isSelected && !isCorrect {
            return Color.red
        }
        return Color.gray.opacity(0.2)
    }
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                Text(letter + ".")
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                Text(text)
                    .foregroundColor(.white)
                Spacer()
                if hasAnswered {
                    if isCorrect {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    } else if isSelected {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.red)
                    }
                }
            }
            .padding()
            .background(backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(borderColor, lineWidth: 2)
            )
            .cornerRadius(12)
        }
        .disabled(hasAnswered)
    }
}

// MARK: - Results View

private struct ExamResultsView: View {
    @ObservedObject var viewModel: EntryExamViewModel
    let onContinue: () -> Void
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer().frame(height: 40)
                
                // Trophy
                ZStack {
                    Circle()
                        .fill(LinearGradient(
                            colors: [.yellow, .orange],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))
                        .frame(width: 100, height: 100)
                    
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.white)
                }
                
                Text("Assessment Complete!")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text("Here's how you did")
                    .foregroundColor(.gray)
                
                if let result = viewModel.examResult {
                    // Score breakdown
                    HStack(spacing: 16) {
                        ScoreCard(
                            correct: result.beginnerCorrect,
                            total: 4,
                            label: "Beginner",
                            color: .green
                        )
                        ScoreCard(
                            correct: result.intermediateCorrect,
                            total: 4,
                            label: "Intermediate",
                            color: .yellow
                        )
                        ScoreCard(
                            correct: result.advancedCorrect,
                            total: 4,
                            label: "Advanced",
                            color: .red
                        )
                    }
                    .padding(.horizontal)
                    
                    // Level and XP
                    HStack(spacing: 32) {
                        VStack {
                            HStack {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                Text("Level \(result.startingLevel)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                            Text("Starting Level")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        
                        VStack {
                            HStack {
                                Image(systemName: "bolt.fill")
                                    .foregroundColor(.blue)
                                Text("\(result.startingXP)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                            }
                            Text("Starting XP")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                    .padding()
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(12)
                    
                    // Encouragement
                    VStack(spacing: 8) {
                        HStack {
                            Image(systemName: "medal.fill")
                                .foregroundColor(.orange)
                            Text(encouragementMessage(percentage: result.percentage))
                                .fontWeight(.semibold)
                                .foregroundColor(.orange)
                        }
                        Text(encouragementSubtitle(percentage: result.percentage))
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                
                Spacer().frame(height: 20)
                
                // Continue Button
                Button(action: onContinue) {
                    HStack {
                        Text("Start Learning")
                            .fontWeight(.semibold)
                        Image(systemName: "arrow.right")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .padding(.horizontal, 32)
                
                Spacer().frame(height: 40)
            }
        }
    }
    
    func encouragementMessage(percentage: Int) -> String {
        if percentage >= 80 { return "Outstanding!" }
        if percentage >= 60 { return "Great job!" }
        if percentage >= 40 { return "Good start!" }
        return "Let's get learning!"
    }
    
    func encouragementSubtitle(percentage: Int) -> String {
        if percentage >= 80 { return "You have excellent basketball knowledge!" }
        return "Keep learning and you'll master these concepts in no time!"
    }
}

private struct ScoreCard: View {
    let correct: Int
    let total: Int
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text("\(correct)/\(total)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(label)
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(color.opacity(0.1))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
        .cornerRadius(12)
    }
}

#Preview {
    EntryExamView(isExamCompleted: .constant(false))
}
