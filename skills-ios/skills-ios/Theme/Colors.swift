//
//  Colors.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/21/25.
//

import SwiftUI

extension Color {
    // Primary brand color (Orange) - matching web app exactly
    static let brandOrange = Color(hex: "#F15A29")  // Exact match with web
    static let brandOrangeDark = Color(hex: "#C05621")
    static let brandOrangeLight = Color(hex: "#ED8936")
    
    // Blue accent - matching web app gradient
    static let brandBlue = Color(hex: "#0077FF")  // For gradients matching web
    
    // Background colors - matching web app's dark theme
    static let appBackground = Color(hex: "#0A0A0A")
    static let cardBackground = Color(hex: "#171717")
    static let cardBackgroundHover = Color(hex: "#262626")
    
    // Text colors
    static let textPrimary = Color(hex: "#FAFAFA")
    static let textSecondary = Color(hex: "#A1A1AA")
    static let textMuted = Color(hex: "#71717A")
    
    // Border colors
    static let borderColor = Color(hex: "#27272A")
    static let borderHover = Color(hex: "#3F3F46")
    
    // Status colors
    static let successGreen = Color(hex: "#22C55E")
    static let errorRed = Color(hex: "#EF4444")
    static let warningYellow = Color(hex: "#EAB308")
    static let infoBlue = Color(hex: "#3B82F6")
    
    // Difficulty colors
    static let difficultyBeginner = Color(hex: "#22C55E")
    static let difficultyIntermediate = Color(hex: "#F59E0B")
    static let difficultyAdvanced = Color(hex: "#EF4444")
    
    // Helper initializer for hex colors
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Gradients
extension LinearGradient {
    // Orange to Blue gradient - matching web app active tab
    static let brandGradient = LinearGradient(
        gradient: Gradient(colors: [.brandOrange, .brandBlue]),
        startPoint: .leading,
        endPoint: .trailing
    )
}
