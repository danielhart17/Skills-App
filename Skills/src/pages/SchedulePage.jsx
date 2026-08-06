import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  MapPin,
  Clock,
  Users,
  CalendarDays,
  ExternalLink,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import AddEventModal from "@/components/AddEventModal";
import AthleteStatsBar from "@/components/AthleteStatsBar";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  getScheduleEventHref,
  getYouTubeId,
  loadScheduleEventSource,
} from "@/utils/scheduleLinks";
import {
  getWeekBounds,
  addWeeks,
  format,
  EVENT_TYPE_BADGE_STYLES,
  formatEventTime,
  toDateKey,
} from "@/lib/scheduleUtils";
import {
  fetchAthleteBookingsForRange,
  mergeScheduleWithBookings,
} from "@/lib/bookingSchedule";

const EVENT_TYPE_LABELS = {
  game: "Game",
  practice: "Practice",
  workout: "Workout",
  rest: "Rest",
  training: "Training",
};

export default function SchedulePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventSource, setEventSource] = useState(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const openEventDetail = (event) => {
    setSelectedEvent(event);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSource = async () => {
      if (!selectedEvent || selectedEvent.event_type !== "workout") {
        setEventSource(null);
        setLoadingSource(false);
        return;
      }

      setLoadingSource(true);
      try {
        const source = await loadScheduleEventSource(selectedEvent);
        if (!cancelled) setEventSource(source);
      } catch (error) {
        console.error("Error loading workout media:", error);
        if (!cancelled) setEventSource(null);
      } finally {
        if (!cancelled) setLoadingSource(false);
      }
    };

    loadSource();
    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const { start, end } = getWeekBounds(weekAnchor);
    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(end, "yyyy-MM-dd");

    try {
      const [{ data, error }, bookings] = await Promise.all([
        supabase
          .from("athlete_events")
          .select("*")
          .eq("athlete_id", user.id)
          .gte("event_date", startDate)
          .lte("event_date", endDate)
          .order("event_date")
          .order("start_time", { ascending: true, nullsFirst: false }),
        fetchAthleteBookingsForRange(user.id, startDate, endDate),
      ]);

      if (error) throw error;

      const merged = mergeScheduleWithBookings(data || [], bookings);
      setEvents(merged);
      setSelectedEvent((prev) => {
        if (!prev) return null;
        return merged.find((e) => e.id === prev.id) || null;
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

  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey);
    setSelectedEvent(null);
    setEventSource(null);
  };

  const detailHref =
    eventSource?.href || getScheduleEventHref(selectedEvent);
  const videoId = getYouTubeId(eventSource?.youtube_url);

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
            Plan games, practices, workouts, trainer sessions, and rest days
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

      <AthleteStatsBar athleteId={user?.id} />

      <div id="schedule-post-event-anchor" />

      {/* Selected day above week view */}
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
                const linked = !!(event.drill_id || event.challenge_id);

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEventDetail(event)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      active
                        ? "border-brand-orange bg-brand-orange/10"
                        : "border-brand-gray/30 bg-brand-charcoal/60 hover:border-brand-orange/50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-brand-white flex items-center gap-2">
                          {event.title}
                          {(linked || event.event_type === "workout") && (
                            <Play className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                          )}
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
                          {event.event_type === "training" && event.opponent && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-brand-orange" />
                              {event.opponent}
                            </span>
                          )}
                          {event.event_type === "workout" && (
                            <span className="text-brand-orange text-xs">
                              Tap to view video & details
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
              <div>
                <h3 className="text-xl font-bold text-brand-white">
                  {selectedEvent.title}
                </h3>
                {eventSource?.description && (
                  <p className="text-sm text-brand-lightGray mt-2">
                    {eventSource.description}
                  </p>
                )}
              </div>
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

            {loadingSource && (
              <div className="flex items-center gap-2 text-sm text-brand-lightGray py-4">
                <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
                Loading workout video...
              </div>
            )}

            {!loadingSource && videoId && (
              <div className="pt-2 border-t border-brand-gray/30 space-y-2">
                <p className="text-sm font-medium text-brand-lightGray flex items-center gap-2">
                  <Play className="w-4 h-4 text-brand-orange" />
                  Demo Video
                </p>
                <div
                  className="relative w-full rounded-xl overflow-hidden border border-brand-gray/40 bg-black"
                  style={{ paddingBottom: "56.25%", height: 0 }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title={`${selectedEvent.title} demo video`}
                  />
                </div>
              </div>
            )}

            {!loadingSource &&
              selectedEvent.event_type === "workout" &&
              !videoId &&
              eventSource && (
                <p className="text-sm text-brand-gray italic">
                  No demo video linked for this workout yet.
                </p>
              )}

            {eventSource?.setup && (
              <div className="pt-2 border-t border-brand-gray/30">
                <p className="text-sm font-medium text-brand-lightGray mb-1">
                  Setup
                </p>
                <p className="text-brand-white whitespace-pre-wrap text-sm">
                  {eventSource.setup}
                </p>
              </div>
            )}

            {eventSource?.steps?.length > 0 && (
              <div className="pt-2 border-t border-brand-gray/30 space-y-2">
                <p className="text-sm font-medium text-brand-lightGray">
                  Steps
                </p>
                {eventSource.steps.map((step, i) => (
                  <div key={i} className="flex gap-2 text-sm text-brand-white">
                    <span className="text-brand-orange font-semibold">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}

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
              !eventSource && (
                <p className="text-sm text-brand-gray italic">No notes</p>
              )
            )}

            {detailHref && (
              <Button
                className="w-full sm:w-auto bg-brand-orange hover:opacity-90 text-white"
                onClick={() => navigate(detailHref)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open full details
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-brand-black border-brand-gray/30">
        <CardContent className="p-3 sm:p-6">
          <WeeklyCalendar
            weekAnchor={weekAnchor}
            events={events}
            selectedDate={selectedDate}
            selectedEventId={selectedEvent?.id}
            onSelectDate={handleSelectDate}
            onSelectEvent={openEventDetail}
            onPrevWeek={() => {
              setWeekAnchor((d) => addWeeks(d, -1));
              setSelectedDate((d) =>
                toDateKey(addWeeks(new Date(`${d}T00:00:00`), -1))
              );
              setSelectedEvent(null);
              setEventSource(null);
            }}
            onNextWeek={() => {
              setWeekAnchor((d) => addWeeks(d, 1));
              setSelectedDate((d) =>
                toDateKey(addWeeks(new Date(`${d}T00:00:00`), 1))
              );
              setSelectedEvent(null);
              setEventSource(null);
            }}
            onToday={() => {
              const today = new Date();
              setWeekAnchor(today);
              setSelectedDate(toDateKey(today));
              setSelectedEvent(null);
              setEventSource(null);
            }}
            loading={loading}
          />
        </CardContent>
      </Card>

      <AddEventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleAddEvent}
        defaultDate={selectedDate || format(weekAnchor, "yyyy-MM-dd")}
      />
    </div>
  );
}
