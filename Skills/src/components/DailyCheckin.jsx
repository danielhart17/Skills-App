import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/api/supabaseClient";
import { GAMIFICATION_TABLES } from "@/api/gamificationSchema";
import {
  todayKey,
  combineEventDateTime,
  isPostEventDue,
  dispatchGamificationUpdated,
} from "@/utils/accountabilityUtils";
import { formatEventTime, EVENT_TYPE_BADGE_STYLES } from "@/lib/scheduleUtils";
import {
  processGamificationAction,
  XP_REWARDS,
} from "@/utils/streakEngine";
import {
  scheduleEventReminder,
  scheduleCompletionPrompt,
  scheduleMorningCheckin,
} from "@/utils/notificationScheduler";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

const ENERGY_OPTIONS = [
  { rating: 1, emoji: "😴", label: "Low" },
  { rating: 2, emoji: "😐", label: "OK" },
  { rating: 3, emoji: "🙂", label: "Good" },
  { rating: 4, emoji: "💪", label: "Great" },
  { rating: 5, emoji: "🔥", label: "Fire" },
];

export default function DailyCheckin({ athleteId, onGamificationUpdate }) {
  const location = useLocation();
  const onSchedulePage = location.pathname === "/schedule";

  const [todayEvents, setTodayEvents] = useState([]);
  const [morningOpen, setMorningOpen] = useState(false);
  const [firstEvent, setFirstEvent] = useState(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [postEventCheckin, setPostEventCheckin] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTodayData = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    const today = todayKey();

    try {
      const { data: events, error: evErr } = await supabase
        .from(GAMIFICATION_TABLES.athleteEvents)
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("event_date", today)
        .neq("event_type", "rest")
        .order("start_time", { ascending: true, nullsFirst: false });

      if (evErr) throw evErr;

      const activeEvents = (events || []).filter((e) => e.event_type !== "rest");
      setTodayEvents(activeEvents);

      const { data: checkins, error: cErr } = await supabase
        .from(GAMIFICATION_TABLES.dailyCheckins)
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("check_in_date", today);

      if (cErr) throw cErr;

      const morningDone = (checkins || []).some(
        (c) =>
          c.status === "confirmed" ||
          c.status === "skipped" ||
          c.status === "rescheduled"
      );

      if (activeEvents.length > 0 && !morningDone) {
        setFirstEvent(activeEvents[0]);
        setMorningOpen(true);
      } else {
        setMorningOpen(false);
        setFirstEvent(null);
      }

      const pendingPost = (checkins || []).find(
        (c) =>
          c.status === "confirmed" &&
          c.energy_rating == null &&
          c.event_id &&
          activeEvents.some((e) => e.id === c.event_id)
      );

      if (pendingPost) {
        const ev = activeEvents.find((e) => e.id === pendingPost.event_id);
        if (ev && isPostEventDue(ev.event_date, ev.start_time)) {
          setPostEventCheckin({ checkin: pendingPost, event: ev });
        } else {
          setPostEventCheckin(null);
        }
      } else {
        setPostEventCheckin(null);
      }
    } catch (err) {
      console.error("DailyCheckin load:", err);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    loadTodayData();
  }, [loadTodayData]);

  useEffect(() => {
    if (!onSchedulePage) return undefined;
    const id = setInterval(loadTodayData, 60 * 1000);
    return () => clearInterval(id);
  }, [onSchedulePage, loadTodayData]);

  const insertCheckin = async (event, status, extra = {}) => {
    const { error } = await supabase
      .from(GAMIFICATION_TABLES.dailyCheckins)
      .insert({
        athlete_id: athleteId,
        event_id: event.id,
        check_in_date: todayKey(),
        status,
        ...extra,
      });
    if (error) throw error;
  };

  const handleMorningResponse = async (status) => {
    if (!firstEvent || !athleteId) return;

    if (status === "rescheduled") {
      setRescheduleMode(true);
      setRescheduleDate(firstEvent.event_date);
      setRescheduleTime(firstEvent.start_time?.slice(0, 5) || "");
      return;
    }

    setSubmitting(true);
    try {
      await insertCheckin(firstEvent, status);

      if (status === "confirmed") {
        const eventAt = combineEventDateTime(
          firstEvent.event_date,
          firstEvent.start_time
        );
        scheduleEventReminder(firstEvent.title, eventAt);
        scheduleCompletionPrompt(firstEvent.title, eventAt);
        scheduleMorningCheckin(firstEvent.title, firstEvent.event_date);

        await processGamificationAction(athleteId, supabase, {
          xpAmount: XP_REWARDS.MORNING_CONFIRM,
          updateStreakFlag: true,
        });

        toast({ title: "You're in! +25 XP" });
      } else {
        toast({
          title: status === "skipped" ? "Marked as not today" : "Rescheduled",
          description:
            status === "skipped"
              ? "Your trainer may follow up."
              : undefined,
        });
      }

      setMorningOpen(false);
      setRescheduleMode(false);
      await loadTodayData();
      dispatchGamificationUpdated();
      onGamificationUpdate?.();
    } catch (err) {
      toast({
        title: "Check-in failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReschedule = async () => {
    if (!firstEvent || !rescheduleDate) return;
    setSubmitting(true);
    try {
      const { error: evErr } = await supabase
        .from(GAMIFICATION_TABLES.athleteEvents)
        .update({
          event_date: rescheduleDate,
          start_time: rescheduleTime || firstEvent.start_time,
        })
        .eq("id", firstEvent.id)
        .eq("athlete_id", athleteId);

      if (evErr) throw evErr;

      await insertCheckin(firstEvent, "rescheduled", {
        note: `Rescheduled to ${rescheduleDate}`,
      });

      setMorningOpen(false);
      setRescheduleMode(false);
      toast({ title: "Event rescheduled" });
      await loadTodayData();
      dispatchGamificationUpdated();
      onGamificationUpdate?.();
    } catch (err) {
      toast({
        title: "Reschedule failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnergyRating = async (rating) => {
    if (!postEventCheckin || !athleteId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from(GAMIFICATION_TABLES.dailyCheckins)
        .update({ energy_rating: rating })
        .eq("id", postEventCheckin.checkin.id)
        .eq("athlete_id", athleteId);

      if (error) throw error;

      await processGamificationAction(athleteId, supabase, {
        xpAmount: XP_REWARDS.ENERGY_RATING,
        updateStreakFlag: true,
      });

      toast({ title: "Session logged! +50 XP" });
      setPostEventCheckin(null);
      dispatchGamificationUpdated();
      onGamificationUpdate?.();
      await loadTodayData();
    } catch (err) {
      toast({
        title: "Could not save rating",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const postEventAnchor =
    typeof document !== "undefined"
      ? document.getElementById("schedule-post-event-anchor")
      : null;

  const postEventCard =
    onSchedulePage && postEventCheckin ? (
      <div className="rounded-xl border border-brand-blue/40 bg-brand-blue/10 p-4 space-y-3 mb-4">
        <p className="text-brand-white font-medium">
          How&apos;d {postEventCheckin.event.title} go?
        </p>
        <div className="flex justify-between gap-2">
          {ENERGY_OPTIONS.map((opt) => (
            <button
              key={opt.rating}
              type="button"
              disabled={submitting}
              onClick={() => handleEnergyRating(opt.rating)}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg bg-brand-charcoal hover:bg-brand-gray/40 transition-colors disabled:opacity-50"
              aria-label={opt.label}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-[10px] text-brand-lightGray">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null;

  if (!athleteId || loading) {
    return postEventAnchor && postEventCard
      ? createPortal(postEventCard, postEventAnchor)
      : null;
  }

  const timeLabel = firstEvent?.start_time
    ? formatEventTime(firstEvent.start_time)
    : "TBD";

  const badgeClass =
    firstEvent &&
    (EVENT_TYPE_BADGE_STYLES[firstEvent.event_type] ||
      EVENT_TYPE_BADGE_STYLES.rest);

  return (
    <>
      {postEventAnchor && postEventCard
        ? createPortal(postEventCard, postEventAnchor)
        : null}

      <Sheet open={morningOpen} onOpenChange={setMorningOpen}>
        <SheetContent
          side="bottom"
          className="bg-brand-black border-brand-gray/30 text-brand-white rounded-t-2xl max-h-[90vh] overflow-y-auto"
        >
          <SheetHeader className="text-left pb-2">
            <SheetTitle className="text-brand-white">Morning check-in</SheetTitle>
          </SheetHeader>

          {firstEvent && !rescheduleMode && (
            <div className="space-y-4 pb-6">
              <div className="rounded-lg bg-brand-charcoal p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{firstEvent.title}</p>
                  <Badge variant="outline" className={`border ${badgeClass}`}>
                    {firstEvent.event_type}
                  </Badge>
                </div>
                <p className="text-sm text-brand-lightGray">{timeLabel}</p>
              </div>

              <p className="text-lg font-medium leading-snug">
                You have {firstEvent.title} at {timeLabel} today. You showing
                up?
              </p>

              <div className="grid gap-2">
                <Button
                  disabled={submitting}
                  onClick={() => handleMorningResponse("confirmed")}
                  className="h-12 text-base bg-green-600 hover:bg-green-700 text-white"
                >
                  ✅ I&apos;m in
                </Button>
                <Button
                  disabled={submitting}
                  variant="outline"
                  onClick={() => handleMorningResponse("skipped")}
                  className="h-12 text-base border-red-500/40 text-red-400 hover:bg-red-500/10"
                >
                  ❌ Not today
                </Button>
                <Button
                  disabled={submitting}
                  variant="outline"
                  onClick={() => handleMorningResponse("rescheduled")}
                  className="h-12 text-base border-brand-gray/40 text-brand-lightGray hover:bg-brand-charcoal"
                >
                  🔁 Need to reschedule
                </Button>
              </div>
            </div>
          )}

          {rescheduleMode && (
            <div className="space-y-4 pb-6">
              <div className="space-y-2">
                <Label className="text-brand-lightGray">New date</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-brand-lightGray">New time</Label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
                />
              </div>
              <Button
                disabled={submitting}
                onClick={submitReschedule}
                className="w-full bg-gradient-orange-blue text-white"
              >
                Save new time
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
