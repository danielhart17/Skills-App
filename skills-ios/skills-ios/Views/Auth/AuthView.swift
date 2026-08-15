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

    // Trainer signup (mirrors web Auth.jsx; keys must match handle_new_user())
    @State private var signUpAsTrainer = false
    @State private var phone = ""
    @State private var experienceSummary = ""
    @State private var instagramUrl = ""
    @State private var socialMedia = ""
    @State private var website = ""
    @State private var safetyAffirmed = false

    private static let trainerSafetyStatement = """
    By checking this box I affirm that: I have never been convicted of a felony, \
    violent crime, or any offense involving minors; I will maintain appropriate \
    professional boundaries with all athletes; I will follow all platform rules \
    and safety guidelines; I consent to a background check; and all information \
    I have provided is accurate.
    """
    
    var body: some View {
        ZStack {
            // Basketball-themed gradient background
            LinearGradient(
                gradient: Gradient(colors: [Color.orange.opacity(0.3), Color.blue.opacity(0.3)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
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
                        Picker("Account type", selection: $signUpAsTrainer) {
                            Text("Athlete").tag(false)
                            Text("Trainer").tag(true)
                        }
                        .pickerStyle(.segmented)

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

                    if isSignUp && signUpAsTrainer {
                        TextField("Phone", text: $phone)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.phonePad)
                        TextField("Training experience summary", text: $experienceSummary, axis: .vertical)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .lineLimit(2...4)
                        TextField("Instagram URL (optional)", text: $instagramUrl)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                        TextField("Other social media (optional)", text: $socialMedia)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                        TextField("Website (optional)", text: $website)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)

                        Toggle(isOn: $safetyAffirmed) {
                            Text(Self.trainerSafetyStatement)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        .toggleStyle(CheckboxToggleStyle())
                    }

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

                Spacer(minLength: 40)
            }
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

        if isSignUp && signUpAsTrainer {
            guard !phone.trimmingCharacters(in: .whitespaces).isEmpty,
                  !experienceSummary.trimmingCharacters(in: .whitespaces).isEmpty else {
                errorMessage = "Trainers must provide a phone number and experience summary"
                return
            }
            guard safetyAffirmed else {
                errorMessage = "Please review and affirm the safety statement"
                return
            }
        }

        errorMessage = nil
        isLoading = true

        Task {
            do {
                if isSignUp {
                    var metadata: [String: Any] = [:]
                    if signUpAsTrainer {
                        metadata = [
                            "role": "trainer",
                            "phone": phone,
                            "instagram_url": instagramUrl,
                            "social_media": socialMedia,
                            "website": website,
                            "trainer_experience_summary": experienceSummary,
                            "trainer_safety_affirmed": true
                        ]
                    }
                    try await authService.signUp(email: email, password: password, fullName: fullName, metadata: metadata)
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

/// Checkbox-style toggle for the safety affirmation.
struct CheckboxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .foregroundColor(configuration.isOn ? .orange : .secondary)
                    .font(.title3)
                configuration.label
                    .multilineTextAlignment(.leading)
            }
        }
        .buttonStyle(PlainButtonStyle())
    }
}

#Preview {
    AuthView()
}

