//
//  ConversationView.swift
//  skills-ios
//
//  Chat thread with 4s polling, media attachments, workout messages.
//

import SwiftUI
import PhotosUI
import AVKit

struct ConversationView: View {
    let conversation: Conversation
    let otherProfile: PublicProfile
    var openWorkoutBuilder = false

    @StateObject private var authService = AuthService.shared
    @State private var messages: [Message] = []
    @State private var attachments: [UUID: [MessageAttachment]] = [:]
    @State private var draft = ""
    @State private var pickedItem: PhotosPickerItem?
    @State private var pendingMedia: (data: Data, isVideo: Bool)?
    @State private var isSending = false
    @State private var showWorkoutBuilder = false
    @State private var errorMessage: String?

    private var myId: UUID? { authService.currentUser?.id }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(messages) { message in
                            MessageBubble(
                                message: message,
                                attachments: attachments[message.id] ?? [],
                                isMine: message.senderId == myId,
                                onAddWorkoutToCalendar: addWorkoutToCalendar
                            )
                            .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.errorRed)
                    .padding(.horizontal)
            }

            composer
        }
        .background(Color.appBackground)
        .navigationTitle(otherProfile.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if authService.isTrainer() {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showWorkoutBuilder = true
                    } label: {
                        Image(systemName: "dumbbell.fill")
                            .foregroundColor(.brandOrange)
                    }
                }
            }
        }
        .sheet(isPresented: $showWorkoutBuilder) {
            WorkoutBuilderSheet { payload in
                Task { await send(body: nil, messageType: "workout", workoutPayload: payload) }
            }
        }
        .task {
            if openWorkoutBuilder { showWorkoutBuilder = true }
            while !Task.isCancelled {
                await load()
                try? await Task.sleep(for: .seconds(4))
            }
        }
        .onChange(of: pickedItem) { _, item in
            guard let item else { return }
            Task {
                let isVideo = item.supportedContentTypes.contains { $0.conforms(to: .movie) }
                if let data = try? await item.loadTransferable(type: Data.self) {
                    // ponytail: whole file in memory; stream to disk if >100MB videos become a thing
                    if data.count > 100 * 1024 * 1024 {
                        errorMessage = "File too large (100MB max)"
                    } else {
                        pendingMedia = (data, isVideo)
                    }
                }
                pickedItem = nil
            }
        }
    }

    private var composer: some View {
        HStack(spacing: 10) {
            PhotosPicker(selection: $pickedItem, matching: .any(of: [.images, .videos])) {
                Image(systemName: "paperclip")
                    .font(.title3)
                    .foregroundColor(pendingMedia == nil ? .textSecondary : .brandOrange)
            }

            TextField("Message...", text: $draft, axis: .vertical)
                .textFieldStyle(.plain)
                .padding(10)
                .background(Color.cardBackground)
                .cornerRadius(20)
                .foregroundColor(.textPrimary)
                .lineLimit(4)

            Button {
                Task { await send(body: draft) }
            } label: {
                if isSending {
                    ProgressView()
                } else {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(canSend ? .brandOrange : .textMuted)
                }
            }
            .disabled(!canSend || isSending)
        }
        .padding()
        .background(Color.appBackground)
    }

    private var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || pendingMedia != nil
    }

    private func load() async {
        guard let myId else { return }
        do {
            let fetched = try await APIService.shared.fetchMessages(conversationId: conversation.id)
            if fetched.count != messages.count {
                let fetchedAttachments = try await APIService.shared.fetchAttachments(
                    messageIds: fetched.filter { $0.messageType == "media" || $0.messageType == "film_feedback" }.map(\.id)
                )
                attachments = Dictionary(grouping: fetchedAttachments, by: \.messageId)
                messages = fetched
            }
            try await APIService.shared.markConversationRead(conversationId: conversation.id, receiverId: myId)
            await UnreadCountStore.shared.refresh()
        } catch {
            print("Error loading messages: \(error)")
        }
    }

    private func send(body: String?, messageType: String = "text", workoutPayload: WorkoutPayload? = nil) async {
        guard let myId else { return }
        let receiverId = myId == conversation.trainerId ? conversation.athleteId : conversation.trainerId
        isSending = true
        errorMessage = nil
        do {
            var uploaded: [NewAttachment] = []
            if let media = pendingMedia {
                uploaded = [try await APIService.shared.uploadMessageMedia(
                    data: media.data,
                    senderId: myId,
                    fileName: media.isVideo ? "video.mp4" : "photo.jpg",
                    isVideo: media.isVideo
                )]
            }
            let trimmed = body?.trimmingCharacters(in: .whitespacesAndNewlines)
            let message = try await APIService.shared.sendMessage(
                conversationId: conversation.id,
                senderId: myId,
                receiverId: receiverId,
                body: trimmed?.isEmpty == true ? nil : trimmed,
                messageType: messageType,
                workoutPayload: workoutPayload,
                attachments: uploaded
            )
            messages.append(message)
            if !uploaded.isEmpty {
                let rows = try await APIService.shared.fetchAttachments(messageIds: [message.id])
                attachments[message.id] = rows
            }
            draft = ""
            pendingMedia = nil
        } catch {
            errorMessage = "Couldn't send. Check your connection."
            print("Send failed: \(error)")
        }
        isSending = false
    }

    private func addWorkoutToCalendar(_ payload: WorkoutPayload) {
        guard let myId, !authService.isTrainer() else { return }
        Task {
            do {
                try await APIService.shared.addWorkoutToCalendar(athleteId: myId, payload: payload)
                errorMessage = nil
            } catch {
                errorMessage = "Couldn't add workout to your schedule."
            }
        }
    }
}

// MARK: - Bubbles

struct MessageBubble: View {
    let message: Message
    let attachments: [MessageAttachment]
    let isMine: Bool
    var onAddWorkoutToCalendar: (WorkoutPayload) -> Void

    var body: some View {
        HStack {
            if isMine { Spacer(minLength: 50) }
            VStack(alignment: isMine ? .trailing : .leading, spacing: 6) {
                if message.messageType == "workout", let payload = message.workoutPayload {
                    WorkoutMessageCard(payload: payload, isMine: isMine, onAdd: onAddWorkoutToCalendar)
                } else {
                    if message.messageType == "film_feedback" {
                        Label("Film Feedback", systemImage: "video.fill")
                            .font(.caption)
                            .foregroundColor(.brandOrange)
                    }
                    ForEach(attachments) { attachment in
                        AttachmentView(attachment: attachment)
                    }
                    if let body = message.body, !body.isEmpty {
                        Text(body)
                            .padding(12)
                            .background(isMine ? Color.brandOrange : Color.cardBackground)
                            .foregroundColor(isMine ? .white : .textPrimary)
                            .cornerRadius(16)
                    }
                }
                Text(message.createdAt, style: .time)
                    .font(.caption2)
                    .foregroundColor(.textMuted)
            }
            if !isMine { Spacer(minLength: 50) }
        }
    }
}

struct WorkoutMessageCard: View {
    let payload: WorkoutPayload
    let isMine: Bool
    var onAdd: (WorkoutPayload) -> Void
    @State private var added = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(payload.title, systemImage: "dumbbell.fill")
                .font(.headline)
                .foregroundColor(.textPrimary)

            if let date = payload.scheduledDate {
                Text("\(date)\(payload.scheduledTime.map { " at \($0)" } ?? "")")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
            if let intensity = payload.intensity {
                Text("Intensity: \(intensity)")
                    .font(.caption)
                    .foregroundColor(.brandOrange)
            }
            ForEach(Array((payload.drills ?? []).enumerated()), id: \.offset) { index, drill in
                Text("\(index + 1). \(drill.name)\(drill.sets.map { " — \($0)" } ?? "")")
                    .font(.subheadline)
                    .foregroundColor(.textPrimary)
            }
            if let notes = payload.trainerNotes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }

            if !isMine {
                Button {
                    onAdd(payload)
                    added = true
                } label: {
                    Label(added ? "Added to Schedule" : "Add to Schedule",
                          systemImage: added ? "checkmark.circle.fill" : "calendar.badge.plus")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                .disabled(added)
                .foregroundColor(added ? .successGreen : .brandOrange)
                .padding(.top, 4)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.brandOrange.opacity(0.4), lineWidth: 1)
        )
        .cornerRadius(12)
    }
}

struct AttachmentView: View {
    let attachment: MessageAttachment
    @State private var signedURL: String?

    var body: some View {
        Group {
            if let signedURL, let url = URL(string: signedURL) {
                if attachment.fileType == "video" {
                    VideoPlayer(player: AVPlayer(url: url))
                        .frame(width: 240, height: 180)
                        .cornerRadius(12)
                } else {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(maxWidth: 240, maxHeight: 240)
                    .cornerRadius(12)
                    .clipped()
                }
            } else {
                ProgressView()
                    .frame(width: 240, height: 120)
            }
        }
        .task {
            signedURL = try? await SupabaseClient.shared.createSignedURL(
                bucket: "message-media",
                path: attachment.fileUrl
            )
        }
    }
}
