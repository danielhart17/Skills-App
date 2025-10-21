//
//  MainTabView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct MainTabView: View {
    @StateObject private var authService = AuthService.shared
    
    var body: some View {
        TabView {
            // Admin Dashboard (admins only)
            if authService.isAdmin() {
                AdminDashboardView()
                    .tabItem {
                        Label("Admin", systemImage: "shield.fill")
                    }
            }
            
            // Trainer Dashboard (trainers and admins)
            if authService.isTrainer() {
                TrainerDashboardView()
                    .tabItem {
                        Label("Dashboard", systemImage: "chart.bar.fill")
                    }
            }
            
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
        .accentColor(.orange)
    }
}

#Preview {
    MainTabView()
}

