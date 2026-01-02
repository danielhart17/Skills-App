//
//  LearnView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct LearnView: View {
    @State private var selectedMode: LessonMode = .iq
    
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
                
                // Show chapters list for selected mode
                ChaptersListView(mode: selectedMode)
            }
            .background(Color.appBackground)
            .navigationTitle("Learn")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: ProfileView()) {
                        Image(systemName: "person.circle.fill")
                            .font(.title2)
                            .foregroundColor(.brandOrange)
                    }
                }
            }
        }
    }
}

// MARK: - Chapters List View

struct ChaptersListView: View {
    let mode: LessonMode
    @State private var lessons: [Lesson] = []
    @State private var completedLessonIds: [UUID] = []
    @State private var isLoading = true
    
    var chapters: [(name: String, lessons: [Lesson])] {
        let filtered = lessons.filter { $0.mode == mode }
        let grouped = Dictionary(grouping: filtered) { $0.chapter ?? "Other" }
        return grouped.map { (name: $0.key, lessons: $0.value.sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }) }
            .sorted { $0.name < $1.name }
    }
    
    var body: some View {
        VStack {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        ForEach(chapters, id: \.name) { chapter in
                            NavigationLink(destination: ChapterPathView(
                                chapterName: chapter.name,
                                lessons: chapter.lessons,
                                completedLessonIds: $completedLessonIds,
                                mode: mode
                            )) {
                                ChapterCard(
                                    chapterName: chapter.name,
                                    lessonCount: chapter.lessons.count,
                                    completedCount: chapter.lessons.filter { completedLessonIds.contains($0.id) }.count
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding()
                }
            }
        }
        .onAppear {
            loadData()
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

// MARK: - Chapter Card

private struct ChapterCard: View {
    let chapterName: String
    let lessonCount: Int
    let completedCount: Int
    
    var progressPercentage: Double {
        guard lessonCount > 0 else { return 0 }
        return Double(completedCount) / Double(lessonCount)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                // Basketball icon for chapter
                Image(systemName: "basketball.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.brandOrange)
                    .frame(width: 60, height: 60)
                    .background(Color.brandOrange.opacity(0.2))
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(chapterName)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.textPrimary)
                    
                    Text("\(completedCount) / \(lessonCount) Complete")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.textSecondary)
            }
            
            // Progress bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 8)
                        .cornerRadius(4)
                    
                    Rectangle()
                        .fill(Color.brandOrange)
                        .frame(width: geometry.size.width * progressPercentage, height: 8)
                        .cornerRadius(4)
                }
            }
            .frame(height: 8)
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(12)
    }
}

// MARK: - Chapter Path View (Duolingo-style)

struct ChapterPathView: View {
    let chapterName: String
    let lessons: [Lesson]
    @Binding var completedLessonIds: [UUID]
    let mode: LessonMode
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        ZStack {
            // Background
            Color.appBackground.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    // Start button at top
                    Button(action: {
                        // Start with first lesson
                        if let firstLesson = lessons.first {
                            // Navigate to lesson - handled by NavigationLink below
                        }
                    }) {
                        Text("START")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 32)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(8)
                    }
                    .padding(.top, 20)
                    
                    // Line from START to first node
                    Path { path in
                        path.move(to: CGPoint(x: UIScreen.main.bounds.width / 2, y: 0))
                        path.addLine(to: CGPoint(x: UIScreen.main.bounds.width / 2, y: 75))
                    }
                    .stroke(Color.blue, lineWidth: 6)
                    .frame(height: 10)
                    
                    // Lesson path
                    ZStack {
                        // Draw base gray curved path line
                        PathLineShape(lessonCount: lessons.count)
                            .stroke(Color.gray.opacity(0.5), lineWidth: 6)
                            .frame(height: CGFloat(lessons.count * 180))
                        
                        // Draw blue overlay for completed segments
                        ForEach(0..<lessons.count, id: \.self) { index in
                            if completedLessonIds.contains(lessons[index].id) {
                                // Draw segment from this completed lesson to the next
                                PathSegmentShape(
                                    fromIndex: index,
                                    toIndex: min(index + 1, lessons.count - 1),
                                    lessonCount: lessons.count,
                                    getNodeOffset: getNodeOffset
                                )
                                .stroke(Color.blue, lineWidth: 6)
                                .frame(height: CGFloat(lessons.count * 180))
                            }
                        }
                        
                        // Lesson nodes
                        VStack(spacing: 140) {
                            ForEach(Array(lessons.enumerated()), id: \.element.id) { index, lesson in
                                LessonNode(
                                    lesson: lesson,
                                    index: index,
                                    isCompleted: completedLessonIds.contains(lesson.id),
                                    isLocked: !isLessonUnlocked(lesson: lesson, index: index)
                                )
                                .offset(x: getNodeOffset(index: index))
                            }
                        }
                        .padding(.vertical, 40)
                    }
                }
            }
        }
        .navigationTitle(chapterName)
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(false)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 8) {
                    Image(systemName: "trophy.fill")
                        .foregroundColor(.yellow)
                    Text("\(completedLessonIds.filter { id in lessons.contains { $0.id == id } }.count)/\(lessons.count) Complete")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.textPrimary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.blue)
                .cornerRadius(20)
            }
        }
    }
    
    private func isLessonUnlocked(lesson: Lesson, index: Int) -> Bool {
        // First lesson is always unlocked
        if index == 0 {
            return true
        }
        
        // Check if previous lesson is completed
        if index > 0 {
            let previousLesson = lessons[index - 1]
            return completedLessonIds.contains(previousLesson.id)
        }
        
        return false
    }
    
    private func getNodeOffset(index: Int) -> CGFloat {
        // Alternate left and right with increasing offset
        let baseOffset: CGFloat = 80
        let position = index % 4
        
        switch position {
        case 0: return 0
        case 1: return baseOffset
        case 2: return -baseOffset
        case 3: return baseOffset / 2
        default: return 0
        }
    }
}

// MARK: - Lesson Node

private struct LessonNode: View {
    let lesson: Lesson
    let index: Int
    let isCompleted: Bool
    let isLocked: Bool
    
    var body: some View {
        NavigationLink(
            destination: LessonDetailView(lesson: lesson),
            label: {
                ZStack {
                    // Node circle
                    Circle()
                        .fill(isCompleted ? Color.green : (isLocked ? Color.gray : Color.brandOrange))
                        .frame(width: 80, height: 80)
                        .overlay(
                            Circle()
                                .stroke(Color.white, lineWidth: 4)
                        )
                    
                    // Icon
                    if isLocked {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                    } else if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 32))
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    } else {
                        Image(systemName: "basketball.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                    }
                }
            }
        )
        .disabled(isLocked)
        .overlay(
            // Lesson title below node
            Text(lesson.title)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.textPrimary)
                .multilineTextAlignment(.center)
                .frame(width: 120)
                .offset(y: 55)
        )
    }
}

// MARK: - Path Lines View

private struct PathLineShape: Shape {
    let lessonCount: Int
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let segmentHeight = rect.height / CGFloat(max(lessonCount - 1, 1))
        let centerX = rect.width / 2
        let amplitude: CGFloat = 80
        
        // Start at first node position
        path.move(to: CGPoint(x: centerX, y: 0))
        
        for i in 1..<lessonCount {
            let y = CGFloat(i) * segmentHeight
            let previousY = CGFloat(i - 1) * segmentHeight
            
            // Get current and previous X positions
            let previousPosition = (i - 1) % 4
            let currentPosition = i % 4
            
            var previousX: CGFloat
            switch previousPosition {
            case 1: previousX = centerX + amplitude
            case 2: previousX = centerX - amplitude
            case 3: previousX = centerX + amplitude / 2
            default: previousX = centerX
            }
            
            var currentX: CGFloat
            switch currentPosition {
            case 1: currentX = centerX + amplitude
            case 2: currentX = centerX - amplitude
            case 3: currentX = centerX + amplitude / 2
            default: currentX = centerX
            }
            
            // Create S-curve with more pronounced bending
            let midY = (previousY + y) / 2
            
            // Control points create the S-shape
            // First control point closer to the starting point
            let control1 = CGPoint(
                x: previousX,
                y: previousY + segmentHeight * 0.9
            )
            
            // Second control point closer to the ending point
            let control2 = CGPoint(
                x: currentX,
                y: y - segmentHeight * 0.9
            )
            
            path.addCurve(
                to: CGPoint(x: currentX, y: y),
                control1: control1,
                control2: control2
            )
        }
        
        return path
    }
}

// MARK: - Path Segment Shape (for blue overlays)

private struct PathSegmentShape: Shape {
    let fromIndex: Int
    let toIndex: Int
    let lessonCount: Int
    let getNodeOffset: (Int) -> CGFloat
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        // Only draw if there's a next lesson
        if fromIndex >= toIndex {
            return path
        }
        
        let segmentHeight = rect.height / CGFloat(max(lessonCount - 1, 1))
        let centerX = rect.width / 2
        
        // Calculate positions
        let startY = CGFloat(fromIndex) * segmentHeight
        let endY = CGFloat(toIndex) * segmentHeight
        let startX = centerX + getNodeOffset(fromIndex)
        let endX = centerX + getNodeOffset(toIndex)
        
        // Start at the from position
        path.move(to: CGPoint(x: startX, y: startY))
        
        // Create S-curve to match the main path
        let control1 = CGPoint(
            x: startX,
            y: startY + segmentHeight * 0.9
        )
        
        let control2 = CGPoint(
            x: endX,
            y: endY - segmentHeight * 0.9
        )
        
        path.addCurve(
            to: CGPoint(x: endX, y: endY),
            control1: control1,
            control2: control2
        )
        
        return path
    }
}

#Preview {
    LearnView()
}

