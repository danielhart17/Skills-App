//
//  MainTabView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct MainTabView: View {
    @StateObject private var authService = AuthService.shared
    
    init() {
        // Configure tab bar appearance to match web version
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Color.appBackground)
        
        // Selected tab color - use the orange from the gradient
        // Note: UITabBar doesn't support gradients natively, so we use the primary orange color
        // For a true gradient effect on the icon, you'd need a custom tab bar
        UITabBar.appearance().tintColor = UIColor(Color.brandOrange)
        
        // Unselected tab color
        UITabBar.appearance().unselectedItemTintColor = UIColor(Color.textSecondary)
        
        UITabBar.appearance().standardAppearance = appearance
        if #available(iOS 15.0, *) {
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
    
    var body: some View {
        TabView {
            // Admin Dashboard (admins only)
            if authService.isAdmin() {
                AdminDashboardView()
                    .tabItem {
                        Label("Admin", systemImage: "shield.fill")
                    }
                
                // Admins see all user tabs
                LearnView()
                    .tabItem {
                        Label("Learn", systemImage: "book.fill")
                    }
                
                ChallengesView()
                    .tabItem {
                        Label("Challenges", systemImage: "target")
                    }
                
                TrainersView()
                    .tabItem {
                        Label("Trainers", systemImage: "person.3.fill")
                    }
                
                EventsView()
                    .tabItem {
                        Label("Events", systemImage: "calendar")
                    }
            }
            // Trainer Dashboard (trainers only)
            else if authService.isTrainer() {
                TrainerDashboardView()
                    .tabItem {
                        Label("Dashboard", systemImage: "chart.bar.fill")
                    }
                
                NavigationView {
                    ProfileView()
                }
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
            }
            // Regular users see all standard tabs
            else {
                LearnView()
                    .tabItem {
                        Label("Learn", systemImage: "book.fill")
                    }
                
                ChallengesView()
                    .tabItem {
                        Label("Challenges", systemImage: "target")
                    }
                
                TrainersView()
                    .tabItem {
                        Label("Trainers", systemImage: "person.3.fill")
                    }
                
                EventsView()
                    .tabItem {
                        Label("Events", systemImage: "calendar")
                    }
            }
        }
        .accentColor(.brandOrange)
    }
}

#Preview {
    MainTabView()
}

