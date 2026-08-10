//
//  skills_iosApp.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

@main
struct skills_iosApp: App {
    @StateObject private var authService = AuthService.shared
    @State private var entryExamCompleted = false
    
    init() {
        // Apply dark theme globally
        setupAppearance()
    }
    
    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isLoading {
                    LoadingView()
                } else if authService.isAuthenticated {
                    // Check if user needs to complete entry exam (only for regular users)
                    if let user = authService.currentUser,
                       user.role == .user,
                       !user.entryExamCompleted,
                       !entryExamCompleted {
                        EntryExamView(isExamCompleted: $entryExamCompleted)
                    } else {
                        MainTabView()
                    }
                } else {
                    // Guests browse Trainers/Events (App Store 5.1.1); MainTabView shows the guest tabs
                    MainTabView()
                }
            }
            .preferredColorScheme(.dark)
            .onChange(of: authService.currentUser?.entryExamCompleted) { _, newValue in
                if newValue == true {
                    entryExamCompleted = true
                }
            }
        }
    }
    
    private func setupAppearance() {
        // Configure navigation bar appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.appBackground)
        appearance.titleTextAttributes = [.foregroundColor: UIColor(Color.textPrimary)]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor(Color.textPrimary)]
        
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        
        // Configure tab bar appearance
        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithOpaqueBackground()
        tabBarAppearance.backgroundColor = UIColor(Color.cardBackground)
        
        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        
        // Set tint colors
        UITabBar.appearance().tintColor = UIColor(Color.brandOrange)
        UITabBar.appearance().unselectedItemTintColor = UIColor(Color.textSecondary)
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            
            VStack(spacing: 20) {
                Image(systemName: "basketball.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.brandOrange)
                
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.brandOrange)
                
                Text("Loading...")
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
            }
        }
    }
}
