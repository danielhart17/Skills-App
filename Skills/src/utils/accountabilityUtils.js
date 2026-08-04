import { format, subDays } from "date-fns";
import { toDateKey } from "@/lib/scheduleUtils";

export function todayKey(date = new Date()) {
  return toDateKey(date);
}

export function combineEventDateTime(eventDate, startTime) {
  const base = new Date(`${eventDate}T00:00:00`);
  if (!startTime) {
    base.setHours(12, 0, 0, 0);
    return base;
  }
  const [h, m] = startTime.split(":").map(Number);
  base.setHours(h, m || 0, 0, 0);
  return base;
}

export function isPostEventDue(eventDate, startTime) {
  const eventAt = combineEventDateTime(eventDate, startTime);
  const dueAt = new Date(eventAt.getTime() + 60 * 60 * 1000);
  return new Date() >= dueAt;
}

export function last7DayKeys() {
  const keys = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    keys.push(format(subDays(today, i), "yyyy-MM-dd"));
  }
  return keys;
}

export const GAMIFICATION_UPDATED_EVENT = "skills:gamification-updated";

export function dispatchGamificationUpdated() {
  window.dispatchEvent(new CustomEvent(GAMIFICATION_UPDATED_EVENT));
}
