import Foundation

struct ConnectAccountResponse: Decodable {
    let url: String
    let accountId: String

    enum CodingKeys: String, CodingKey {
        case url
        case accountId
    }
}

struct BookingCheckoutResponse: Decodable {
    let sessionId: String
    let bookingId: String
    let url: String?
    let breakdown: FeeBreakdown?  // present once the fee-aware function is live
}

/// Cents, mirroring _shared/bookingFees.ts on the server.
struct FeeBreakdown: Decodable {
    let basePrice: Int
    let serviceFee: Int
    let trainerCommission: Int
    let totalCharged: Int
    let trainerPayout: Int
    let platformTake: Int
}

/// Local mirror of the server fee math (12% athlete service fee, 300¢ floor)
/// for showing the summary before checkout returns.
func estimatedBookingFees(basePriceCents: Int) -> (serviceFee: Int, total: Int) {
    var serviceFee = Int((Double(basePriceCents) * 0.12).rounded())
    if serviceFee < 300 { serviceFee = 300 }
    return (serviceFee, basePriceCents + serviceFee)
}

struct TrainerStripeStatus {
    let hasAccount: Bool
    let onboardingComplete: Bool
    let chargesEnabled: Bool
    let payoutsEnabled: Bool

    var isFullyOnboarded: Bool {
        hasAccount && onboardingComplete && chargesEnabled && payoutsEnabled
    }
}

class StripeService {
    static let shared = StripeService()
    private let supabase = SupabaseClient.shared

    private init() {}

    func createConnectAccount(trainerId: UUID) async throws -> ConnectAccountResponse {
        try await supabase.invokeFunction(
            "create-connect-account",
            body: [
                "trainerId": trainerId.uuidString,
                "refreshUrl": Config.stripeOnboardingRefreshURL,
                "returnUrl": Config.stripeOnboardingReturnURL
            ]
        )
    }

    func getTrainerStripeStatus(trainerId: UUID) async throws -> TrainerStripeStatus {
        let trainer = try await APIService.shared.fetchTrainer(id: trainerId)
        return TrainerStripeStatus(
            hasAccount: trainer.stripeAccountId?.isEmpty == false,
            onboardingComplete: trainer.stripeOnboardingComplete ?? false,
            chargesEnabled: trainer.stripeChargesEnabled ?? false,
            payoutsEnabled: trainer.stripePayoutsEnabled ?? false
        )
    }

    func createBookingCheckoutSession(
        trainerId: UUID,
        userId: UUID,
        serviceId: UUID,
        serviceName: String,
        servicePrice: Decimal,
        serviceDuration: Int,
        bookingDatetime: Date,
        userNotes: String?
    ) async throws -> BookingCheckoutResponse {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let body: [String: Any] = [
            "trainerId": trainerId.uuidString,
            "userId": userId.uuidString,
            "serviceId": serviceId.uuidString,
            "serviceName": serviceName,
            "servicePrice": NSDecimalNumber(decimal: servicePrice).doubleValue,
            "serviceDuration": serviceDuration,
            "bookingDatetime": formatter.string(from: bookingDatetime),
            "userNotes": userNotes ?? "",
            "successUrl": Config.bookingSuccessURL,
            "cancelUrl": Config.bookingCancelURL
        ]

        return try await supabase.invokeFunction("create-booking-checkout", body: body)
    }
}
