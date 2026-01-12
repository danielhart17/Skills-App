//
//  RemoteImageView.swift
//  skills-ios
//
//  Created by Daniel Hart on 1/11/26.
//

import SwiftUI

/// Enhanced image loader with better error handling for Supabase and other remote URLs
struct RemoteImageView: View {
    let imageURL: String
    let maxHeight: CGFloat?
    let cornerRadius: CGFloat
    let contentMode: ContentMode
    
    @State private var isLoading = true
    @State private var hasError = false
    
    init(
        imageURL: String,
        maxHeight: CGFloat? = nil,
        cornerRadius: CGFloat = 10,
        contentMode: ContentMode = .fit
    ) {
        self.imageURL = imageURL
        self.maxHeight = maxHeight
        self.cornerRadius = cornerRadius
        self.contentMode = contentMode
    }
    
    var body: some View {
        AsyncImage(url: URL(string: imageURL)) { phase in
            switch phase {
            case .empty:
                // Loading state
                VStack(spacing: 8) {
                    ProgressView()
                    Text("Loading image...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: maxHeight ?? 200)
                .background(Color(.systemGray6))
                .cornerRadius(cornerRadius)
                
            case .success(let image):
                // Success state
                image
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
                    .frame(maxHeight: maxHeight)
                    .cornerRadius(cornerRadius)
                    .onAppear {
                        print("✅ Image loaded successfully: \(imageURL)")
                    }
                
            case .failure(let error):
                // Error state
                VStack(spacing: 8) {
                    Image(systemName: "photo.fill")
                        .font(.title2)
                        .foregroundColor(.secondary)
                    Text("Unable to load image")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(imageURL)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .frame(maxWidth: .infinity)
                .frame(height: maxHeight ?? 200)
                .background(Color(.systemGray6))
                .cornerRadius(cornerRadius)
                .onAppear {
                    print("❌ Image failed to load: \(imageURL)")
                    print("Error: \(error.localizedDescription)")
                }
                
            @unknown default:
                // Fallback
                EmptyView()
            }
        }
    }
}

/// Compact version for thumbnails
struct ThumbnailImageView: View {
    let imageURL: String?
    let size: CGFloat
    let icon: String
    
    init(imageURL: String?, size: CGFloat = 60, icon: String = "photo") {
        self.imageURL = imageURL
        self.size = size
        self.icon = icon
    }
    
    var body: some View {
        Group {
            if let imageURL = imageURL, !imageURL.isEmpty {
                AsyncImage(url: URL(string: imageURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: size, height: size)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    case .failure(_):
                        placeholderView
                    case .empty:
                        placeholderView
                            .overlay(
                                ProgressView()
                                    .scaleEffect(0.7)
                            )
                    @unknown default:
                        placeholderView
                    }
                }
            } else {
                placeholderView
            }
        }
    }
    
    private var placeholderView: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color(.systemGray5))
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: icon)
                    .foregroundColor(.secondary)
            )
    }
}

#Preview {
    VStack(spacing: 20) {
        RemoteImageView(
            imageURL: "https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/test.jpg",
            maxHeight: 200
        )
        
        ThumbnailImageView(
            imageURL: "https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/test.jpg",
            size: 80,
            icon: "basketball"
        )
    }
    .padding()
}
