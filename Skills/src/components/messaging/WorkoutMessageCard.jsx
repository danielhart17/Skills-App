import { useState } from "react";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addWorkoutToCalendar } from "@/api/messagingService";
import { toast } from "@/components/ui/use-toast";
import { formatEventTime } from "@/lib/scheduleUtils";

export default function WorkoutMessageCard({ payload, athleteId, isAthleteView }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!payload) return null;

  const handleAdd = async () => {
    setLoading(true);
    try {
      await addWorkoutToCalendar(athleteId, payload);
      setAdded(true);
      toast({ title: "Added to your schedule 🏀" });
    } catch (err) {
      toast({
        title: "Could not add to calendar",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const timeLabel = payload.scheduled_time
    ? formatEventTime(
        payload.scheduled_time.length === 5
          ? `${payload.scheduled_time}:00`
          : payload.scheduled_time
      )
    : null;

  return (
    <div className="rounded-xl border border-brand-orange/40 bg-brand-black/80 p-4 space-y-3 max-w-sm">
      <div className="flex items-center gap-2 text-brand-orange font-semibold">
        <Dumbbell className="w-5 h-5" />
        <span>Workout</span>
      </div>
      <h4 className="font-bold text-brand-white">{payload.title}</h4>
      <p className="text-sm text-brand-lightGray">
        {payload.scheduled_date}
        {timeLabel ? ` at ${timeLabel}` : ""}
      </p>
      <Badge variant="outline" className="border-brand-orange/50 text-brand-orange">
        {payload.intensity} intensity
      </Badge>
      <ul className="text-sm text-brand-lightGray space-y-1 list-disc pl-4">
        {(payload.drills || []).map((d, i) => (
          <li key={i}>
            <span className="text-brand-white">{d.name}</span> — {d.sets}
            {d.notes ? ` (${d.notes})` : ""}
          </li>
        ))}
      </ul>
      {payload.trainer_notes && (
        <p className="text-xs text-brand-gray italic border-t border-brand-gray/20 pt-2">
          {payload.trainer_notes}
        </p>
      )}
      {isAthleteView && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            disabled={added || loading}
            onClick={handleAdd}
            className="bg-brand-blue text-white flex-1"
          >
            {added ? "Added ✅" : "Add to My Calendar"}
          </Button>
          {!added && (
            <Button
              size="sm"
              variant="ghost"
              className="text-brand-gray"
              onClick={() => setAdded(true)}
            >
              Dismiss
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
