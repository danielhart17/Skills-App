import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getWeekDays,
  formatWeekRange,
  groupEventsByDate,
  toDateKey,
  EVENT_TYPE_STYLES,
  formatEventTime,
  isToday,
  format,
} from "@/lib/scheduleUtils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function WeeklyCalendar({
  weekAnchor,
  events,
  selectedDate,
  selectedEventId,
  onSelectDate,
  onSelectEvent,
  onPrevWeek,
  onNextWeek,
  onToday,
  loading,
}) {
  const weekDays = getWeekDays(weekAnchor);
  const eventsByDate = groupEventsByDate(events);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onPrevWeek}
            className="border-brand-gray/30 text-brand-white hover:bg-brand-charcoal"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onNextWeek}
            className="border-brand-gray/30 text-brand-white hover:bg-brand-charcoal"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onToday}
            className="border-brand-gray/30 text-brand-lightGray hover:bg-brand-charcoal hover:text-brand-orange"
          >
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold text-brand-white">
          {formatWeekRange(weekAnchor)}
        </h2>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2 min-h-[280px]">
        {weekDays.map((day) => {
          const dateKey = toDateKey(day);
          const dayEvents = eventsByDate[dateKey] || [];
          const today = isToday(day);
          const isSelectedDay = selectedDate === dateKey;

          return (
            <div
              key={dateKey}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate?.(dateKey)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate?.(dateKey);
                }
              }}
              className={`flex flex-col rounded-xl border bg-brand-black p-2 sm:p-3 min-h-[160px] sm:min-h-[240px] text-left transition-all hover:border-brand-orange/70 hover:bg-brand-charcoal/50 ${
                isSelectedDay
                  ? "border-brand-orange border-2 shadow-md shadow-brand-orange/20"
                  : today
                  ? "border-brand-blue border-2 shadow-md shadow-brand-blue/20"
                  : "border-brand-gray/30"
              }`}
            >
              <div className="text-center mb-2 pb-2 border-b border-brand-gray/20">
                <div className="text-[10px] sm:text-xs font-medium text-brand-lightGray uppercase">
                  {DAY_LABELS[day.getDay()]}
                </div>
                <div
                  className={`text-sm sm:text-lg font-bold ${
                    isSelectedDay
                      ? "text-brand-orange"
                      : today
                      ? "text-brand-blue"
                      : "text-brand-white"
                  }`}
                >
                  {format(day, "d")}
                </div>
                {dayEvents.length > 0 && (
                  <div className="mt-1 text-[10px] text-brand-gray">
                    {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {loading ? (
                  <div className="h-8 rounded bg-brand-charcoal animate-pulse" />
                ) : dayEvents.length > 0 ? (
                  dayEvents.map((event) => {
                    const pillStyle =
                      EVENT_TYPE_STYLES[event.event_type] ||
                      EVENT_TYPE_STYLES.rest;
                    const isSelected = selectedEventId === event.id;

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate?.(dateKey);
                          onSelectEvent(event);
                        }}
                        className={`w-full text-left text-[10px] sm:text-xs px-2 py-1.5 rounded-md transition-all leading-tight ${pillStyle} ${
                          isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-brand-black" : ""
                        }`}
                        title={event.title}
                      >
                        <span className="block font-semibold whitespace-normal break-words">
                          {event.title}
                        </span>
                        {event.start_time && (
                          <span className="block opacity-90 text-[9px] sm:text-[10px] mt-0.5">
                            {formatEventTime(event.start_time)}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[48px]">
                    <span className="text-[10px] sm:text-xs text-brand-gray italic text-center px-1">
                      Rest day
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
