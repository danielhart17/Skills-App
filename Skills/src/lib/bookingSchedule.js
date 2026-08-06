import { format } from "date-fns";
import { supabase } from "@/api/supabaseClient";

const BOOKING_ID_NOTE_RE = /booking_id:([0-9a-f-]{36})/i;

/** Build athlete_events fields from a trainer booking. */
export function bookingToAthleteEventPayload(booking, extras = {}) {
  const when = new Date(booking.booking_datetime);
  if (Number.isNaN(when.getTime())) {
    throw new Error("Invalid booking datetime");
  }

  const title =
    booking.service_name ||
    extras.serviceName ||
    extras.locationTitle ||
    "Training Session";

  const noteParts = [];
  if (extras.trainerName) noteParts.push(`Trainer: ${extras.trainerName}`);
  if (booking.user_notes) noteParts.push(booking.user_notes);
  noteParts.push(`booking_id:${booking.id}`);

  return {
    athlete_id: booking.user_id,
    title,
    event_type: "training",
    event_date: format(when, "yyyy-MM-dd"),
    start_time: format(when, "HH:mm:ss"),
    location: extras.location || null,
    notes: noteParts.join("\n"),
    booking_id: booking.id,
  };
}

/**
 * Insert an athlete_events row for a booking so it appears on My Schedule.
 * Safe to call more than once — duplicate booking links are ignored.
 */
export async function syncBookingToAthleteSchedule(booking, extras = {}) {
  if (!booking?.id || !booking?.user_id || !booking?.booking_datetime) {
    return null;
  }
  if (String(booking.status || "").toLowerCase() === "cancelled") {
    return null;
  }

  // Already linked via booking_id column (ignore if column missing)
  try {
    const { data: byId, error: byIdError } = await supabase
      .from("athlete_events")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle();
    if (!byIdError && byId?.id) return byId;
  } catch {
    // column may not exist yet
  }

  // Already linked via notes tag (pre-migration)
  const { data: byNotes } = await supabase
    .from("athlete_events")
    .select("id, notes")
    .eq("athlete_id", booking.user_id)
    .ilike("notes", `%booking_id:${booking.id}%`)
    .limit(1);
  if (byNotes?.length) return byNotes[0];

  const payload = bookingToAthleteEventPayload(booking, extras);

  let { data, error } = await supabase
    .from("athlete_events")
    .insert(payload)
    .select()
    .single();

  // Column may not exist until migration is applied
  if (
    error &&
    (error.message?.includes("booking_id") ||
      error.code === "PGRST204" ||
      error.code === "42703")
  ) {
    const { booking_id, ...legacy } = payload;
    ({ data, error } = await supabase
      .from("athlete_events")
      .insert(legacy)
      .select()
      .single());
  }

  // Unique / already synced
  if (error && (error.code === "23505" || error.message?.includes("duplicate"))) {
    return null;
  }

  if (error) {
    console.warn("Could not add booking to athlete schedule:", error);
    return null;
  }

  return data;
}

export function extractBookingIdFromEvent(event) {
  if (!event) return null;
  if (event.booking_id) return event.booking_id;
  if (event.id && String(event.id).startsWith("booking-")) {
    return String(event.id).replace(/^booking-/, "");
  }
  const match = String(event.notes || "").match(BOOKING_ID_NOTE_RE);
  return match?.[1] || null;
}

/** Load non-cancelled bookings for an athlete in a local date range (inclusive). */
export async function fetchAthleteBookingsForRange(userId, startDate, endDate) {
  if (!userId || !startDate || !endDate) return [];

  const rangeStart = new Date(`${startDate}T00:00:00`);
  const rangeEnd = new Date(`${endDate}T23:59:59.999`);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, user_id, trainer_id, service_id, service_name, booking_datetime, duration_minutes, user_notes, status, trainers:trainer_id(name), trainer_services:service_id(name, location)"
    )
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .gte("booking_datetime", rangeStart.toISOString())
    .lte("booking_datetime", rangeEnd.toISOString())
    .order("booking_datetime", { ascending: true });

  if (error) {
    console.warn("Could not load bookings for schedule:", error);
    return [];
  }

  return data || [];
}

/** Convert bookings into athlete_events-shaped objects for the calendar UI. */
export function bookingsToScheduleEvents(bookings = []) {
  return (bookings || [])
    .filter((b) => String(b.status || "").toLowerCase() !== "cancelled")
    .map((booking) => {
      const when = new Date(booking.booking_datetime);
      const trainerName = booking.trainers?.name;
      const location =
        booking.trainer_services?.location || null;
      const title =
        booking.service_name ||
        booking.trainer_services?.name ||
        "Training Session";

      return {
        id: `booking-${booking.id}`,
        athlete_id: booking.user_id,
        title,
        event_type: "training",
        event_date: format(when, "yyyy-MM-dd"),
        start_time: format(when, "HH:mm:ss"),
        location,
        notes: [
          trainerName ? `Trainer: ${trainerName}` : null,
          booking.user_notes || null,
          `booking_id:${booking.id}`,
        ]
          .filter(Boolean)
          .join("\n"),
        booking_id: booking.id,
        opponent: trainerName || null,
        _fromBooking: true,
      };
    });
}

/** Load non-cancelled bookings for a trainer in a local date range (inclusive). */
export async function fetchTrainerBookingsForRange(
  trainerId,
  startDate,
  endDate
) {
  if (!trainerId || !startDate || !endDate) return [];

  const rangeStart = new Date(`${startDate}T00:00:00`);
  const rangeEnd = new Date(`${endDate}T23:59:59.999`);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, user_id, trainer_id, service_id, service_name, booking_datetime, duration_minutes, user_notes, status, payment_status, total_price, profiles:user_id(full_name, email), trainer_services:service_id(name, location)"
    )
    .eq("trainer_id", trainerId)
    .neq("status", "cancelled")
    .gte("booking_datetime", rangeStart.toISOString())
    .lte("booking_datetime", rangeEnd.toISOString())
    .order("booking_datetime", { ascending: true });

  if (error) {
    console.warn("Could not load trainer bookings for schedule:", error);
    return [];
  }

  return data || [];
}

/**
 * Group trainer bookings into calendar session occurrences.
 * Same service + same datetime = one session with multiple attendees.
 */
export function groupTrainerBookingsIntoSessions(bookings = []) {
  const map = new Map();

  for (const booking of bookings || []) {
    if (String(booking.status || "").toLowerCase() === "cancelled") continue;
    if (!booking.booking_datetime) continue;

    const when = new Date(booking.booking_datetime);
    if (Number.isNaN(when.getTime())) continue;

    const key = `${booking.service_id || booking.service_name || "session"}|${booking.booking_datetime}`;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        service_id: booking.service_id || null,
        title:
          booking.service_name ||
          booking.trainer_services?.name ||
          "Training Session",
        event_type: "training",
        event_date: format(when, "yyyy-MM-dd"),
        start_time: format(when, "HH:mm:ss"),
        booking_datetime: booking.booking_datetime,
        location: booking.trainer_services?.location || null,
        duration_minutes: booking.duration_minutes || null,
        attendees: [],
      });
    }
    map.get(key).attendees.push(booking);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.event_date !== b.event_date) {
      return String(a.event_date).localeCompare(String(b.event_date));
    }
    return String(a.start_time || "").localeCompare(String(b.start_time || ""));
  });
}

/**
 * Merge athlete_events with bookings, skipping bookings already represented.
 */
export function mergeScheduleWithBookings(events = [], bookings = []) {
  const linked = new Set();
  for (const event of events) {
    const id = extractBookingIdFromEvent(event);
    if (id) linked.add(id);
  }

  const fromBookings = bookingsToScheduleEvents(bookings).filter(
    (event) => !linked.has(event.booking_id)
  );

  return [...events, ...fromBookings].sort((a, b) => {
    if (a.event_date !== b.event_date) {
      return String(a.event_date).localeCompare(String(b.event_date));
    }
    const at = a.start_time || "99:99:99";
    const bt = b.start_time || "99:99:99";
    return String(at).localeCompare(String(bt));
  });
}
