//
//  VideoPlayerView.swift
//  skills-ios
//
//  Created by Daniel Hart on 1/11/26.
//

import SwiftUI
import AVKit
import WebKit

struct VideoPlayerView: View {
    let videoURL: String
    @State private var player: AVPlayer?
    @State private var isLoading = true
    @State private var hasError = false
    @State private var isYouTubeVideo = false
    
    var body: some View {
        ZStack {
            if isYouTubeVideo {
                // Use WebView for YouTube videos
                YouTubePlayerView(videoURL: videoURL)
                    .frame(height: 250)
            } else if let player = player, !hasError {
                VideoPlayer(player: player)
                    .onAppear {
                        player.play()
                    }
                    .onDisappear {
                        player.pause()
                    }
            } else if hasError {
                // Error state
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.red)
                    Text("Unable to load video")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(videoURL)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .background(Color(.systemGray6))
            } else if isLoading {
                // Loading state
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Loading video...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .background(Color(.systemGray6))
            }
        }
        .onAppear {
            loadVideo()
        }
    }
    
    private func loadVideo() {
        // Check if it's a YouTube URL
        if isYouTubeURL(videoURL) {
            isYouTubeVideo = true
            isLoading = false
            return
        }
        
        guard let url = URL(string: videoURL) else {
            hasError = true
            isLoading = false
            print("❌ Invalid video URL: \(videoURL)")
            return
        }
        
        print("🎥 Loading video from: \(videoURL)")
        
        // Create player with URL
        let playerItem = AVPlayerItem(url: url)
        player = AVPlayer(playerItem: playerItem)
        
        // Add observer for player status
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { notification in
            print("❌ Video failed to play: \(notification)")
            hasError = true
            isLoading = false
        }
        
        // Add observer for when item is ready to play
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemNewAccessLogEntry,
            object: playerItem,
            queue: .main
        ) { _ in
            print("✅ Video ready to play")
            isLoading = false
        }
        
        // Monitor player item status
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            if isLoading {
                if let item = self.player?.currentItem {
                    if item.status == .failed {
                        print("❌ Player item failed: \(item.error?.localizedDescription ?? "Unknown error")")
                        hasError = true
                    } else if item.status == .readyToPlay {
                        print("✅ Video loaded successfully")
                    } else {
                        print("⚠️ Video still loading or unknown status")
                    }
                }
                isLoading = false
            }
        }
    }
    
    private func isYouTubeURL(_ urlString: String) -> Bool {
        let youtubePatterns = [
            "youtube.com/watch",
            "youtube.com/embed",
            "youtu.be/",
            "youtube.com/v/"
        ]
        return youtubePatterns.contains { urlString.contains($0) }
    }
}

// Simpler embedded video player for use in questions
struct EmbeddedVideoPlayerView: View {
    let videoURL: String
    @State private var player: AVPlayer?
    @State private var isLoading = true
    @State private var hasError = false
    @State private var isYouTubeVideo = false
    
    var body: some View {
        ZStack {
            if isYouTubeVideo {
                // Use WebView for YouTube videos
                YouTubePlayerView(videoURL: videoURL)
                    .aspectRatio(16/9, contentMode: .fit)
                    .cornerRadius(10)
            } else if let player = player, !hasError {
                VideoPlayer(player: player)
                    .aspectRatio(16/9, contentMode: .fit)
                    .cornerRadius(10)
            } else if hasError {
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.title2)
                        .foregroundColor(.red)
                    Text("Unable to load video")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(videoURL)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            } else if isLoading {
                VStack(spacing: 8) {
                    ProgressView()
                    Text("Loading...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 200)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }
        }
        .onAppear {
            loadVideo()
        }
        .onDisappear {
            player?.pause()
        }
    }
    
    private func loadVideo() {
        // Check if it's a YouTube URL
        if isYouTubeURL(videoURL) {
            isYouTubeVideo = true
            isLoading = false
            return
        }
        
        guard let url = URL(string: videoURL) else {
            hasError = true
            isLoading = false
            print("❌ Invalid video URL: \(videoURL)")
            return
        }
        
        print("🎥 Loading embedded video from: \(videoURL)")
        
        let playerItem = AVPlayerItem(url: url)
        player = AVPlayer(playerItem: playerItem)
        
        // Monitor loading status
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) {
            if isLoading {
                // If still loading after 4 seconds, check if we have an error
                if let item = player?.currentItem {
                    if item.status == .failed {
                        print("❌ Embedded video failed: \(item.error?.localizedDescription ?? "Unknown error")")
                        hasError = true
                    } else if item.status == .readyToPlay {
                        print("✅ Embedded video loaded successfully")
                    }
                }
                isLoading = false
            }
        }
    }
    
    private func isYouTubeURL(_ urlString: String) -> Bool {
        let youtubePatterns = [
            "youtube.com/watch",
            "youtube.com/embed",
            "youtu.be/",
            "youtube.com/v/"
        ]
        return youtubePatterns.contains { urlString.contains($0) }
    }
}

// MARK: - YouTube Player using WebView
struct YouTubePlayerView: UIViewRepresentable {
    let videoURL: String
    
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.scrollView.isScrollEnabled = false
        webView.backgroundColor = .black
        webView.isOpaque = false
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        // Load the embed URL directly: iframe-in-HTML loads get rejected by
        // YouTube with "video unavailable" (error 152) despite a baseURL,
        // while direct navigation runs with a youtube.com origin and plays.
        guard let embedURL = getYouTubeEmbedURL(from: videoURL),
              let url = URL(string: embedURL) else {
            print("❌ Could not extract YouTube video ID from: \(videoURL)")
            return
        }
        // updateUIView fires on every SwiftUI refresh; don't restart playback.
        guard webView.url?.path != url.path else { return }
        print("🎬 Loading YouTube embed: \(embedURL)")
        webView.load(URLRequest(url: url))
    }
    
    private func getYouTubeEmbedURL(from urlString: String) -> String? {
        // Extract video ID from various YouTube URL formats
        var videoID: String?
        
        // Format: https://www.youtube.com/watch?v=VIDEO_ID
        if urlString.contains("youtube.com/watch") {
            if let url = URLComponents(string: urlString),
               let queryItems = url.queryItems,
               let vParam = queryItems.first(where: { $0.name == "v" })?.value {
                videoID = vParam
            }
        }
        // Format: https://youtu.be/VIDEO_ID
        else if urlString.contains("youtu.be/") {
            if let url = URL(string: urlString) {
                videoID = url.lastPathComponent
            }
        }
        // Format: https://www.youtube.com/embed/VIDEO_ID
        else if urlString.contains("youtube.com/embed/") {
            if let url = URL(string: urlString) {
                videoID = url.lastPathComponent
            }
        }
        
        // Remove any query parameters from video ID
        if let id = videoID {
            videoID = id.components(separatedBy: "?").first
        }
        
        guard let id = videoID else { return nil }
        
        // Return embed URL
        return "https://www.youtube.com/embed/\(id)?playsinline=1&rel=0&modestbranding=1"
    }
}

#Preview {
    EmbeddedVideoPlayerView(videoURL: "https://www.example.com/video.mp4")
}
