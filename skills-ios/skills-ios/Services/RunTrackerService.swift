//
//  RunTrackerService.swift
//  skills-ios
//
//  Foreground-only GPS run tracking. Port of the web src/utils/runTracking.js
//  so both clients produce comparable distance/pace numbers.
//
//  Foreground-only by design: no UIBackgroundModes and no "Always"
//  authorization. The screen is kept awake while a run is active; tracking
//  pauses when the app leaves the foreground. Upgrading to background
//  tracking means adding the location background mode + Always auth.
//

import Foundation
import Combine
import CoreLocation
import UIKit

@MainActor
final class RunTrackerService: NSObject, ObservableObject {
    enum Status { case idle, running, paused, summary }

    // Web parity constants (src/utils/runTracking.js)
    private static let metersPerMile = 1609.344
    private static let maxAccuracyMeters = 25.0
    private static let maxImplausibleSpeedMps = 12.0  // ~27 mph

    @Published private(set) var status: Status = .idle
    @Published private(set) var path: [RunPoint] = []
    @Published private(set) var distanceMeters: Double = 0
    @Published private(set) var movingSeconds: Int = 0
    @Published private(set) var currentPace: Double?   // min/mile
    @Published private(set) var maxSpeedMps: Double = 0
    @Published private(set) var gpsReady = false
    @Published private(set) var authorizationDenied = false
    @Published var errorMessage: String?

    private let manager = CLLocationManager()
    private var timer: Timer?
    private var startedAt: Date?
    private var endedAt: Date?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.activityType = .fitness
        manager.distanceFilter = kCLDistanceFilterNone
    }

    var avgPace: Double? {
        Self.paceMinPerMile(distanceMeters: distanceMeters, durationSeconds: Double(movingSeconds))
    }

    var distanceMiles: Double { distanceMeters / Self.metersPerMile }

    // MARK: - Controls

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func start() {
        guard status == .idle else { return }
        path = []
        distanceMeters = 0
        movingSeconds = 0
        currentPace = nil
        maxSpeedMps = 0
        errorMessage = nil
        startedAt = Date()
        endedAt = nil
        status = .running
        // Runners watch their pace mid-run; don't let the screen lock.
        UIApplication.shared.isIdleTimerDisabled = true
        manager.startUpdatingLocation()
        startTimer()
    }

    func pause() {
        guard status == .running else { return }
        status = .paused
        manager.stopUpdatingLocation()
        stopTimer()
    }

    func resume() {
        guard status == .paused else { return }
        status = .running
        manager.startUpdatingLocation()
        startTimer()
    }

    func finish() {
        guard status == .running || status == .paused else { return }
        endedAt = Date()
        status = .summary
        manager.stopUpdatingLocation()
        stopTimer()
        UIApplication.shared.isIdleTimerDisabled = false
    }

    func reset() {
        status = .idle
        path = []
        distanceMeters = 0
        movingSeconds = 0
        currentPace = nil
        maxSpeedMps = 0
        startedAt = nil
        endedAt = nil
        gpsReady = false
        UIApplication.shared.isIdleTimerDisabled = false
    }

    /// Tracking can't continue in the background without the location
    /// background mode, so pause rather than silently record a straight line.
    func handleEnteredBackground() {
        if status == .running { pause() }
    }

    func save(notes: String?) async throws {
        guard let startedAt, let endedAt else { throw APIError.invalidData }
        try await APIService.shared.createRun(
            startedAt: startedAt,
            endedAt: endedAt,
            durationSeconds: movingSeconds,
            distanceMiles: distanceMiles,
            avgPaceMinPerMile: avgPace,
            maxSpeedMph: maxSpeedMps > 0 ? maxSpeedMps * 2.23694 : nil,
            path: path,
            notes: notes
        )
    }

    // MARK: - Timer

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.status == .running else { return }
                self.movingSeconds += 1
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    // MARK: - Math (ported from runTracking.js)

    static func haversineMeters(_ a: RunPoint, _ b: RunPoint) -> Double {
        let toRad = { (deg: Double) in deg * .pi / 180 }
        let dLat = toRad(b.lat - a.lat)
        let dLng = toRad(b.lng - a.lng)
        let lat1 = toRad(a.lat)
        let lat2 = toRad(b.lat)
        let h = pow(sin(dLat / 2), 2) + cos(lat1) * cos(lat2) * pow(sin(dLng / 2), 2)
        return 2 * 6_371_000 * asin(min(1, sqrt(h)))
    }

    /// Drop low-accuracy fixes and jumps implying an impossible speed.
    static func shouldKeep(_ point: RunPoint, previousKept: RunPoint?) -> Bool {
        if let accuracy = point.accuracy, accuracy > maxAccuracyMeters { return false }
        guard let previous = previousKept else { return true }
        let meters = haversineMeters(previous, point)
        let dtSeconds = (point.t - previous.t) / 1000
        guard dtSeconds > 0 else { return false }
        return meters / dtSeconds <= maxImplausibleSpeedMps
    }

    static func paceMinPerMile(distanceMeters: Double, durationSeconds: Double) -> Double? {
        let miles = distanceMeters / metersPerMile
        guard miles >= 0.01, durationSeconds > 0 else { return nil }
        return durationSeconds / 60 / miles
    }

    /// Pace over the last `windowSeconds` of kept points.
    static func currentPace(path: [RunPoint], windowSeconds: Double = 30) -> Double? {
        guard path.count >= 2, let latest = path.last else { return nil }
        let cutoff = latest.t - windowSeconds * 1000
        let recent = path.filter { $0.t >= cutoff }
        guard recent.count >= 2, let first = recent.first, let last = recent.last else { return nil }
        var meters = 0.0
        for index in 1..<recent.count {
            meters += haversineMeters(recent[index - 1], recent[index])
        }
        return paceMinPerMile(distanceMeters: meters, durationSeconds: (last.t - first.t) / 1000)
    }

    // MARK: - Formatting

    static func formatPace(_ minPerMile: Double?) -> String {
        guard let minPerMile, minPerMile.isFinite, minPerMile > 0 else { return "--:--" }
        let totalSeconds = Int((minPerMile * 60).rounded())
        return String(format: "%d:%02d", totalSeconds / 60, totalSeconds % 60)
    }

    static func formatDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        return hours > 0
            ? String(format: "%d:%02d:%02d", hours, minutes, secs)
            : String(format: "%d:%02d", minutes, secs)
    }
}

// MARK: - CLLocationManagerDelegate

extension RunTrackerService: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let samples = locations.map { location in
            (
                point: RunPoint(
                    lat: location.coordinate.latitude,
                    lng: location.coordinate.longitude,
                    t: location.timestamp.timeIntervalSince1970 * 1000,
                    accuracy: location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : nil
                ),
                speed: location.speed
            )
        }
        Task { @MainActor in
            for sample in samples { self.ingest(sample.point, speed: sample.speed) }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.errorMessage = "Location error: \(error.localizedDescription)"
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorizationDenied = (status == .denied || status == .restricted)
        }
    }

    @MainActor
    private func ingest(_ point: RunPoint, speed: CLLocationSpeed) {
        gpsReady = true
        guard status == .running else { return }
        guard Self.shouldKeep(point, previousKept: path.last) else { return }

        if let previous = path.last {
            distanceMeters += Self.haversineMeters(previous, point)
        }
        path.append(point)
        if speed > 0 { maxSpeedMps = max(maxSpeedMps, speed) }
        currentPace = Self.currentPace(path: path)
    }
}

#if DEBUG
/// Smallest check that fails if the ported math breaks.
enum RunTrackerSelfCheck {
    static func run() {
        // One degree of latitude is ~111 km.
        let a = RunPoint(lat: 33.7490, lng: -84.3880, t: 0, accuracy: 5)
        let b = RunPoint(lat: 33.7580, lng: -84.3880, t: 60_000, accuracy: 5)
        let meters = RunTrackerService.haversineMeters(a, b)
        assert(abs(meters - 1001) < 20, "haversine drifted: \(meters)")

        // 1 mile in 8 minutes = 8:00 pace
        let pace = RunTrackerService.paceMinPerMile(distanceMeters: 1609.344, durationSeconds: 480)
        assert(pace != nil && abs(pace! - 8) < 0.001)
        assert(RunTrackerService.formatPace(pace) == "8:00")

        // Filtering: reject sloppy accuracy and teleports
        let sloppy = RunPoint(lat: 33.75, lng: -84.39, t: 1000, accuracy: 40)
        assert(!RunTrackerService.shouldKeep(sloppy, previousKept: nil))
        let teleport = RunPoint(lat: 34.75, lng: -84.39, t: 1000, accuracy: 5)
        assert(!RunTrackerService.shouldKeep(teleport, previousKept: a))

        assert(RunTrackerService.formatDuration(3661) == "1:01:01")
        assert(RunTrackerService.formatDuration(65) == "1:05")
    }
}
#endif
