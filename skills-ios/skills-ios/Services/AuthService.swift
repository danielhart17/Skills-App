//
//  AuthService.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation
import Combine

@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()
    
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    @Published var isLoading = true
    
    private let supabase = SupabaseClient.shared
    
    private init() {
        Task {
            await checkAuthentication()
        }
    }
    
    func checkAuthentication() async {
        isLoading = true
        do {
            currentUser = try await supabase.getCurrentUser()
            isAuthenticated = currentUser != nil
        } catch {
            print("Error checking authentication: \(error)")
            isAuthenticated = false
            currentUser = nil
        }
        isLoading = false
    }
    
    func signIn(email: String, password: String) async throws {
        let authResponse = try await supabase.signIn(email: email, password: password)
        supabase.setAccessToken(authResponse.accessToken)
        currentUser = try await supabase.getCurrentUser()
        isAuthenticated = true
    }
    
    func signUp(email: String, password: String, fullName: String) async throws {
        let authResponse = try await supabase.signUp(email: email, password: password, fullName: fullName)
        supabase.setAccessToken(authResponse.accessToken)
        currentUser = try await supabase.getCurrentUser()
        isAuthenticated = true
    }
    
    func signOut() async throws {
        try await supabase.signOut()
        supabase.setAccessToken(nil)
        currentUser = nil
        isAuthenticated = false
    }
    
    func refreshUser() async throws {
        currentUser = try await supabase.getCurrentUser()
    }
    
    func isAdmin() -> Bool {
        currentUser?.role == .admin
    }
    
    func isTrainer() -> Bool {
        currentUser?.role == .trainer  // Only trainers, not admins
    }
    
    func isUser() -> Bool {
        currentUser?.role == .user
    }
}

