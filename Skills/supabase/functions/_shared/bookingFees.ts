// Shared booking fee math — used by create-booking-checkout and the athlete Booking UI.
// Keep athlete-facing totals identical to Stripe Checkout unit_amount.

/** Athlete-facing service fee as a fraction of basePrice. */
export const SERVICE_FEE_PERCENTAGE = 0.12;

/** Trainer commission as a fraction of basePrice (0% = trainer receives full base). */
export const TRAINER_COMMISSION_PERCENTAGE = 0;

/** Minimum combined platform take in cents ($3.00). */
export const PLATFORM_FLOOR_CENTS = 300;

/**
 * Fee breakdown in whole cents.
 * Invariant: trainerPayout + platformTake === totalCharged
 * (Stripe card processing fees are separate and come out of the platform.)
 */
export function calculateBookingFees(basePrice: number) {
  let serviceFee = Math.round(basePrice * SERVICE_FEE_PERCENTAGE);
  const trainerCommission = Math.round(
    basePrice * TRAINER_COMMISSION_PERCENTAGE
  );

  // Floor: bump athlete service fee so serviceFee + trainerCommission >= $3.
  // Never touch trainerCommission — trainer payout stays basePrice - trainerCommission.
  if (serviceFee + trainerCommission < PLATFORM_FLOOR_CENTS) {
    serviceFee = PLATFORM_FLOOR_CENTS - trainerCommission;
  }

  const platformTake = serviceFee + trainerCommission;
  const totalCharged = basePrice + serviceFee;
  const trainerPayout = basePrice - trainerCommission;

  if (trainerPayout + platformTake !== totalCharged) {
    throw new Error(
      `Fee reconciliation failed: payout(${trainerPayout}) + platform(${platformTake}) !== charged(${totalCharged})`
    );
  }

  return {
    basePrice,
    serviceFee,
    trainerCommission,
    totalCharged,
    trainerPayout,
    platformTake,
  };
}

export function dollarsToCents(dollars: number): number {
  return Math.round(Number(dollars) * 100);
}

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
