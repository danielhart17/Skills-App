import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  Loader2,
  MapPin,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WeeklyCalendar from "@/components/WeeklyCalendar";
import {
  fetchTrainerBookingsForRange,
  groupTrainerBookingsIntoSessions,
} from "@/lib/bookingSchedule";
import {
  EVENT_TYPE_BADGE_STYLES,
  addWeeks,
  format,
  formatEventTime,
  getWeekBounds,
  toDateKey,
} from "@/lib/scheduleUtils";
import { toast } from "sonner";

function athleteLabel(booking) {
  return (
    booking?.profiles?.full_name?.trim() ||
    booking?.profiles?.email ||
    "Athlete"
  );
}

export default function TrainerScheduleTab({ trainerId }) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateKey(new Date())
  );
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!trainerId) return;

    setLoading(true);
    const { start, end } = getWeekBounds(weekAnchor);
    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(end, "yyyy-MM-dd");

    try {
      const bookings = await fetchTrainerBookingsForRange(
        trainerId,
        startDate,
        endDate
      );
      const grouped = groupTrainerBookingsIntoSessions(bookings);
      setSessions(grouped);
      setSelectedSession((prev) => {
        if (!prev) return null;
        return grouped.find((s) => s.id === prev.id) || null;
      });
    } catch (err) {
      console.error("Error loading trainer schedule:", err);
      toast.error(err.message || "Could not load schedule");
    } finally {
      setLoading(false);
    }
  }, [trainerId, weekAnchor]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSelectDate = (dateKey) => {
    setSelectedDate(dateKey);
    setSelectedSession(null);
  };

  const selectedDaySessions = sessions.filter(
    (session) => session.event_date === selectedDate
  );

  const selectedDayLabel = selectedDate
    ? format(new Date(`${selectedDate}T00:00:00`), "EEEE, MMM d")
    : "Selected day";

  const badgeClass =
    selectedSession &&
    (EVENT_TYPE_BADGE_STYLES[selectedSession.event_type] ||
      EVENT_TYPE_BADGE_STYLES.training);

  if (selectedSession) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="px-0 h-auto text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedSession(null)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Schedule
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{selectedSession.title}</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className={badgeClass}>
                Training
              </Badge>
              {selectedSession.start_time && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatEventTime(selectedSession.start_time)}
                </Badge>
              )}
              {selectedSession.duration_minutes && (
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  {selectedSession.duration_minutes} min
                </Badge>
              )}
              {selectedSession.location && (
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  {selectedSession.location}
                </Badge>
              )}
              <Badge>
                <Users className="w-3 h-3 mr-1" />
                {selectedSession.attendees.length} attending
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {format(
                new Date(selectedSession.booking_datetime),
                "EEEE, MMM d · h:mm a"
              )}
            </p>
          </div>
        </div>

        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-orange" />
          Who&apos;s attending
        </h3>

        {selectedSession.attendees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No athletes booked for this session yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {selectedSession.attendees.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-lg">
                        {athleteLabel(booking)}
                      </p>
                      {booking.profiles?.email &&
                        booking.profiles?.full_name?.trim() && (
                          <p className="text-sm text-muted-foreground">
                            {booking.profiles.email}
                          </p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{booking.status}</Badge>
                      {booking.payment_status && (
                        <Badge variant="secondary">
                          {booking.payment_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {(booking.user_notes || booking.notes) && (
                    <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
                      {booking.user_notes || booking.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">My Schedule</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upcoming booked sessions — open one to see who&apos;s attending
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-brand-orange" />
                {selectedDayLabel}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {loading
                  ? "Loading sessions…"
                  : selectedDaySessions.length === 0
                    ? "No booked sessions for this day."
                    : `${selectedDaySessions.length} session${
                        selectedDaySessions.length === 1 ? "" : "s"
                      }`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
              Loading schedule…
            </div>
          ) : selectedDaySessions.length > 0 ? (
            <div className="space-y-3">
              {selectedDaySessions.map((session) => {
                const active = selectedSession?.id === session.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSession(session)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      active
                        ? "border-brand-orange bg-brand-orange/10"
                        : "border-border bg-background/40 hover:border-brand-orange/50"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{session.title}</h4>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          {session.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-brand-orange" />
                              {formatEventTime(session.start_time)}
                            </span>
                          )}
                          {session.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-brand-orange" />
                              {session.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-brand-orange" />
                            {session.attendees.length} attending
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 border ${EVENT_TYPE_BADGE_STYLES.training}`}
                      >
                        Training
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-muted-foreground">
                No bookings this day. Pick another day or wait for athletes to
                book.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <WeeklyCalendar
        weekAnchor={weekAnchor}
        events={sessions}
        selectedDate={selectedDate}
        selectedEventId={selectedSession?.id}
        onSelectDate={handleSelectDate}
        onSelectEvent={setSelectedSession}
        onPrevWeek={() => setWeekAnchor((d) => addWeeks(d, -1))}
        onNextWeek={() => setWeekAnchor((d) => addWeeks(d, 1))}
        onToday={() => {
          const today = new Date();
          setWeekAnchor(today);
          setSelectedDate(toDateKey(today));
          setSelectedSession(null);
        }}
        loading={loading}
      />
    </div>
  );
}
