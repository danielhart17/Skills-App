import { format, subDays, parseISO, differenceInCalendarDays } from "date-fns";
import { GAMIFICATION_TABLES, BADGE_DEFINITIONS } from "@/api/gamificationSchema";
import { todayKey } from "@/utils/accountabilityUtils";

export const XP_REWARDS = {
  MORNING_CONFIRM: 25,
  ENERGY_RATING: 50,
  PERFECT_WEEK: 200,
  ACHIEVEMENT: 75,
};

export function levelFromXP(totalXp) {
  if (totalXp >= 1000) return "Elite";
  if (totalXp >= 500) return "All-Star";
  if (totalXp >= 200) return "Starter";
  return "Rookie";
}

export function xpProgressInLevel(totalXp) {
  const level = levelFromXP(totalXp);
  const thresholds = { Rookie: 0, Starter: 200, "All-Star": 500, Elite: 1000 };
  const nextThresholds = {
    Rookie: 200,
    Starter: 500,
    "All-Star": 1000,
    Elite: totalXp,
  };
  const floor = thresholds[level];
  const ceiling = nextThresholds[level];
  const span = ceiling - floor || 1;
  const progress = Math.min(100, ((totalXp - floor) / span) * 100);
  return { level, floor, ceiling, progress: Math.max(0, progress) };
}

export async function ensureStreakRow(athleteId, supabase) {
  const { data, error } = await supabase
    .from(GAMIFICATION_TABLES.athleteStreaks)
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: insertError } = await supabase
    .from(GAMIFICATION_TABLES.athleteStreaks)
    .insert({ athlete_id: athleteId })
    .select()
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function updateStreak(athleteId, supabase) {
  const row = await ensureStreakRow(athleteId, supabase);
  const today = todayKey();
  let currentStreak = row.current_streak ?? 0;
  let longestStreak = row.longest_streak ?? 0;

  if (row.last_checkin_date === today) {
    return row;
  }

  if (row.last_checkin_date) {
    const last = parseISO(row.last_checkin_date);
    const diff = differenceInCalendarDays(parseISO(today), last);
    if (diff === 1) {
      currentStreak += 1;
    } else if (diff > 1) {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const { data, error } = await supabase
    .from(GAMIFICATION_TABLES.athleteStreaks)
    .update({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_checkin_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("athlete_id", athleteId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function awardXP(athleteId, amount, supabase) {
  const row = await ensureStreakRow(athleteId, supabase);
  const totalXp = (row.total_xp ?? 0) + amount;
  const level = levelFromXP(totalXp);

  const { data, error } = await supabase
    .from(GAMIFICATION_TABLES.athleteStreaks)
    .update({
      total_xp: totalXp,
      level,
      updated_at: new Date().toISOString(),
    })
    .eq("athlete_id", athleteId)
    .select()
    .single();

  if (error) throw error;
  return { total_xp: data.total_xp, level: data.level };
}

async function getEarnedBadgeIds(athleteId, supabase) {
  const { data, error } = await supabase
    .from(GAMIFICATION_TABLES.athleteAchievements)
    .select("badge_id")
    .eq("athlete_id", athleteId);

  if (error) throw error;
  return new Set((data || []).map((r) => r.badge_id));
}

async function insertBadge(athleteId, badgeId, badgeName, supabase) {
  const { error } = await supabase
    .from(GAMIFICATION_TABLES.athleteAchievements)
    .insert({
      athlete_id: athleteId,
      badge_id: badgeId,
      badge_name: badgeName,
    });

  if (error && error.code !== "23505") throw error;
}

export async function checkAchievements(athleteId, supabase) {
  const earned = await getEarnedBadgeIds(athleteId, supabase);
  const newlyEarned = [];

  const streak = await ensureStreakRow(athleteId, supabase);

  const { count: checkinCount } = await supabase
    .from(GAMIFICATION_TABLES.dailyCheckins)
    .select("*", { count: "exact", head: true })
    .eq("athlete_id", athleteId)
    .eq("status", "confirmed");

  const { data: weekCheckins } = await supabase
    .from(GAMIFICATION_TABLES.dailyCheckins)
    .select("check_in_date, status")
    .eq("athlete_id", athleteId)
    .gte("check_in_date", format(subDays(new Date(), 6), "yyyy-MM-dd"));

  const { count: gameCount } = await supabase
    .from(GAMIFICATION_TABLES.athleteEvents)
    .select("*", { count: "exact", head: true })
    .eq("athlete_id", athleteId)
    .eq("event_type", "game");

  const { count: practiceCount } = await supabase
    .from(GAMIFICATION_TABLES.athleteEvents)
    .select("*", { count: "exact", head: true })
    .eq("athlete_id", athleteId)
    .eq("event_type", "practice");

  const last7 = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), i), "yyyy-MM-dd")
  );
  const confirmedByDate = new Set(
    (weekCheckins || [])
      .filter((c) => c.status === "confirmed")
      .map((c) => c.check_in_date)
  );
  const perfectWeek =
    last7.every((d) => confirmedByDate.has(d)) && confirmedByDate.size >= 7;

  const checks = [
    {
      id: "first_checkin",
      name: "First Check-In",
      met: (checkinCount ?? 0) >= 1,
    },
    {
      id: "week_warrior",
      name: "Week Warrior",
      met: (streak.current_streak ?? 0) >= 7,
    },
    { id: "perfect_week", name: "Perfect Week", met: perfectWeek },
    {
      id: "first_game",
      name: "First Game Logged",
      met: (gameCount ?? 0) >= 1,
    },
    {
      id: "ten_practices",
      name: "10 Practices In",
      met: (practiceCount ?? 0) >= 10,
    },
    {
      id: "all_star_level",
      name: "All-Star",
      met: streak.level === "All-Star",
    },
    { id: "elite_level", name: "Elite", met: streak.level === "Elite" },
  ];

  for (const badge of checks) {
    if (badge.met && !earned.has(badge.id)) {
      await insertBadge(athleteId, badge.id, badge.name, supabase);
      newlyEarned.push(badge);
      earned.add(badge.id);
    }
  }

  return newlyEarned;
}

/**
 * Run XP, streak, achievements after a gamification action.
 */
export async function processGamificationAction(
  athleteId,
  supabase,
  { xpAmount, updateStreakFlag = false, perfectWeekBonus = false }
) {
  if (updateStreakFlag) {
    await updateStreak(athleteId, supabase);
  }

  let xpResult = null;
  if (xpAmount > 0) {
    xpResult = await awardXP(athleteId, xpAmount, supabase);
  }

  const newBadges = await checkAchievements(athleteId, supabase);

  for (const badge of newBadges) {
    await awardXP(athleteId, XP_REWARDS.ACHIEVEMENT, supabase);
    if (badge.id === "perfect_week") {
      await awardXP(athleteId, XP_REWARDS.PERFECT_WEEK, supabase);
    }
  }

  if (perfectWeekBonus) {
    await awardXP(athleteId, XP_REWARDS.PERFECT_WEEK, supabase);
  }

  const streak = await ensureStreakRow(athleteId, supabase);
  return { xpResult, newBadges, streak };
}

export { BADGE_DEFINITIONS };
