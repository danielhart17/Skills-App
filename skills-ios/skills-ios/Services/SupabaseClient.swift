//
//  SupabaseClient.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

class SupabaseClient {
    static let shared = SupabaseClient()

    /// Postgres TIMESTAMPTZ DEFAULT NOW() emits fractional seconds, which
    /// plain .iso8601 rejects. Try fractional first, fall back to plain.
    static let postgrestDecoder: JSONDecoder = {
        let withFractional = ISO8601DateFormatter()
        withFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let string = try container.decode(String.self)
            if let date = withFractional.date(from: string) ?? plain.date(from: string) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unparseable date: \(string)")
        }
        return decoder
    }()
    
    private let baseURL: String
    private let anonKey: String
    private var accessToken: String? {
        get {
            return UserDefaults.standard.string(forKey: "supabase_access_token")
        }
        set {
            if let token = newValue {
                UserDefaults.standard.set(token, forKey: "supabase_access_token")
            } else {
                UserDefaults.standard.removeObject(forKey: "supabase_access_token")
            }
        }
    }

    private var refreshToken: String? {
        get {
            return UserDefaults.standard.string(forKey: "supabase_refresh_token")
        }
        set {
            if let token = newValue {
                UserDefaults.standard.set(token, forKey: "supabase_refresh_token")
            } else {
                UserDefaults.standard.removeObject(forKey: "supabase_refresh_token")
            }
        }
    }

    // MARK: - Request pipeline with token refresh

    /// Access tokens live ~1 hour. On 401/403 with a token attached, refresh
    /// once and retry; if refresh fails, clear the dead session so requests
    /// fall back to anon instead of sending a stale Bearer forever.
    private func send(_ request: URLRequest) async throws -> (Data, URLResponse) {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 401 || httpResponse.statusCode == 403,
              request.value(forHTTPHeaderField: "Authorization") != nil else {
            return (data, response)
        }

        guard await refreshSession(), let token = accessToken else {
            // Session is dead; retry anonymously so public reads still work.
            var anonRequest = request
            anonRequest.setValue(nil, forHTTPHeaderField: "Authorization")
            return try await URLSession.shared.data(for: anonRequest)
        }

        var retried = request
        retried.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return try await URLSession.shared.data(for: retried)
    }

    private func refreshSession() async -> Bool {
        guard let refreshToken,
              let url = URL(string: "\(baseURL)/auth/v1/token?grant_type=refresh_token") else {
            self.accessToken = nil
            self.refreshToken = nil
            return false
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONEncoder().encode(["refresh_token": refreshToken])

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200,
              let authResponse = try? JSONDecoder().decode(AuthResponse.self, from: data) else {
            self.accessToken = nil
            self.refreshToken = nil
            return false
        }
        self.accessToken = authResponse.accessToken
        self.refreshToken = authResponse.refreshToken
        return true
    }
    
    private init() {
        self.baseURL = Config.supabaseURL
        self.anonKey = Config.supabaseAnonKey
    }
    
    func setAccessToken(_ token: String?) {
        self.accessToken = token
        if token == nil {
            self.refreshToken = nil
        }
    }
    
    // MARK: - Authentication
    
    func signUp(email: String, password: String, fullName: String, metadata: [String: Any] = [:]) async throws -> AuthResponse {
        guard let url = URL(string: "\(baseURL)/auth/v1/signup") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")

        // Keys in `data` become raw_user_meta_data, consumed by handle_new_user()
        var userMetadata: [String: Any] = ["full_name": fullName]
        userMetadata.merge(metadata) { _, new in new }
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "data": userMetadata
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw SupabaseError.authenticationFailed
        }

        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        self.accessToken = authResponse.accessToken
        self.refreshToken = authResponse.refreshToken
        return authResponse
    }

    func signIn(email: String, password: String) async throws -> AuthResponse {
        guard let url = URL(string: "\(baseURL)/auth/v1/token?grant_type=password") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        let body: [String: String] = [
            "email": email,
            "password": password
        ]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw SupabaseError.authenticationFailed
        }
        
        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)
        self.accessToken = authResponse.accessToken
        self.refreshToken = authResponse.refreshToken
        return authResponse
    }

    func signOut() async throws {
        guard let url = URL(string: "\(baseURL)/auth/v1/logout") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 204 else {
            throw SupabaseError.logoutFailed
        }

        self.accessToken = nil
        self.refreshToken = nil
    }
    
    func getCurrentUser() async throws -> User? {
        guard let token = accessToken else {
            print("No access token available")
            return nil
        }
        
        guard let url = URL(string: "\(baseURL)/auth/v1/user") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            if let httpResponse = response as? HTTPURLResponse {
                print("Get current user failed with status: \(httpResponse.statusCode)")
            }
            return nil
        }
        
        let authUser = try JSONDecoder().decode(AuthUser.self, from: data)
        
        // Fetch full profile from profiles table
        return try await fetchProfile(userId: authUser.id)
    }
    
    private func fetchProfile(userId: UUID) async throws -> User {
        let result: [User] = try await select(
            from: "profiles",
            columns: "*",
            filter: "id=eq.\(userId.uuidString)"
        )
        
        guard let profile = result.first else {
            throw SupabaseError.profileNotFound
        }
        
        return profile
    }
    
    // MARK: - Database Operations
    
    func select<T: Decodable>(from table: String, columns: String = "*", filter: String? = nil, order: String? = nil, limit: Int? = nil) async throws -> [T] {
        var urlString = "\(baseURL)/rest/v1/\(table)?select=\(columns)"
        
        if let filter = filter {
            urlString += "&\(filter)"
        }
        if let order = order {
            urlString += "&order=\(order)"
        }
        if let limit = limit {
            urlString += "&limit=\(limit)"
        }
        
        guard let url = URL(string: urlString) else {
            throw SupabaseError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            if let httpResponse = response as? HTTPURLResponse {
                print("Request failed with status code: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Response: \(responseString)")
                }
            }
            throw SupabaseError.requestFailed
        }
        
        return try SupabaseClient.postgrestDecoder.decode([T].self, from: data)
    }

    func insert<T: Encodable>(into table: String, values: T) async throws {
        guard let url = URL(string: "\(baseURL)/rest/v1/\(table)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(values)
        
        let (_, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 201 else {
            throw SupabaseError.insertFailed
        }
    }

    /// Like insert, but returns the inserted row (Prefer: return=representation).
    func insertReturning<T: Encodable, R: Decodable>(into table: String, values: T) async throws -> R {
        guard let url = URL(string: "\(baseURL)/rest/v1/\(table)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(values)

        let (data, response) = try await send(request)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 201 else {
            throw SupabaseError.insertFailed
        }

        let rows = try SupabaseClient.postgrestDecoder.decode([R].self, from: data)
        guard let row = rows.first else { throw SupabaseError.insertFailed }
        return row
    }


    func update<T: Encodable>(table: String, values: T, filter: String) async throws {
        guard let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(filter)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(values)
        
        let (_, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 204 else {
            throw SupabaseError.updateFailed
        }
    }
    
    func delete(from table: String, filter: String) async throws {
        guard let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(filter)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 204 else {
            throw SupabaseError.deleteFailed
        }
    }
    
    func upsert<T: Encodable>(into table: String, values: T, onConflict: String) async throws {
        guard let url = URL(string: "\(baseURL)/rest/v1/\(table)?on_conflict=\(onConflict)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("return=minimal,resolution=merge-duplicates", forHTTPHeaderField: "Prefer")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        request.httpBody = try encoder.encode(values)
        
        let (data, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            if let httpResponse = response as? HTTPURLResponse {
                print("Upsert failed with status: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Response: \(responseString)")
                }
            }
            throw SupabaseError.upsertFailed
        }
    }
    
    func rpc<T: Decodable>(function: String, params: [String: Any]? = nil) async throws -> T {
        guard let url = URL(string: "\(baseURL)/rest/v1/rpc/\(function)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let params = params {
            request.httpBody = try JSONSerialization.data(withJSONObject: params)
        }
        
        let (data, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw SupabaseError.rpcFailed
        }

        return try SupabaseClient.postgrestDecoder.decode(T.self, from: data)
    }
    
    // MARK: - Account deletion

    /// Deletes the currently authenticated user's account by invoking the
    /// `delete-account` edge function (anonymizes the profile, preserves
    /// booking history, hard-deletes the auth login), then clears the local
    /// token. Required by App Store Review Guideline 5.1.1(v).
    /// Throws `.functionRejected` with the server message when deletion is
    /// blocked (e.g. upcoming confirmed bookings).
    func deleteAccount() async throws {
        struct DeleteResponse: Decodable { let success: Bool }
        let response: DeleteResponse = try await invokeFunction("delete-account", body: [:])
        guard response.success else { throw SupabaseError.deleteFailed }
        self.accessToken = nil
        self.refreshToken = nil
    }

    // MARK: - Edge Functions

    func invokeFunction<T: Decodable>(_ name: String, body: [String: Any]) async throws -> T {
        guard let url = URL(string: "\(baseURL)/functions/v1/\(name)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await send(request)

        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            if let httpResponse = response as? HTTPURLResponse,
               let responseString = String(data: data, encoding: .utf8) {
                print("Function \(name) failed (\(httpResponse.statusCode)): \(responseString)")
            }
            // Surface server-provided error messages (e.g. 409 deletion blocked)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = json["error"] as? String, !message.isEmpty {
                throw SupabaseError.functionRejected(message)
            }
            throw SupabaseError.functionFailed
        }

        return try SupabaseClient.postgrestDecoder.decode(T.self, from: data)
    }

    // MARK: - Storage Operations
    
    func uploadFile(bucket: String, path: String, data: Data, contentType: String = "image/jpeg") async throws {
        guard let url = URL(string: "\(baseURL)/storage/v1/object/\(bucket)/\(path)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = data
        
        let (_, response) = try await send(request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw SupabaseError.uploadFailed
        }
    }
    
    func getPublicUrl(bucket: String, path: String) -> String {
        return "\(baseURL)/storage/v1/object/public/\(bucket)/\(path)"
    }

    /// Signed URL for an object in a private bucket.
    func createSignedURL(bucket: String, path: String, expiresIn: Int = 3600) async throws -> String {
        guard let url = URL(string: "\(baseURL)/storage/v1/object/sign/\(bucket)/\(path)") else { throw SupabaseError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: ["expiresIn": expiresIn])

        let (data, response) = try await send(request)

        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode),
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let signedPath = json["signedURL"] as? String else {
            throw SupabaseError.requestFailed
        }

        return "\(baseURL)/storage/v1\(signedPath)"
    }
}

// MARK: - Supporting Types

struct AuthResponse: Codable {
    let accessToken: String
    let tokenType: String
    let expiresIn: Int
    let refreshToken: String
    let user: AuthUser
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case expiresIn = "expires_in"
        case refreshToken = "refresh_token"
        case user
    }
}

struct AuthUser: Codable {
    let id: UUID
    let email: String
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case createdAt = "created_at"
    }
}

enum SupabaseError: LocalizedError {
    case authenticationFailed
    case logoutFailed
    case profileNotFound
    case invalidURL
    case requestFailed
    case insertFailed
    case updateFailed
    case deleteFailed
    case upsertFailed
    case rpcFailed
    case uploadFailed
    case functionFailed
    case functionRejected(String)
    
    var errorDescription: String? {
        switch self {
        case .authenticationFailed:
            return "Authentication failed. Please check your credentials."
        case .logoutFailed:
            return "Failed to log out."
        case .profileNotFound:
            return "User profile not found."
        case .invalidURL:
            return "Invalid URL."
        case .requestFailed:
            return "Request failed."
        case .insertFailed:
            return "Failed to insert data."
        case .updateFailed:
            return "Failed to update data."
        case .deleteFailed:
            return "Failed to delete data."
        case .upsertFailed:
            return "Failed to upsert data."
        case .rpcFailed:
            return "RPC call failed."
        case .uploadFailed:
            return "Failed to upload file."
        case .functionFailed:
            return "Edge function call failed."
        case .functionRejected(let message):
            return message
        }
    }
}

