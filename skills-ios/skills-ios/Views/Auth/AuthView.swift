//
//  AuthView.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import SwiftUI

struct AuthView: View {
    @StateObject private var authService = AuthService.shared
    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            // Basketball-themed gradient background
            LinearGradient(
                gradient: Gradient(colors: [Color.orange.opacity(0.3), Color.blue.opacity(0.3)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 30) {
                // Logo and Title
                VStack(spacing: 10) {
                    Image(systemName: "basketball.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.orange)
                    
                    Text("Skills")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Basketball Training")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 50)
                
                // Auth Form
                VStack(spacing: 20) {
                    if isSignUp {
                        TextField("Full Name", text: $fullName)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.words)
                    }
                    
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }
                    
                    Button(action: handleSubmit) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text(isSignUp ? "Sign Up" : "Sign In")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .disabled(isLoading)
                    
                    Button(action: { isSignUp.toggle() }) {
                        Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                            .font(.subheadline)
                            .foregroundColor(.primary)
                    }
                }
                .padding(.horizontal, 40)
                
                Spacer()
            }
        }
    }
    
    private func handleSubmit() {
        guard !email.isEmpty && !password.isEmpty else {
            errorMessage = "Please fill in all fields"
            return
        }
        
        if isSignUp && fullName.isEmpty {
            errorMessage = "Please enter your full name"
            return
        }
        
        errorMessage = nil
        isLoading = true
        
        Task {
            do {
                if isSignUp {
                    try await authService.signUp(email: email, password: password, fullName: fullName)
                } else {
                    try await authService.signIn(email: email, password: password)
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    AuthView()
}

