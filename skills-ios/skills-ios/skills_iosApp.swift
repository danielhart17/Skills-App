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
    
    var body: some Scene {
        WindowGroup {
            if authService.isLoading {
                LoadingView()
            } else if authService.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
    }
}

struct LoadingView: View {
    var body: some View {
        ZStack {
            Color.orange.opacity(0.1).ignoresSafeArea()
            
            VStack(spacing: 20) {
                Image(systemName: "basketball.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.orange)
                
                ProgressView()
                    .scaleEffect(1.5)
                
                Text("Loading...")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }
}
