import { useState, useEffect, useCallback } from "react";
import { Plus, MapPin, Clock, Users, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import AddEventModal from "@/components/AddEventModal";
import WeekConfirmBanner from "@/components/WeekConfirmBanner";
import AthleteStatsBar from "@/components/AthleteStatsBar";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  getWeekBounds,
  addWeeks,
  format,
  EVENT_TYPE_BADGE_STYLES,
  formatEventTime,
  toDateKey,
} from "@/lib/scheduleUtils";

const EVENT_TYPE_LABELS = {
  game: "Game",
  practice: "Practice",
  workout: "Workout",
  rest: "Rest",
};

export default function SchedulePage() {
  const { user } = useAuth();
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [statsRefresh, setStatsRefresh] = useState(0);

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const { start, end } = getWeekBounds(weekAnchor);
    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(end, "yyyy-MM-dd");

    try {
      const { data, error } = await supabase
        .from("athlete_events")
        .select("*")
        .eq("athlete_id", user.id)
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date")
        .order("start_time", { ascending: true, nullsFirst: false });

      if (error) throw error;

      setEvents(data || []);
      setSelectedEvent((prev) => {
        if (!prev) return null;
        return (data || []).find((e) => e.id === prev.id) || null;
      });
    } catch (err) {
      console.error("Error fetching schedule:", err);
      toast({
        title: "Could not load schedule",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, weekAnchor]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleAddEvent = async (payload) => {
    const { error } = await supabase.from("athlete_events").insert([
      {
        athlete_id: user.id,
        ...payload,
      },
    ]);

    if (error) throw error;

    toast({
      title: "Event added",
      description: `${payload.title} was added to your schedule.`,
    });

    await fetchEvents();
  };

  const handleGamificationUpdate = () => {
    setStatsRefresh((k) => k + 1);
  };

  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey);
    setSelectedEvent(null);
  };

  const selectedDayEvents = events.filter(
    (event) => event.event_date === selectedDate
  );

  const selectedDayLabel = selectedDate
    ? format(new Date(`${selectedDate}T00:00:00`), "EEEE, MMM d")
    : "Selected day";

  const badgeClass =
    selectedEvent &&
    (EVENT_TYPE_BADGE_STYLES[selectedEvent.event_type] ||
      EVENT_TYPE_BADGE_STYLES.rest);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-brand-white">
            My Schedule
          </h1>
          <p className="text-brand-lightGray mt-1 text-sm sm:text-base">
            Plan games, practices, workouts, and rest days for the week
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-gradient-orange-blue text-white border-0 shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      <WeekConfirmBanner
        athleteId={user?.id}
        onConfirmed={handleGamificationUpdate}
      />

      <AthleteStatsBar athleteId={user?.id} refreshKey={statsRefresh} />

      <div id="schedule-post-event-anchor" />

      <Card className="bg-brand-black border-brand-gray/30">
        <CardContent className="p-3 sm:p-6">
          <WeeklyCalendar
            weekAnchor={weekAnchor}
            events={events}
            selectedDate={selectedDate}
            selectedEventId={selectedEvent?.id}
            onSelectDate={handleSelectDate}
            onSelectEvent={setSelectedEvent}
            onPrevWeek={() => {
              setWeekAnchor((d) => addWeeks(d, -1));
              setSelectedDate((d) =>
                toDateKey(addWeeks(new Date(`${d}T00:00:00`), -1))
              );
              setSelectedEvent(null);
            }}
            onNextWeek={() => {
              setWeekAnchor((d) => addWeeks(d, 1));
              setSelectedDate((d) =>
                toDateKey(addWeeks(new Date(`${d}T00:00:00`), 1))
              );
              setSelectedEvent(null);
            }}
            onToday={() => {
              const today = new Date();
              setWeekAnchor(today);
              setSelectedDate(toDateKey(today));
              setSelectedEvent(null);
            }}
            loading={loading}
          />
        </CardContent>
      </Card>

      <Card className="bg-brand-black border-brand-gray/30">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-brand-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-orange" />
                {selectedDayLabel}
              </h2>
              <p className="text-sm text-brand-lightGray mt-1">
                {selectedDayEvents.length === 0
                  ? "No scheduled events for this day."
                  : `${selectedDayEvents.length} scheduled event${
                      selectedDayEvents.length === 1 ? "" : "s"
                    }`}
              </p>
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="border-brand-orange/50 text-brand-orange hover:bg-brand-orange/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to This Day
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-brand-charcoal animate-pulse"
                />
              ))}
            </div>
          ) : selectedDayEvents.length > 0 ? (
            <div className="space-y-3">
              {selectedDayEvents.map((event) => {
                const dayBadgeClass =
                  EVENT_TYPE_BADGE_STYLES[event.event_type] ||
                  EVENT_TYPE_BADGE_STYLES.rest;
                const active = selectedEvent?.id === event.id;

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      active
                        ? "border-brand-orange bg-brand-orange/10"
                        : "border-brand-gray/30 bg-brand-charcoal/60 hover:border-brand-orange/50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-brand-white">
                          {event.title}
                        </h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-brand-lightGray">
                          {event.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-brand-orange" />
                              {formatEventTime(event.start_time)}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-brand-orange" />
                              {event.location}
                            </span>
                          )}
                          {event.event_type === "game" && event.opponent && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-brand-orange" />
                              vs {event.opponent}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`capitalize border shrink-0 ${dayBadgeClass}`}
                      >
                        {EVENT_TYPE_LABELS[event.event_type] ||
                          event.event_type}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-brand-gray/30 p-8 text-center">
              <p className="text-brand-gray">Tap another day or add an event.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEvent && (
        <Card className="bg-brand-black border-brand-gray/30 animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-brand-white">
                {selectedEvent.title}
              </h3>
              <Badge
                variant="outline"
                className={`capitalize border ${badgeClass}`}
              >
                {EVENT_TYPE_LABELS[selectedEvent.event_type] ||
                  selectedEvent.event_type}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-brand-lightGray">
              {selectedEvent.start_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-orange" />
                  <span>{formatEventTime(selectedEvent.start_time)}</span>
                </div>
              )}
              {selectedEvent.event_type === "game" &&
                selectedEvent.opponent && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-orange" />
                    <span>vs {selectedEvent.opponent}</span>
                  </div>
                )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-orange" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
            </div>

            {selectedEvent.notes ? (
              <div className="pt-2 border-t border-brand-gray/30">
                <p className="text-sm font-medium text-brand-lightGray mb-1">
                  Notes
                </p>
                <p className="text-brand-white whitespace-pre-wrap">
                  {selectedEvent.notes}
                </p>
              </div>
            ) : (
              <p className="text-sm text-brand-gray italic">No notes</p>
            )}
          </CardContent>
        </Card>
      )}

      <AddEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAddEvent}
        defaultDate={selectedDate || format(weekAnchor, "yyyy-MM-dd")}
      />
    </div>
  );
}
