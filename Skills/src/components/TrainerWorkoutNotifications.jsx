import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchRecentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/api/followService";

export default function TrainerWorkoutNotifications() {
  const { user, isAthlete } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id || !isAthlete?.()) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchRecentNotifications(user.id, 8);
      setItems(rows || []);
    } catch (error) {
      console.warn("Could not load notifications:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAthlete]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAthlete?.() || loading || items.length === 0) return null;

  const unread = items.filter((n) => !n.read_at);
  if (unread.length === 0 && items.length === 0) return null;

  // Prefer showing when there are unread workout notices; still show latest unread
  const visible = unread.length > 0 ? unread.slice(0, 3) : [];
  if (visible.length === 0) return null;

  return (
    <Card className="bg-brand-orange/10 border-brand-orange/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-7 h-7 text-brand-orange shrink-0" />
            <div>
              <p className="text-brand-white font-medium text-sm">
                {visible.length} new workout
                {visible.length === 1 ? "" : "s"} from trainers you follow
              </p>
              <p className="text-brand-lightGray text-xs">
                Open a workout or mark all as read
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-brand-orange/40 text-brand-orange"
            onClick={async () => {
              try {
                await markAllNotificationsRead(user.id);
                setItems((prev) =>
                  prev.map((n) => ({
                    ...n,
                    read_at: n.read_at || new Date().toISOString(),
                  }))
                );
              } catch (error) {
                console.warn(error);
              }
            }}
          >
            Mark read
          </Button>
        </div>

        <div className="space-y-2">
          {visible.map((note) => (
            <div
              key={note.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg bg-black/20 p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {note.title}
                </p>
                {note.body && (
                  <p className="text-xs text-brand-lightGray truncate">
                    {note.body}
                  </p>
                )}
              </div>
              <Link
                to={note.link || "/workouts"}
                onClick={async () => {
                  try {
                    await markNotificationRead(note.id);
                    setItems((prev) =>
                      prev.map((n) =>
                        n.id === note.id
                          ? { ...n, read_at: new Date().toISOString() }
                          : n
                      )
                    );
                  } catch (error) {
                    console.warn(error);
                  }
                }}
              >
                <Button
                  size="sm"
                  className="bg-brand-orange hover:opacity-90 text-white w-full sm:w-auto"
                >
                  <Dumbbell className="w-4 h-4 mr-1.5" />
                  View
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
