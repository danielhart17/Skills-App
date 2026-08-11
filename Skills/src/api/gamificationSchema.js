/**
 * Gamification schema reference (DDL applied via supabase/migrations/add_gamification_tables.sql).
 * Runtime data access uses the shared supabase client — not DDL from the browser.
 *
 * TABLE: daily_checkins
 * - id: uuid PK default gen_random_uuid()
 * - athlete_id: uuid FK auth.users
 * - event_id: uuid FK athlete_events (nullable)
 * - check_in_date: date
 * - status: text ('confirmed' | 'skipped' | 'rescheduled')
 * - energy_rating: int 1-5 nullable
 * - note: text nullable
 * - created_at: timestamptz default now()
 * RLS: athlete_id = auth.uid()
 *
 * TABLE: athlete_streaks
 * - id: uuid PK
 * - athlete_id: uuid FK auth.users UNIQUE
 * - current_streak, longest_streak, last_checkin_date, total_xp, level, updated_at
 * RLS: athlete_id = auth.uid()
 *
 * TABLE: athlete_achievements
 * - id, athlete_id, badge_id, badge_name, earned_at
 * UNIQUE(athlete_id, badge_id)
 * RLS: athlete_id = auth.uid()
 */

export const GAMIFICATION_TABLES = {
  dailyCheckins: "daily_checkins",
  athleteStreaks: "athlete_streaks",
  athleteAchievements: "athlete_achievements",
  athleteEvents: "athlete_events",
};

export const BADGE_DEFINITIONS = [
  { id: "first_checkin", name: "First Check-In" },
  { id: "week_warrior", name: "Week Warrior" },
  { id: "perfect_week", name: "Perfect Week" },
  { id: "first_game", name: "First Game Logged" },
  { id: "ten_practices", name: "10 Practices In" },
  { id: "all_star_level", name: "All-Star" },
  { id: "elite_level", name: "Elite" },
];
