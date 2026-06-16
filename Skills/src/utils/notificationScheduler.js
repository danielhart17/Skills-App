/**
 * Browser Notification API placeholders.
 * Timers only fire while the tab/app is open.
 */

const timers = new Map();

function timerKey(type, eventTitle, eventTime) {
  return `${type}:${eventTitle}:${eventTime?.getTime?.() ?? eventTime}`;
}

function clearTimer(key) {
  const id = timers.get(key);
  if (id) {
    clearTimeout(id);
    timers.delete(key);
  }
}

function scheduleNotification(key, fireAt, title, body) {
  clearTimer(key);
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0 || delay > 7 * 24 * 60 * 60 * 1000) return null;

  const id = setTimeout(() => {
    timers.delete(key);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/images/skills-logo.png" });
    }
  }, delay);

  timers.set(key, id);
  return id;
}

export async function requestNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

/**
 * TODO: Replace with push notification service (OneSignal or Firebase FCM) when moving to mobile
 */
export function scheduleEventReminder(eventTitle, eventTime) {
  const fireAt = new Date(eventTime.getTime() - 30 * 60 * 1000);
  const key = timerKey("reminder", eventTitle, eventTime);
  return scheduleNotification(
    key,
    fireAt,
    "You're up soon",
    `${eventTitle} starts in 30 minutes 🏀`
  );
}

/**
 * TODO: Replace with push notification service (OneSignal or Firebase FCM) when moving to mobile
 */
export function scheduleCompletionPrompt(eventTitle, eventTime) {
  const fireAt = new Date(eventTime.getTime() + 60 * 60 * 1000);
  const key = timerKey("completion", eventTitle, eventTime);
  return scheduleNotification(
    key,
    fireAt,
    "Rate your session",
    `${eventTitle} done? Come rate how it went 💪`
  );
}

/**
 * TODO: Replace with push notification service (OneSignal or Firebase FCM) when moving to mobile
 */
export function scheduleMorningCheckin(eventTitle, eventDate) {
  const fireAt = new Date(`${eventDate}T07:30:00`);
  const key = timerKey("morning", eventTitle, fireAt);
  return scheduleNotification(
    key,
    fireAt,
    "Morning check-in",
    `You have ${eventTitle} today. You showing up?`
  );
}

export function cancelAllScheduledNotifications() {
  timers.forEach((id) => clearTimeout(id));
  timers.clear();
}

function fireInstantNotification(title, body) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/images/skills-logo.png" });
}

/**
 * TODO: Replace with OneSignal or Firebase FCM for mobile push
 */
export function notifyAthleteNewMessage(trainerName, messagePreview) {
  const preview = (messagePreview || "").slice(0, 50);
  fireInstantNotification(
    "New message",
    `${trainerName} sent you a message: ${preview}`
  );
}

/**
 * TODO: Replace with OneSignal or Firebase FCM for mobile push
 */
export function notifyAthleteNewWorkout(trainerName, workoutTitle, scheduledDate) {
  fireInstantNotification(
    "New workout",
    `${trainerName} sent you a workout: ${workoutTitle} — scheduled for ${scheduledDate}`
  );
}

/**
 * TODO: Replace with OneSignal or Firebase FCM for mobile push
 */
export function notifyTrainerAthleteReply(athleteName, messagePreview) {
  const preview = (messagePreview || "").slice(0, 50);
  fireInstantNotification(
    "Athlete replied",
    `${athleteName} replied: ${preview}`
  );
}
