//
//  SupabaseClient.swift
//  skills-ios
//
//  Created by Daniel Hart on 10/20/25.
//

import Foundation

class SupabaseClient {
    static let shared = SupabaseClient()
    
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
    
    private init() {
        self.baseURL = Config.supabaseURL
        self.anonKey = Config.supabaseAnonKey
    }
    
    func setAccessToken(_ token: String?) {
        self.accessToken = token
    }
    
    // MARK: - Authentication
    
    func signUp(email: String, password: String, fullName: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/v1/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "data": ["full_name": fullName]
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw SupabaseError.authenticationFailed
        }
        
        return try JSONDecoder().decode(AuthResponse.self, from: data)
    }
    
    func signIn(email: String, password: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/auth/v1/token?grant_type=password")!
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
        return authResponse
    }
    
    func signOut() async throws {
        let url = URL(string: "\(baseURL)/auth/v1/logout")!
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
    }
    
    func getCurrentUser() async throws -> User? {
        guard let token = accessToken else {
            print("No access token available")
            return nil
        }
        
        let url = URL(string: "\(baseURL)/auth/v1/user")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
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
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            if let httpResponse = response as? HTTPURLResponse {
                print("Request failed with status code: \(httpResponse.statusCode)")
                if let responseString = String(data: data, encoding: .utf8) {
                    print("Response: \(responseString)")
                }
            }
            throw SupabaseError.requestFailed
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([T].self, from: data)
    }
    
    func insert<T: Encodable>(into table: String, values: T) async throws {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)")!
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
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 201 else {
            throw SupabaseError.insertFailed
        }
    }
    
    func update<T: Encodable>(table: String, values: T, filter: String) async throws {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(filter)")!
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
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 204 else {
            throw SupabaseError.updateFailed
        }
    }
    
    func delete(from table: String, filter: String) async throws {
        let url = URL(string: "\(baseURL)/rest/v1/\(table)?\(filter)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 204 else {
            throw SupabaseError.deleteFailed
        }
    }
    
    func rpc<T: Decodable>(function: String, params: [String: Any]? = nil) async throws -> T {
        let url = URL(string: "\(baseURL)/rest/v1/rpc/\(function)")!
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
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw SupabaseError.rpcFailed
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
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
    case rpcFailed
    
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
        case .rpcFailed:
            return "RPC call failed."
        }
    }
}

