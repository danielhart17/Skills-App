//
//  MainTabView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct MainTabView: View {
    @StateObject private var authService = AuthService.shared
    @StateObject private var unreadStore = UnreadCountStore.shared

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
            // Guests: browse-only tabs + sign in (App Store Guideline 5.1.1)
            if !authService.isAuthenticated {
                TrainersView()
                    .tabItem {
                        Label("Trainers", systemImage: "person.3.fill")
                    }

                EventsView()
                    .tabItem {
                        Label("Events", systemImage: "calendar")
                    }

                AuthView()
                    .tabItem {
                        Label("Sign In", systemImage: "person.circle.fill")
                    }
            }
            // Admin Dashboard (admins only)
            else if authService.isAdmin() {
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
                        Label("Workouts", systemImage: "target")
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
            // Parents follow their athletes; no schedule/workouts of their own
            else if authService.isParent() {
                ParentDashboardView()
                    .tabItem {
                        Label("Athletes", systemImage: "figure.2.and.child.holdinghands")
                    }

                TrainersView()
                    .tabItem {
                        Label("Trainers", systemImage: "person.3.fill")
                    }

                EventsView()
                    .tabItem {
                        Label("Events", systemImage: "calendar")
                    }

                NavigationView {
                    ProfileView()
                }
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
            }
            // Trainer Dashboard (trainers only)
            else if authService.isTrainer() {
                TrainerDashboardView()
                    .tabItem {
                        Label("Dashboard", systemImage: "chart.bar.fill")
                    }

                TrainerAthletesView()
                    .tabItem {
                        Label("Athletes", systemImage: "person.2.fill")
                    }

                ConversationsListView()
                    .tabItem {
                        Label("Messages", systemImage: "message.fill")
                    }
                    .badge(unreadStore.total)

                NavigationView {
                    ProfileView()
                }
                .tabItem {
                    Label("Profile", systemImage: "person.circle.fill")
                }
            }
            // Regular users: Schedule, Workouts, Learn, Trainers visible;
            // Events + Messages land under the system More tab.
            else {
                ScheduleView()
                    .tabItem {
                        Label("Schedule", systemImage: "calendar.badge.checkmark")
                    }

                ChallengesView()
                    .tabItem {
                        Label("Workouts", systemImage: "target")
                    }

                LearnView()
                    .tabItem {
                        Label("Learn", systemImage: "book.fill")
                    }

                TrainersView()
                    .tabItem {
                        Label("Trainers", systemImage: "person.3.fill")
                    }

                EventsView()
                    .tabItem {
                        Label("Events", systemImage: "calendar")
                    }

                ConversationsListView()
                    .tabItem {
                        Label("Messages", systemImage: "message.fill")
                    }
                    .badge(unreadStore.total)

                RunTrackerView()
                    .tabItem {
                        Label("Run", systemImage: "figure.run")
                    }
            }
        }
        .accentColor(.brandOrange)
        .task {
            if authService.isAuthenticated {
                await unreadStore.refresh()
            }
        }
    }
}

#Preview {
    MainTabView()
}

