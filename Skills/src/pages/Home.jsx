import { useState, useEffect, useCallback } from "react";
import { Lesson } from "@/api/entities";
import { Challenge } from "@/api/entities";
import { WorkoutAssignment } from "@/api/entities";
import { ChallengeProgress } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkoutStats } from "@/hooks/useWorkoutStats";
import { toDateKey } from "@/lib/scheduleUtils";
import { getScheduleEventHref } from "@/utils/scheduleLinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Brain,
  Trophy,
  Flame,
  Star,
  Clock,
  Play,
  Dumbbell,
  CalendarDays,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";
import UnreadMessagesBadge from "@/components/UnreadMessagesBadge";

const EVENT_TYPE_LABELS = {
  game: "Game",
  practice: "Practice",
  workout: "Workout",
  rest: "Rest",
};

async function settledValue(promise, fallback) {
  try {
    return await promise;
  } catch (error) {
    console.warn("Home dashboard load partial failure:", error);
    return fallback;
  }
}

export default function Home() {
  const {
    isAdmin,
    isTrainer,
    isParent,
    isAthlete,
    user,
    profile: authProfile,
  } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(authProfile);
  const [recentLessons, setRecentLessons] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { workoutsCompleted, loading: workoutsLoading } = useWorkoutStats(
    user?.id
  );

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
    }
  }, [authProfile]);

  const loadUserData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Direct profiles query by auth user id — avoid User.me() / getUser() hangs
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (profileData) setProfile(profileData);

      // Local calendar day — matches Schedule page (not UTC via toISOString)
      const today = toDateKey(new Date());

      const [lessons, allChallenges, completedIds, assignments, eventsResult] =
        await Promise.all([
          settledValue(Lesson.list(), []),
          settledValue(Challenge.list(), []),
          settledValue(ChallengeProgress.getCompletedChallenges(), []),
          settledValue(WorkoutAssignment.getAssignedToMe(), []),
          supabase
            .from("athlete_events")
            .select("*")
            .eq("athlete_id", user.id)
            .eq("event_date", today)
            .order("start_time", { ascending: true, nullsFirst: false }),
        ]);

      if (eventsResult.error) {
        console.error("Error loading today's events:", eventsResult.error);
      }

      setRecentLessons((lessons || []).slice(0, 3));

      const completedSet = new Set(completedIds || []);
      const assignmentChallengeIds = new Set(
        (assignments || [])
          .filter((a) => a.status !== "cancelled")
          .map((a) => a.challenge_id)
      );

      const scheduleItems = [];

      (eventsResult.data || []).forEach((event) => {
        scheduleItems.push({
          id: `event-${event.id}`,
          title: event.title,
          type: EVENT_TYPE_LABELS[event.event_type] || "Session",
          category: event.event_type,
          completed: false,
          href: getScheduleEventHref(event) || createPageUrl("Schedule"),
        });
      });

      (assignments || [])
        .filter((a) => a.status !== "cancelled" && a.status !== "completed")
        .forEach((assignment) => {
          scheduleItems.push({
            id: `assignment-${assignment.id}`,
            title: assignment.challenge?.title || "Assigned Workout",
            type: "Assigned",
            category: assignment.challenge?.category || "Workout",
            completed: assignment.status === "completed",
            href: `/workout-session/${assignment.id}`,
          });
        });

      (allChallenges || [])
        .filter(
          (c) =>
            c.is_active &&
            !completedSet.has(c.id) &&
            !assignmentChallengeIds.has(c.id)
        )
        .slice(0, 5)
        .forEach((challenge) => {
          scheduleItems.push({
            id: `challenge-${challenge.id}`,
            title: challenge.title,
            type: "Challenge",
            category: challenge.category || "Workout",
            completed: false,
            href: `/workouts/${challenge.id}`,
          });
        });

      setTodaySchedule(scheduleItems);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAdmin()) {
      navigate("/admindashboard", { replace: true });
      return;
    }
    if (isTrainer()) {
      navigate("/trainerdashboard", { replace: true });
      return;
    }
    if (isParent()) {
      navigate("/parentdashboard", { replace: true });
      return;
    }

    loadUserData();
  }, [isAdmin, isTrainer, isParent, navigate, loadUserData]);

  const getLevelProgress = () => {
    if (!profile) return 0;
    const xpForPreviousLevels =
      (((profile.current_level - 1) * profile.current_level) / 2) * 100;
    const xpForNextLevel = profile.current_level * 100;
    const currentLevelTotalXp = profile.total_xp - xpForPreviousLevels;
    const progress = (currentLevelTotalXp / xpForNextLevel) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getStreakColor = () => {
    if (!profile) return "text-gray-500";
    if (profile.current_streak >= 30) return "text-red-500";
    if (profile.current_streak >= 14) return "text-orange-500";
    if (profile.current_streak >= 7) return "text-yellow-500";
    return "text-blue-500";
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {isAthlete() && <UnreadMessagesBadge />}
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Player"}! 🏀
            </h1>
            <p className="text-brand-lightGray text-lg">
              Ready to improve your game today?
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Learn")}>
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg transition-all">
                <Brain className="w-5 h-5 mr-2" />
                Learn
              </Button>
            </Link>
            <Link to="/workouts">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl shadow-lg transition-all">
                <Trophy className="w-5 h-5 mr-2" />
                Workouts
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards - Hidden for trainers */}
        {!isTrainer() && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      Current Level
                    </p>
                    <p className="text-3xl font-bold">
                      {profile?.current_level || 1}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-blue-200" />
                </div>
                <div className="mt-4">
                  <Progress
                    value={getLevelProgress()}
                    className="h-2 bg-blue-400"
                  />
                  <p className="text-blue-100 text-xs mt-1">
                    {Math.round(getLevelProgress())}% to next level
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">
                      Current Streak
                    </p>
                    <p className="text-3xl font-bold">
                      {profile?.current_streak || 0}
                    </p>
                  </div>
                  <Flame className={`w-8 h-8 ${getStreakColor()}`} />
                </div>
                <p className="text-yellow-100 text-xs mt-2">
                  Best: {profile?.longest_streak || 0} days
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium">
                      Workouts Completed
                    </p>
                    <p className="text-3xl font-bold">
                      {workoutsLoading ? "—" : workoutsCompleted}
                    </p>
                  </div>
                  <Dumbbell className="w-8 h-8 text-emerald-200" />
                </div>
                <p className="text-emerald-100 text-xs mt-2">Lifetime total</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-0 shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Play className="w-6 h-6 text-brand-orange" />
                Continue Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentLessons.length > 0 ? (
                recentLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          lesson.mode === "iq"
                            ? "bg-blue-500/20"
                            : "bg-orange-500/20"
                        }`}
                      >
                        {lesson.mode === "iq" ? (
                          <Brain className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Dumbbell className="w-5 h-5 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {lesson.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={`text-xs ${
                              lesson.mode === "iq"
                                ? "bg-blue-500 hover:bg-blue-600"
                                : "bg-orange-500 hover:bg-orange-600"
                            } text-white`}
                          >
                            {lesson.mode === "iq" ? "IQ Mode" : "On Court"}
                          </Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.estimated_time || 5}min
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-brand-orange hover:opacity-90"
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                    >
                      Start
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    No lessons available yet.
                  </p>
                  <Link to={createPageUrl("Learn")}>
                    <Button className="bg-gradient-to-r from-blue-500 to-indigo-500">
                      Explore Lessons
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <CalendarDays className="w-6 h-6 text-brand-orange" />
                Today&apos;s Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaySchedule.length > 0 ? (
                <div className="space-y-2">
                  {todaySchedule.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors group"
                    >
                      <div className="shrink-0">
                        {item.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium text-sm truncate ${
                            item.completed ? "text-gray-400 line-through" : "text-white"
                          }`}
                        >
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 border-gray-600 text-gray-400"
                          >
                            {item.type}
                          </Badge>
                          {item.category && (
                            <span className="text-[10px] text-gray-500 capitalize truncate">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-orange shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarDays className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-1">Nothing on your schedule today.</p>
                  <p className="text-gray-500 text-sm mb-4">
                    Browse workouts to find something to work on.
                  </p>
                  <Link to={createPageUrl("Workouts")}>
                    <Button className="bg-gradient-to-r from-yellow-500 to-orange-500">
                      Browse Workouts
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
