
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Challenge,
  ChallengeProgress,
  WorkoutAssignment,
  Drill,
  DrillProgress,
} from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import {
  CalendarPlus,
  Trophy,
  Target,
  Clock,
  Star,
  Play,
  Filter,
  Crosshair,
  CheckCircle,
  Users,
  ArrowRight,
  Loader2,
  Zap,
  Footprints,
  Search,
  Dumbbell,
} from "lucide-react";
import BetaBadge from "@/components/BetaBadge";
import DrillCard from "@/components/drills/DrillCard";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { isDrillLike } from "@/utils/scheduleLinks";

function formatDateForInput(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match ? match[1] : null;
}

function getWorkoutThumbnail(challenge) {
  if (challenge?.thumbnail_url) return challenge.thumbnail_url;
  const ytId = getYouTubeId(challenge?.youtube_url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

function matchesSearchQuery(item, searchQuery) {
  if (!searchQuery?.trim()) return true;
  const q = searchQuery.trim().toLowerCase();
  return (
    item.title?.toLowerCase().includes(q) ||
    item.category?.toLowerCase().includes(q) ||
    item.description?.toLowerCase().includes(q) ||
    item.difficulty?.toLowerCase().includes(q) ||
    item.tags?.some((tag) => tag.toLowerCase().includes(q))
  );
}

function buildWorkoutScheduleNotes(workout, extraNotes) {
  return [
    workout.description,
    workout.duration_minutes ? `Duration: ${workout.duration_minutes} minutes` : null,
    workout.category ? `Category: ${workout.category}` : null,
    workout.difficulty ? `Difficulty: ${workout.difficulty}` : null,
    workout.xp_reward ? `XP Reward: ${workout.xp_reward}` : null,
    workout.equipment_needed?.length
      ? `Equipment: ${workout.equipment_needed.join(", ")}`
      : null,
    workout.setup ? `Setup:\n${workout.setup}` : null,
    workout.instructions ? `Instructions:\n${workout.instructions}` : null,
    workout.steps?.length
      ? `Steps:\n${workout.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`
      : null,
    workout.focus ? `Focus:\n${workout.focus}` : null,
    extraNotes?.trim() ? `Notes:\n${extraNotes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export default function Challenges() {
  const navigate = useNavigate();
  const { isAthlete, user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [drills, setDrills] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [completedDrillIds, setCompletedDrillIds] = useState([]);
  const [featuredChallenge, setFeaturedChallenge] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [parentAssignments, setParentAssignments] = useState([]);
  const [challengeCompletionCounts, setChallengeCompletionCounts] = useState(
    {}
  );
  const [drillCompletionCounts, setDrillCompletionCounts] = useState({});
  const [scheduleWorkout, setScheduleWorkout] = useState(null);
  const [scheduleSourceType, setScheduleSourceType] = useState("challenge");
  const [scheduleForm, setScheduleForm] = useState({
    event_date: formatDateForInput(),
    start_time: "",
    location: "",
    notes: "",
  });
  const [isScheduling, setIsScheduling] = useState(false);

  const loadAssignments = useCallback(async () => {
    if (!isAthlete()) return;
    try {
      const assignments = await WorkoutAssignment.getAssignedToMe();
      setParentAssignments(assignments.filter(a => a.status !== 'cancelled'));
    } catch (error) {
      console.error("Error loading assignments:", error);
    }
  }, [isAthlete]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isAthlete()) {
      loadAssignments();
    }
  }, [isAthlete, loadAssignments]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allChallenges, completedIds, allDrills, completedDrills] =
        await Promise.all([
          Challenge.list().catch(() => []),
          ChallengeProgress.getCompletedChallenges().catch(() => []),
          Drill.list().catch(() => []),
          DrillProgress.getCompletedDrills().catch(() => []),
        ]);

      setChallenges(allChallenges || []);
      setCompletedChallenges(completedIds || []);
      setDrills(allDrills || []);
      setCompletedDrillIds(completedDrills || []);

      const featured =
        allChallenges.find((c) => c.is_featured) ||
        allChallenges.find((c) => c.trainer_id);

      if (featured) {
        setFeaturedChallenge(featured);
      }

      const [challengeCounts, drillCounts] = await Promise.all([
        ChallengeProgress.getCompletionCounts(
          (allChallenges || []).map((c) => c.id)
        ).catch(() => ({})),
        DrillProgress.getCompletionCounts(
          (allDrills || []).map((d) => d.id)
        ).catch(() => ({})),
      ]);
      setChallengeCompletionCounts(challengeCounts || {});
      setDrillCompletionCounts(drillCounts || {});
    } catch (error) {
      console.error("Error loading challenges and trainers:", error);
    }
    setIsLoading(false);
  };

  const getCategories = () => {
    return [
      ...new Set(
        [
          ...challenges.map((challenge) => challenge.category),
          ...drills.map((drill) => drill.category),
        ].filter(Boolean)
      ),
    ].sort();
  };

  const filteredChallenges = challenges.filter((challenge) => {
    const categoryMatch =
      selectedCategory === "all" || challenge.category === selectedCategory;
    const difficultyMatch =
      selectedDifficulty === "all" ||
      challenge.difficulty === selectedDifficulty;
    return (
      categoryMatch &&
      difficultyMatch &&
      matchesSearchQuery(challenge, searchQuery)
    );
  });

  const filteredDrills = drills.filter((drill) => {
    const categoryMatch =
      selectedCategory === "all" || drill.category === selectedCategory;
    const difficultyMatch =
      selectedDifficulty === "all" ||
      drill.difficulty === selectedDifficulty;
    return (
      categoryMatch && difficultyMatch && matchesSearchQuery(drill, searchQuery)
    );
  });

  const gridChallenges = [];
  const featuredInResults =
    featuredChallenge &&
    filteredChallenges.some((c) => c.id === featuredChallenge.id);
  if (featuredInResults) {
    gridChallenges.push({ ...featuredChallenge, isFeatured: true });
  }
  filteredChallenges
    .filter((c) => !featuredInResults || c.id !== featuredChallenge.id)
    .forEach((c) => gridChallenges.push({ ...c, isFeatured: false }));

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "shooting":
        return "🎯";
      case "dribbling":
        return "⚡";
      case "defense":
        return "🛡️";
      case "conditioning":
        return "💪";
      case "footwork":
        return "👟";
      default:
        return "🏀";
    }
  };

  const isChallengeCompleted = (challengeId) => {
    return completedChallenges.includes(challengeId);
  };

  const openScheduleDialog = (workout, sourceType = "auto") => {
    const kind =
      sourceType === "drill" || sourceType === "challenge"
        ? sourceType
        : isDrillLike(workout)
          ? "drill"
          : "challenge";
    setScheduleSourceType(kind);
    setScheduleWorkout(workout);
    setScheduleForm({
      event_date: formatDateForInput(),
      start_time: "",
      location: "",
      notes: "",
    });
  };

  const handleAddWorkoutToSchedule = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      toast.error("Please sign in before adding workouts to your schedule.");
      return;
    }
    if (!scheduleWorkout || !scheduleForm.event_date) {
      toast.error("Pick a date for this workout.");
      return;
    }

    setIsScheduling(true);
    try {
      const isDrill = scheduleSourceType === "drill";
      const payload = {
        athlete_id: user.id,
        title: scheduleWorkout.title,
        event_type: "workout",
        event_date: scheduleForm.event_date,
        start_time: scheduleForm.start_time || null,
        location: scheduleForm.location.trim() || null,
        notes: buildWorkoutScheduleNotes(scheduleWorkout, scheduleForm.notes),
        drill_id: isDrill ? scheduleWorkout.id : null,
        challenge_id: isDrill ? null : scheduleWorkout.id,
      };

      let { error } = await supabase.from("athlete_events").insert(payload);

      // Fallback if migration columns are not applied yet
      if (
        error &&
        (error.message?.includes("drill_id") ||
          error.message?.includes("challenge_id") ||
          error.code === "PGRST204")
      ) {
        const { drill_id, challenge_id, ...legacyPayload } = payload;
        ({ error } = await supabase
          .from("athlete_events")
          .insert(legacyPayload));
      }

      if (error) throw error;

      toast.success(`${scheduleWorkout.title} added to your schedule.`);
      setScheduleWorkout(null);
    } catch (error) {
      console.error("Error adding workout to schedule:", error);
      toast.error(error.message || "Could not add workout to schedule.");
    } finally {
      setIsScheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 bg-gray-200 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              Workout Library
            </h1>
          </div>
          <p className="text-xl text-brand-lightGray max-w-2xl mx-auto">
            Search drills and workouts by name or category — all in one place
          </p>
          {FEATURE_FLAGS.AI_WORKOUT_BUILDER && (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Button
                onClick={() => navigate("/ai-workout-builder")}
                variant="outline"
                className="border-orange-500 text-orange-400 hover:bg-orange-500/10 font-semibold"
              >
                <Zap className="w-4 h-4 mr-2" />
                Build My Workout
              </Button>
            </div>
          )}
        </div>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search drills, workouts, categories, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>


        {/* Featured trackers */}
        <div
          className={`grid grid-cols-1 gap-6 ${
            FEATURE_FLAGS.LIVE_SHOOTING_SESSION_TRACKER
              ? "md:grid-cols-2"
              : "md:grid-cols-1 md:max-w-xl md:mx-auto"
          }`}
        >
          {FEATURE_FLAGS.LIVE_SHOOTING_SESSION_TRACKER && (
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 sm:p-8 text-white text-center shadow-xl">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4">
                <Crosshair className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-bold leading-tight">
                  Live Shooting Session
                </h2>
              </div>
              <p className="text-orange-100 mb-6 max-w-md mx-auto text-sm sm:text-base">
                Track your makes and misses in real-time with our interactive
                court tracker
              </p>
              <Link
                to={createPageUrl("ShootingSession")}
                className="inline-block w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-auto min-h-10 whitespace-normal bg-white text-orange-600 hover:bg-gray-100 font-semibold px-6 sm:px-8 py-3"
                >
                  <Target className="w-5 h-5 mr-2 shrink-0" />
                  Start Shooting Session
                </Button>
              </Link>
            </div>
          )}

          <div className="bg-gradient-to-r from-sky-500 to-blue-700 rounded-2xl p-6 sm:p-8 text-white text-center shadow-xl">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4">
              <Footprints className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-bold leading-tight flex flex-wrap items-center justify-center gap-2">
                Go for a Run
                <BetaBadge className="bg-white/20 text-white border-white/30" />
              </h2>
            </div>
            <p className="text-sky-100 mb-6 max-w-md mx-auto text-sm sm:text-base">
              Track your pace and distance live with GPS — like a run club
              session
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/run-tracker")}
              className="w-full sm:w-auto h-auto min-h-10 whitespace-normal bg-white text-blue-700 hover:bg-gray-100 font-semibold px-6 sm:px-8 py-3"
            >
              <Play className="w-5 h-5 mr-2 shrink-0" />
              Start Run
            </Button>
          </div>
        </div>

        {/* Parent-Assigned Workouts - For Athletes Only */}
        {isAthlete() && parentAssignments.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-400" />
              Assigned by Parent
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parentAssignments
                .filter((a) => a.status !== "completed")
                .slice(0, 3)
                .map((assignment) => (
                  <Card
                    key={assignment.id}
                    className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white overflow-hidden hover:shadow-xl transition-all cursor-pointer"
                    onClick={() =>
                      navigate(`/workout-session/${assignment.id}`)
                    }
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className="bg-white/20 text-white">
                          {assignment.status === "in_progress"
                            ? "In Progress"
                            : "New"}
                        </Badge>
                        <Badge className="bg-white/20 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          {assignment.challenge?.duration_minutes} min
                        </Badge>
                      </div>
                      <h3 className="font-bold text-xl mb-2 break-words leading-snug">
                        {assignment.challenge?.title}
                      </h3>
                      <p className="text-purple-100 text-sm mb-4 line-clamp-2 break-words">
                        {assignment.challenge?.description}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-purple-200 min-w-0 break-words">
                          From {assignment.parent?.full_name}
                        </span>
                        <Button
                          size="sm"
                          className="bg-white text-purple-600 hover:bg-purple-50 h-auto min-h-8 whitespace-normal shrink-0"
                        >
                          {assignment.status === "in_progress" ? (
                            <>Continue</>
                          ) : (
                            <>
                              Start <ArrowRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
            {parentAssignments.filter((a) => a.status !== "completed").length >
              3 && (
              <p className="text-center text-gray-400">
                +
                {parentAssignments.filter((a) => a.status !== "completed")
                  .length - 3}{" "}
                more assigned workouts
              </p>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Category:</span>
            </div>
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              size="sm"
              className={`h-auto min-h-8 whitespace-normal ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                  : ""
              }`}
            >
              All
            </Button>
            {getCategories().map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                className={`h-auto min-h-8 whitespace-normal capitalize ${
                  selectedCategory === category
                    ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                    : ""
                }`}
              >
                <span className="mr-1">{getCategoryIcon(category)}</span>
                {category}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-sm font-medium text-white shrink-0">
              Difficulty:
            </span>
            {["all", "beginner", "intermediate", "advanced"].map(
              (difficulty) => (
                <Button
                  key={difficulty}
                  variant={
                    selectedDifficulty === difficulty ? "default" : "outline"
                  }
                  onClick={() => setSelectedDifficulty(difficulty)}
                  size="sm"
                  className={`h-auto min-h-8 whitespace-normal capitalize ${
                    selectedDifficulty === difficulty
                      ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                      : ""
                  }`}
                >
                  {difficulty}
                </Button>
              )
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Showing {gridChallenges.length} workout
          {gridChallenges.length !== 1 ? "s" : ""}
          {drills.length > 0 &&
            ` · ${filteredDrills.length} drill${
              filteredDrills.length !== 1 ? "s" : ""
            }`}
          {(searchQuery ||
            selectedCategory !== "all" ||
            selectedDifficulty !== "all") &&
            " matching your filters"}
        </p>

        {/* Workouts Grid */}
        {gridChallenges.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Workouts
            </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gridChallenges.map((challenge) => {
            const thumbnailUrl = getWorkoutThumbnail(challenge);

            return (
            <Card
              key={challenge.id}
              className={`group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden relative ${
                challenge.isFeatured
                  ? "ring-2 ring-yellow-400/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/10"
                  : "bg-card"
              }`}
            >
              {challenge.isFeatured && (
                <Badge className="absolute top-3 right-3 z-10 bg-yellow-500/90 text-white text-[10px] uppercase font-semibold border-0 shadow-sm">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Trainer Pick
                </Badge>
              )}

              <div
                className="relative w-full aspect-video bg-black/40 cursor-pointer overflow-hidden"
                onClick={() => navigate(`/workouts/${challenge.id}`)}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={`${challenge.title} video thumbnail`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-800 to-gray-900">
                    <span className="text-4xl">
                      {getCategoryIcon(challenge.category)}
                    </span>
                    <span className="text-xs text-gray-400">No video yet</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/55 border border-white/30 flex items-center justify-center backdrop-blur-sm group-hover:bg-brand-orange/90 transition-colors">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              <CardHeader className="pb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl shrink-0">
                    {getCategoryIcon(challenge.category)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors break-words leading-snug">
                      {challenge.title}
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-2 break-words">
                      {challenge.description}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      className={`${getDifficultyColor(challenge.difficulty)} capitalize shrink-0`}
                    >
                      {challenge.difficulty}
                    </Badge>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-4 h-4 shrink-0" />
                        {challenge.duration_minutes || 20}min
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Star className="w-4 h-4 shrink-0" />+
                        {challenge.xp_reward}XP
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        <Users className="w-4 h-4 shrink-0" />
                        {challengeCompletionCounts[challenge.id] ?? 0}{" "}
                        completed
                      </span>
                    </div>
                  </div>

                  {challenge.equipment_needed &&
                    challenge.equipment_needed.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-white mb-2">
                          Equipment needed:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {challenge.equipment_needed.map(
                            (equipment, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs max-w-full whitespace-normal break-words h-auto py-1"
                              >
                                {equipment}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      className="w-full h-auto min-h-9 whitespace-normal bg-brand-orange hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={() => navigate(`/workouts/${challenge.id}`)}
                    >
                      {isChallengeCompleted(challenge.id) ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2 shrink-0" />
                          Start Workout
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-auto min-h-9 whitespace-normal border-brand-orange/60 text-brand-orange hover:bg-brand-orange/10 shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={() => openScheduleDialog(challenge, "challenge")}
                    >
                      <CalendarPlus className="w-4 h-4 mr-2 shrink-0" />
                      Add to Schedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
          </div>
        )}

        {/* Drills Grid (formerly Drill Library) */}
        {filteredDrills.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-brand-orange" />
              Drills
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDrills.map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  isCompleted={completedDrillIds.includes(drill.id)}
                  completionCount={drillCompletionCounts[drill.id] ?? 0}
                  onAddToSchedule={(item) => openScheduleDialog(item, "drill")}
                />
              ))}
            </div>
          </div>
        )}

        {gridChallenges.length === 0 && filteredDrills.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Workouts or Drills Found
            </h3>
            <p className="text-gray-400 mb-6">
              Try a different search or adjust your category and difficulty
              filters
            </p>
            <Button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedDifficulty("all");
                setSearchQuery("");
              }}
              className="bg-gradient-to-r from-yellow-500 to-orange-600"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      <Dialog
        open={!!scheduleWorkout}
        onOpenChange={(open) => !open && setScheduleWorkout(null)}
      >
        <DialogContent className="bg-brand-black border-brand-gray/30 text-brand-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-white">
              Add Workout to Schedule
            </DialogTitle>
          </DialogHeader>
          {scheduleWorkout && (
            <form onSubmit={handleAddWorkoutToSchedule} className="space-y-4">
              <div className="rounded-lg border border-brand-gray/30 bg-brand-charcoal p-3">
                <p className="font-semibold text-brand-white">
                  {scheduleWorkout.title}
                </p>
                <p className="text-sm text-brand-lightGray line-clamp-2 mt-1">
                  {scheduleWorkout.description}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className={getDifficultyColor(scheduleWorkout.difficulty)}>
                    {scheduleWorkout.difficulty}
                  </Badge>
                  <span className="text-xs text-brand-lightGray">
                    {scheduleWorkout.duration_minutes || 20} min
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workout-date" className="text-brand-lightGray">
                    Date *
                  </Label>
                  <Input
                    id="workout-date"
                    type="date"
                    value={scheduleForm.event_date}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        event_date: e.target.value,
                      }))
                    }
                    className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workout-time" className="text-brand-lightGray">
                    Time
                  </Label>
                  <Input
                    id="workout-time"
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        start_time: e.target.value,
                      }))
                    }
                    className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workout-location" className="text-brand-lightGray">
                  Location
                </Label>
                <Input
                  id="workout-location"
                  value={scheduleForm.location}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Gym, driveway, park..."
                  className="bg-brand-charcoal border-brand-gray/30 text-brand-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workout-notes" className="text-brand-lightGray">
                  Extra Notes
                </Label>
                <Textarea
                  id="workout-notes"
                  value={scheduleForm.notes}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Optional reminders for this workout"
                  rows={3}
                  className="bg-brand-charcoal border-brand-gray/30 text-brand-white resize-none"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScheduleWorkout(null)}
                  className="border-brand-gray/30 text-brand-lightGray hover:bg-brand-charcoal"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isScheduling}
                  className="bg-brand-orange hover:opacity-90 text-white"
                >
                  {isScheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Add Workout
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
