import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  isToday,
} from "date-fns";

/** Week runs Sunday (0) through Saturday */
export function getWeekBounds(anchorDate) {
  const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
  const end = endOfWeek(anchorDate, { weekStartsOn: 0 });
  return { start, end };
}

export function getWeekDays(anchorDate) {
  const { start } = getWeekBounds(anchorDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatWeekRange(anchorDate) {
  const { start, end } = getWeekBounds(anchorDate);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function toDateKey(date) {
  return format(date, "yyyy-MM-dd");
}

export function groupEventsByDate(events) {
  return events.reduce((acc, event) => {
    const key = event.event_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});
}

export const EVENT_TYPE_STYLES = {
  game: "bg-orange-500 text-white hover:bg-orange-600",
  practice: "bg-green-600 text-white hover:bg-green-700",
  workout: "bg-brand-blue text-white hover:bg-blue-600",
  rest: "bg-brand-gray text-white hover:bg-brand-gray/80",
};

export const EVENT_TYPE_BADGE_STYLES = {
  game: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  practice: "bg-green-600/20 text-green-400 border-green-600/40",
  workout: "bg-brand-blue/20 text-blue-400 border-brand-blue/40",
  rest: "bg-brand-gray/20 text-brand-lightGray border-brand-gray/40",
};

export function formatEventTime(startTime) {
  if (!startTime) return null;
  const [hours, minutes] = startTime.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function parseEventDate(eventDate) {
  if (!eventDate) return null;
  return typeof eventDate === "string" ? parseISO(eventDate) : eventDate;
}

export { isSameDay, isToday, addWeeks, format };
