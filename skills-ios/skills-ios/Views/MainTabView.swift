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
            
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
            
            IQModeView()
                .tabItem {
                    Label("IQ Mode", systemImage: "brain.head.profile")
                }
            
            ChallengesView()
                .tabItem {
                    Label("Challenges", systemImage: "target")
                }
            
            EventsView()
                .tabItem {
                    Label("Events", systemImage: "calendar")
                }
            
            TrainersView()
                .tabItem {
                    Label("Trainers", systemImage: "person.3.fill")
                }
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
        }
        .accentColor(.orange)
    }
}

#Preview {
    MainTabView()
}

