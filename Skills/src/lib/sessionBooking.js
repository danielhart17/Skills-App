/** Shared helpers for trainer training sessions / booking. */

export const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const SKILL_LEVEL_OPTIONS = [
  { value: "all_levels", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function skillLevelLabel(value) {
  return (
    SKILL_LEVEL_OPTIONS.find((o) => o.value === value)?.label ||
    "All Levels"
  );
}

export function normalizeRecurrenceDays(days) {
  if (!Array.isArray(days)) return [];
  return days
    .map((d) => String(d || "").toLowerCase())
    .filter((d) => DAY_NAMES.includes(d));
}

export function toLocalDateKey(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseTimeToHoursMinutes(timeValue) {
  if (!timeValue) return null;
  const raw = String(timeValue).slice(0, 5);
  const [h, m] = raw.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hours: h, minutes: m };
}

/** Whether a calendar date is bookable for a given training session offering. */
export function isDateAvailableForSession(date, service, blockedDates = []) {
  if (!date || !service) return false;
  const key = toLocalDateKey(date);
  if (!key) return false;
  if ((blockedDates || []).includes(key)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  if (compare < today) return false;

  if (service.is_recurring) {
    const days = normalizeRecurrenceDays(service.recurrence_days);
    if (!days.length || !service.start_time) return false;
    return days.includes(DAY_NAMES[compare.getDay()]);
  }

  if (service.session_date) {
    return key === service.session_date && Boolean(service.start_time);
  }

  return false;
}
