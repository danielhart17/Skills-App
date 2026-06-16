import { useState, useEffect } from "react";
import { Lock, CheckCircle2 } from "lucide-react";
import { ensureStreakRow } from "@/utils/streakEngine";
import { supabase } from "@/api/supabaseClient";
import { GAMIFICATION_UPDATED_EVENT } from "@/utils/accountabilityUtils";
import { Button } from "@/components/ui/button";
import {
  isWeekConfirmed,
  setWeekConfirmed,
  isWeekConfirmWindow,
  isLateUnconfirmedWeek,
  getCurrentWeekStart,
  dispatchWeekConfirmed,
  dispatchGamificationUpdated,
} from "@/utils/accountabilityUtils";
import { toDateKey } from "@/lib/scheduleUtils";
import {
  processGamificationAction,
  XP_REWARDS,
} from "@/utils/streakEngine";
import { toast } from "@/components/ui/use-toast";

export default function WeekConfirmBanner({ athleteId, onConfirmed }) {
  const [confirmed, setConfirmed] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const weekStart = getCurrentWeekStart();
  const weekKey = toDateKey(weekStart);

  const loadStreak = async () => {
    if (!athleteId) return;
    try {
      const row = await ensureStreakRow(athleteId, supabase);
      setCurrentStreak(row.current_streak ?? 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (athleteId) {
      setConfirmed(isWeekConfirmed(athleteId, weekKey));
      setJustConfirmed(false);
      loadStreak();
    }
  }, [athleteId, weekKey]);

  useEffect(() => {
    const handler = () => loadStreak();
    window.addEventListener(GAMIFICATION_UPDATED_EVENT, handler);
    return () => window.removeEventListener(GAMIFICATION_UPDATED_EVENT, handler);
  }, [athleteId]);

  const handleConfirm = async () => {
    if (!athleteId) return;
    setSubmitting(true);
    try {
      setWeekConfirmed(athleteId, weekKey);
      setConfirmed(true);
      setJustConfirmed(true);

      await processGamificationAction(athleteId, supabase, {
        xpAmount: XP_REWARDS.WEEK_CONFIRM,
      });

      dispatchWeekConfirmed();
      dispatchGamificationUpdated();
      onConfirmed?.();

      toast({
        title: "Week locked in 🔥",
        description: "Daily check-ins are active. +100 XP",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not confirm week",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!athleteId) return null;

  if (confirmed) {
    if (justConfirmed) {
      return (
        <div className="rounded-xl border border-green-500/40 bg-green-600/15 px-4 py-3 text-center">
          <p className="text-green-400 font-semibold">Week locked in 🔥</p>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-600/10 px-4 py-2.5 flex items-center justify-center gap-2 text-sm">
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
        <span className="text-green-300">
          Week confirmed ✅ — Streak: {currentStreak} days 🔥
        </span>
      </div>
    );
  }

  const showBanner =
    isWeekConfirmWindow() || isLateUnconfirmedWeek() || !confirmed;
  if (!showBanner) return null;

  const isLate = isLateUnconfirmedWeek();

  return (
    <div
      className={`rounded-xl border px-4 py-4 space-y-3 ${
        isLate
          ? "border-brand-orange/50 bg-brand-orange/10"
          : "border-brand-blue/40 bg-brand-blue/10"
      }`}
    >
      <p
        className={`text-sm sm:text-base ${
          isLate ? "text-brand-orange" : "text-brand-lightGray"
        }`}
      >
        Lock in your week — confirm your schedule to activate daily check-ins
        {isLate && (
          <span className="block mt-1 font-medium text-brand-orange">
            Your week isn&apos;t locked in. Your trainer can see this.
          </span>
        )}
      </p>
      <Button
        onClick={handleConfirm}
        disabled={submitting}
        className="w-full sm:w-auto bg-gradient-orange-blue text-white border-0"
      >
        <Lock className="w-4 h-4 mr-2" />
        {submitting ? "Confirming..." : "Confirm My Week 🔒"}
      </Button>
    </div>
  );
}
