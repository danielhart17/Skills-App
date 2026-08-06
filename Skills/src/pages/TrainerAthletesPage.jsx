import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Users, MessageSquare, Dumbbell, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { fetchTrainerActiveConnections, getMessagePreview } from "@/api/messagingService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, parseISO } from "date-fns";

export default function TrainerAthletesPage() {
  const { user } = useAuth();
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const connections = await fetchTrainerActiveConnections(user.id);

      const enriched = await Promise.all(
        connections.map(async (conn) => {
          const athleteId = conn.athlete_id;

          const { data: streak } = await supabase
            .from("athlete_streaks")
            .select("current_streak, last_checkin_date")
            .eq("athlete_id", athleteId)
            .maybeSingle();

          const { data: lastCheckin } = await supabase
            .from("daily_checkins")
            .select("check_in_date, status")
            .eq("athlete_id", athleteId)
            .order("check_in_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          let lastWorkout = null;
          if (conn.conversation?.id) {
            const { data: wm } = await supabase
              .from("messages")
              .select("workout_payload, created_at")
              .eq("conversation_id", conn.conversation.id)
              .eq("message_type", "workout")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            lastWorkout = wm;
          }

          return {
            ...conn,
            streak,
            lastCheckin,
            lastWorkout,
          };
        })
      );

      enriched.sort((a, b) => {
        const ta = a.conversation?.last_message_at || a.created_at;
        const tb = b.conversation?.last_message_at || b.created_at;
        return new Date(tb) - new Date(ta);
      });

      setRoster(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-brand-black rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-brand-white">My Athletes</h1>

      {roster.length === 0 ? (
        <Card className="bg-brand-black border-brand-gray/30">
          <CardContent className="p-8 text-center space-y-4">
            <Users className="w-12 h-12 mx-auto text-brand-gray" />
            <p className="text-brand-lightGray">No athletes connected yet</p>
            <p className="text-brand-gray text-sm">
              Athletes who follow you or message you will appear here.
            </p>
            <Button variant="outline" className="border-brand-gray/30" disabled>
              Waiting for followers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {roster.map((item) => {
            const name = item.profile?.full_name || "Athlete";
            const msgUrl = `/trainer/messages?athleteId=${item.athlete_id}`;
            const workoutUrl = `/trainer/messages?athleteId=${item.athlete_id}&compose=workout`;

            return (
              <Card
                key={item.id}
                className="bg-brand-black border-brand-gray/30"
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={item.profile?.avatar_url} />
                      <AvatarFallback>{name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-brand-white">{name}</h3>
                        {item.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white border-0">
                            {item.unreadCount} unread
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-brand-gray">Athlete</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-brand-lightGray">
                      <Flame className="w-4 h-4 text-brand-orange" />
                      <span>
                        {item.streak?.current_streak ?? 0} day streak
                      </span>
                    </div>
                    <div className="text-brand-lightGray text-xs">
                      Last check-in:{" "}
                      {item.lastCheckin
                        ? `${item.lastCheckin.check_in_date} (${item.lastCheckin.status})`
                        : "—"}
                    </div>
                  </div>

                  {item.lastWorkout?.workout_payload && (
                    <p className="text-xs text-brand-gray">
                      Last workout: {item.lastWorkout.workout_payload.title} —{" "}
                      {format(
                        parseISO(item.lastWorkout.created_at),
                        "MMM d"
                      )}
                    </p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Link to={msgUrl} className="flex-1 min-w-[120px]">
                      <Button
                        variant="outline"
                        className="w-full border-brand-gray/30 text-brand-white"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </Link>
                    <Link to={workoutUrl} className="flex-1 min-w-[120px]">
                      <Button className="w-full bg-gradient-orange-blue text-white border-0">
                        <Dumbbell className="w-4 h-4 mr-2" />
                        Send Workout
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
