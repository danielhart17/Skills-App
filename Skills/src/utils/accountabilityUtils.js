import { format, getDay, getHours, subDays } from "date-fns";
import { getWeekBounds, toDateKey } from "@/lib/scheduleUtils";

export function weekConfirmStorageKey(athleteId, weekStartDate) {
  const weekKey =
    typeof weekStartDate === "string"
      ? weekStartDate
      : toDateKey(weekStartDate);
  return `week_confirmed_${athleteId}_${weekKey}`;
}

export function isWeekConfirmed(athleteId, weekStartDate) {
  if (!athleteId) return false;
  return (
    localStorage.getItem(weekConfirmStorageKey(athleteId, weekStartDate)) ===
    "true"
  );
}

export function setWeekConfirmed(athleteId, weekStartDate) {
  localStorage.setItem(
    weekConfirmStorageKey(athleteId, weekStartDate),
    "true"
  );
}

/** Sunday or Monday before 12:00 local time */
export function isWeekConfirmWindow(date = new Date()) {
  const day = getDay(date);
  const hour = getHours(date);
  return (day === 0 || day === 1) && hour < 12;
}

/** Monday noon+ or Tuesday–Saturday */
export function isLateUnconfirmedWeek(date = new Date()) {
  const day = getDay(date);
  const hour = getHours(date);
  if (day >= 2) return true;
  if (day === 1 && hour >= 12) return true;
  return false;
}

export function getCurrentWeekStart(date = new Date()) {
  return getWeekBounds(date).start;
}

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

export const WEEK_CONFIRMED_EVENT = "skills:week-confirmed";
export const GAMIFICATION_UPDATED_EVENT = "skills:gamification-updated";

export function dispatchWeekConfirmed() {
  window.dispatchEvent(new CustomEvent(WEEK_CONFIRMED_EVENT));
}

export function dispatchGamificationUpdated() {
  window.dispatchEvent(new CustomEvent(GAMIFICATION_UPDATED_EVENT));
}
