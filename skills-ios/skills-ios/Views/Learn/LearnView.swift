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
            if lessons.isEmpty {
                loadData()
            } else {
                // Refresh completed lessons when returning to this view
                refreshCompletedLessons()
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
    
    private func refreshCompletedLessons() {
        Task {
            do {
                completedLessonIds = try await APIService.shared.fetchCompletedLessons()
            } catch {
                print("Error refreshing completed lessons: \(error)")
            }
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
            // Background image properly contained
            GeometryReader { geometry in
                Image("learn-bg")
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
            }
            .ignoresSafeArea()
            
            // Dimming overlay
            Color.black.opacity(0.6)
                .ignoresSafeArea()
            
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
                    LessonPathStack(
                        lessons: lessons,
                        completedLessonIds: completedLessonIds,
                        isLessonUnlocked: isLessonUnlocked,
                        getNodeOffset: getNodeOffset
                    )
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
        .onAppear {
            refreshCompletedLessons()
        }
    }
    
    private func refreshCompletedLessons() {
        Task {
            do {
                let completed = try await APIService.shared.fetchCompletedLessons()
                await MainActor.run {
                    completedLessonIds = completed
                }
            } catch {
                print("Error refreshing completed lessons: \(error)")
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

// MARK: - Lesson Path Stack

private struct LessonPathStack: View {
    let lessons: [Lesson]
    let completedLessonIds: [UUID]
    let isLessonUnlocked: (Lesson, Int) -> Bool
    let getNodeOffset: (Int) -> CGFloat
    
    private let nodeSpacing: CGFloat = 140
    private let verticalPadding: CGFloat = 40
    private let nodeHeight: CGFloat = 80
    
    // Calculate exact content height to match VStack
    private var contentHeight: CGFloat {
        let nodesHeight = CGFloat(lessons.count) * nodeHeight
        let spacingHeight = CGFloat(max(lessons.count - 1, 0)) * nodeSpacing
        let paddingHeight = verticalPadding * 2
        return nodesHeight + spacingHeight + paddingHeight
    }
    
    var body: some View {
        ZStack {
            // Draw base gray curved path line (only if more than 1 lesson)
            if lessons.count > 1 {
                PathLineShape(
                    lessonCount: lessons.count,
                    nodeSpacing: nodeSpacing,
                    verticalPadding: verticalPadding,
                    nodeHeight: nodeHeight
                )
                .stroke(Color.gray.opacity(0.5), lineWidth: 6)
            }
            
            // Draw blue overlay for completed segments
            ForEach(0..<lessons.count, id: \.self) { index in
                if completedLessonIds.contains(lessons[index].id) && index < lessons.count - 1 {
                    PathSegmentShape(
                        fromIndex: index,
                        toIndex: index + 1,
                        lessonCount: lessons.count,
                        getNodeOffset: getNodeOffset,
                        nodeSpacing: nodeSpacing,
                        verticalPadding: verticalPadding,
                        nodeHeight: nodeHeight
                    )
                    .stroke(Color.blue, lineWidth: 6)
                }
            }
            
            // Lesson nodes
            VStack(spacing: nodeSpacing) {
                ForEach(Array(lessons.enumerated()), id: \.element.id) { index, lesson in
                    LessonNode(
                        lesson: lesson,
                        index: index,
                        isCompleted: completedLessonIds.contains(lesson.id),
                        isLocked: !isLessonUnlocked(lesson, index)
                    )
                    .offset(x: getNodeOffset(index))
                }
            }
            .padding(.vertical, verticalPadding)
        }
        .frame(height: contentHeight)
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
    let nodeSpacing: CGFloat
    let verticalPadding: CGFloat
    let nodeHeight: CGFloat
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        guard lessonCount > 1 else { return path }
        
        let centerX = rect.width / 2
        let amplitude: CGFloat = 80
        
        // First node center Y position (padding + half of first node)
        let firstNodeY = verticalPadding + (nodeHeight / 2)
        
        // Start at first node position
        let firstX = centerX + getOffset(for: 0, amplitude: amplitude)
        path.move(to: CGPoint(x: firstX, y: firstNodeY))
        
        for i in 1..<lessonCount {
            // Each subsequent node is nodeHeight + nodeSpacing away
            let currentY = firstNodeY + CGFloat(i) * (nodeHeight + nodeSpacing) - (nodeHeight / 2) * CGFloat(i) + (nodeHeight / 2) * CGFloat(i - 1)
            // Simplified: node centers are spaced by (nodeSpacing + nodeHeight) but VStack spacing is between nodes
            // Actually VStack spacing is the gap between nodes, so center-to-center = nodeHeight + nodeSpacing... no wait
            // VStack spacing is the space BETWEEN items, so center-to-center = nodeHeight/2 + spacing + nodeHeight/2 = nodeHeight + spacing
            // But our nodes are 80 tall with spacing 140, so center-to-center = 80/2 + 140 + 80/2 = 40 + 140 + 40 = 220? 
            let nodeY = verticalPadding + (nodeHeight / 2) + CGFloat(i) * (nodeHeight + nodeSpacing)
            let previousY = verticalPadding + (nodeHeight / 2) + CGFloat(i - 1) * (nodeHeight + nodeSpacing)
            
            let previousX = centerX + getOffset(for: i - 1, amplitude: amplitude)
            let currentX = centerX + getOffset(for: i, amplitude: amplitude)
            
            let segmentHeight = nodeY - previousY
            
            // Control points for S-curve - push control points further for more pronounced curve
            let control1 = CGPoint(
                x: previousX,
                y: previousY + segmentHeight * 0.75
            )
            
            let control2 = CGPoint(
                x: currentX,
                y: nodeY - segmentHeight * 0.75
            )
            
            path.addCurve(
                to: CGPoint(x: currentX, y: nodeY),
                control1: control1,
                control2: control2
            )
        }
        
        return path
    }
    
    private func getOffset(for index: Int, amplitude: CGFloat) -> CGFloat {
        let position = index % 4
        switch position {
        case 0: return 0
        case 1: return amplitude
        case 2: return -amplitude
        case 3: return amplitude / 2
        default: return 0
        }
    }
}

// MARK: - Path Segment Shape (for blue overlays)

private struct PathSegmentShape: Shape {
    let fromIndex: Int
    let toIndex: Int
    let lessonCount: Int
    let getNodeOffset: (Int) -> CGFloat
    let nodeSpacing: CGFloat
    let verticalPadding: CGFloat
    let nodeHeight: CGFloat
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        guard fromIndex < toIndex, lessonCount > 1 else { return path }
        
        let centerX = rect.width / 2
        
        // Calculate node center positions
        // Node i center: verticalPadding + nodeHeight/2 + i * (nodeHeight + nodeSpacing)
        let fromY = verticalPadding + (nodeHeight / 2) + CGFloat(fromIndex) * (nodeHeight + nodeSpacing)
        let toY = verticalPadding + (nodeHeight / 2) + CGFloat(toIndex) * (nodeHeight + nodeSpacing)
        let fromX = centerX + getNodeOffset(fromIndex)
        let toX = centerX + getNodeOffset(toIndex)
        
        let segmentHeight = toY - fromY
        
        // Start at the from position
        path.move(to: CGPoint(x: fromX, y: fromY))
        
        // Control points for S-curve - push control points further for more pronounced curve
        let control1 = CGPoint(
            x: fromX,
            y: fromY + segmentHeight * 0.75
        )
        
        let control2 = CGPoint(
            x: toX,
            y: toY - segmentHeight * 0.75
        )
        
        path.addCurve(
            to: CGPoint(x: toX, y: toY),
            control1: control1,
            control2: control2
        )
        
        return path
    }
}

#Preview {
    LearnView()
}

