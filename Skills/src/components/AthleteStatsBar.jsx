import { useState, useEffect, useCallback } from "react";
import { Flame, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/api/supabaseClient";
import { GAMIFICATION_TABLES, BADGE_DEFINITIONS } from "@/api/gamificationSchema";
import {
  ensureStreakRow,
  xpProgressInLevel,
} from "@/utils/streakEngine";
import { format, parseISO } from "date-fns";
import { GAMIFICATION_UPDATED_EVENT } from "@/utils/accountabilityUtils";

const LEVEL_STYLES = {
  Rookie: "bg-brand-gray/30 text-brand-lightGray border-brand-gray/50",
  Starter: "bg-brand-blue/20 text-blue-300 border-brand-blue/40",
  "All-Star": "bg-brand-orange/20 text-orange-300 border-brand-orange/40",
  Elite: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
};

const BADGE_EMOJI = {
  first_checkin: "✅",
  week_warrior: "📅",
  perfect_week: "💯",
  first_game: "🏀",
  ten_practices: "💪",
  all_star_level: "⭐",
  elite_level: "👑",
};

export default function AthleteStatsBar({ athleteId, refreshKey = 0 }) {
  const [streak, setStreak] = useState(null);
  const [earned, setEarned] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const row = await ensureStreakRow(athleteId, supabase);
      setStreak(row);

      const { data: badges, error } = await supabase
        .from(GAMIFICATION_TABLES.athleteAchievements)
        .select("*")
        .eq("athlete_id", athleteId)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setEarned(badges || []);
    } catch (err) {
      console.error("AthleteStatsBar load:", err);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener(GAMIFICATION_UPDATED_EVENT, handler);
    return () => window.removeEventListener(GAMIFICATION_UPDATED_EVENT, handler);
  }, [load]);

  if (!athleteId) return null;

  if (loading && !streak) {
    return (
      <div className="rounded-xl border border-brand-gray/30 bg-brand-black p-4 h-24 animate-pulse" />
    );
  }

  const totalXp = streak?.total_xp ?? 0;
  const level = streak?.level ?? "Rookie";
  const { progress } = xpProgressInLevel(totalXp);
  const earnedIds = new Set(earned.map((b) => b.badge_id));
  const earnedMap = Object.fromEntries(earned.map((b) => [b.badge_id, b]));

  return (
    <div className="rounded-xl border border-brand-gray/30 bg-brand-black p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-brand-white font-semibold">
          <Flame className="w-5 h-5 text-brand-orange" />
          <span>
            🔥 {streak?.current_streak ?? 0} day streak
          </span>
        </div>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${LEVEL_STYLES[level] || LEVEL_STYLES.Rookie}`}
        >
          {level}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-brand-lightGray">
          <span>
            {totalXp} XP — {level}
          </span>
          <span>{Math.round(progress)}% to next</span>
        </div>
        <Progress value={progress} className="h-2 bg-brand-charcoal" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {BADGE_DEFINITIONS.map((def) => {
          const isEarned = earnedIds.has(def.id);
          const record = earnedMap[def.id];

          if (isEarned) {
            return (
              <Popover key={def.id}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 w-11 h-11 rounded-full bg-brand-charcoal border border-brand-orange/40 flex items-center justify-center text-lg hover:scale-105 transition-transform"
                    aria-label={def.name}
                  >
                    {BADGE_EMOJI[def.id] || "🏅"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 bg-brand-black border-brand-gray/30 text-brand-white"
                  align="start"
                >
                  <p className="font-semibold">{def.name}</p>
                  <p className="text-xs text-brand-lightGray mt-1">
                    Earned{" "}
                    {record?.earned_at
                      ? format(parseISO(record.earned_at), "MMM d, yyyy")
                      : "—"}
                  </p>
                </PopoverContent>
              </Popover>
            );
          }

          return (
            <div
              key={def.id}
              className="shrink-0 w-11 h-11 rounded-full bg-brand-charcoal/50 border border-brand-gray/30 flex items-center justify-center opacity-50"
              title={`Locked: ${def.name}`}
            >
              <Lock className="w-4 h-4 text-brand-gray" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
