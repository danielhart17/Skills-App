import { useState, useEffect } from "react";
import { Drill, DrillProgress } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "@/components/ui/use-toast";
import {
  CalendarPlus,
  Clock,
  Search,
  Filter,
  ChevronUp,
  CheckCircle,
  Play,
  Dumbbell,
  Loader2,
} from "lucide-react";

const CAT_ICONS = {
  shooting: "🎯",
  dribbling: "⚡",
  footwork: "👟",
  conditioning: "💪",
  defense: "🛡️",
  passing: "🏀",
  other: "🏀",
};

const CATEGORIES = ["all", "shooting", "dribbling", "footwork", "conditioning", "defense", "passing"];
const DIFFICULTIES = ["all", "beginner", "intermediate", "advanced"];

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([^&?\s]+)/);
  return match ? match[1] : null;
}

function getDifficultyColor(difficulty) {
  switch (difficulty) {
    case "beginner": return "bg-green-100 text-green-800 border-green-200";
    case "intermediate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "advanced": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatDateForInput(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function buildWorkoutNotes(drill, extraNotes) {
  return [
    drill.description,
    drill.duration_minutes ? `Duration: ${drill.duration_minutes} minutes` : null,
    drill.category ? `Category: ${drill.category}` : null,
    drill.difficulty ? `Difficulty: ${drill.difficulty}` : null,
    drill.equipment_needed?.length
      ? `Equipment: ${drill.equipment_needed.join(", ")}`
      : null,
    drill.setup ? `Setup:\n${drill.setup}` : null,
    drill.steps?.length
      ? `Steps:\n${drill.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`
      : null,
    drill.focus ? `Focus:\n${drill.focus}` : null,
    extraNotes?.trim() ? `Notes:\n${extraNotes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function DrillCard({ drill, isCompleted, onAddToSchedule }) {
  const [expanded, setExpanded] = useState(false);
  const ytId = getYouTubeId(drill.youtube_url);

  return (
    <Card className="border-0 shadow-lg bg-card overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{CAT_ICONS[drill.category] || "🏀"}</span>
              <div>
                <h3 className="font-bold text-white text-base group-hover:text-yellow-400 transition-colors leading-tight">
                  {drill.title}
                </h3>
                <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{drill.description}</p>
              </div>
            </div>
            {isCompleted && (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className={getDifficultyColor(drill.difficulty)}>
                {drill.difficulty}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {drill.duration_minutes}min
              </span>
            </div>
            {drill.equipment_needed?.length > 0 && (
              <span className="text-xs text-gray-500">
                {drill.equipment_needed.slice(0, 2).join(", ")}
                {drill.equipment_needed.length > 2 && ` +${drill.equipment_needed.length - 2}`}
              </span>
            )}
          </div>
        </div>

        {drill.tags?.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {drill.tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              className="w-full bg-brand-orange hover:opacity-90 text-white"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <><ChevronUp className="w-4 h-4 mr-2" />Hide Details</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />{isCompleted ? "Review Drill" : "View Drill"}</>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full border-brand-orange/50 text-brand-orange hover:bg-brand-orange/10"
              onClick={() => onAddToSchedule(drill)}
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Add to Schedule
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-800 p-5 space-y-5">
            {ytId && (
              <div className="relative w-full rounded-xl overflow-hidden border border-gray-700"
                style={{ paddingBottom: "56.25%", height: 0 }}>
                <iframe
                  src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                  className="absolute top-0 left-0 w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                  loading="lazy"
                  title={drill.title}
                />
              </div>
            )}
            {drill.setup && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">Setup</p>
                <p className="text-sm text-gray-300 leading-relaxed">{drill.setup}</p>
              </div>
            )}
            {drill.steps?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-3">
                  Step-by-Step Instructions
                </p>
                <div className="space-y-2">
                  {drill.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-5 h-5 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {drill.equipment_needed?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
                  Equipment Needed
                </p>
                <div className="flex flex-wrap gap-2">
                  {drill.equipment_needed.map((item, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
            {drill.focus && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
                  Key Focus Areas
                </p>
                <p className="text-sm text-gray-300">{drill.focus}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkoutLibrary() {
  const { user } = useAuth();
  const [drills, setDrills] = useState([]);
  const [completedDrillIds, setCompletedDrillIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleDrill, setScheduleDrill] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    event_date: formatDateForInput(),
    start_time: "",
    location: "",
    notes: "",
  });
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allDrills, completedIds] = await Promise.all([
        Drill.list(),
        DrillProgress.getCompletedDrills(),
      ]);
      setDrills(allDrills);
      setCompletedDrillIds(completedIds);
    } catch (error) {
      console.error("Error loading drills:", error);
    }
    setIsLoading(false);
  };

  const filteredDrills = drills.filter((drill) => {
    const categoryMatch = selectedCategory === "all" || drill.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === "all" || drill.difficulty === selectedDifficulty;
    const searchMatch =
      !searchQuery ||
      drill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drill.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drill.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      drill.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && difficultyMatch && searchMatch;
  });

  const openScheduleDialog = (drill) => {
    setScheduleDrill(drill);
    setScheduleForm({
      event_date: formatDateForInput(),
      start_time: "",
      location: "",
      notes: "",
    });
  };

  const handleScheduleWorkout = async (event) => {
    event.preventDefault();
    if (!user?.id) {
      toast({
        title: "Sign in required",
        description: "Please sign in before adding workouts to your schedule.",
        variant: "destructive",
      });
      return;
    }
    if (!scheduleDrill || !scheduleForm.event_date) {
      toast({
        title: "Choose a date",
        description: "Pick the day you want to do this workout.",
        variant: "destructive",
      });
      return;
    }

    setIsScheduling(true);
    try {
      const { error } = await supabase.from("athlete_events").insert({
        athlete_id: user.id,
        title: scheduleDrill.title,
        event_type: "workout",
        event_date: scheduleForm.event_date,
        start_time: scheduleForm.start_time || null,
        location: scheduleForm.location.trim() || null,
        notes: buildWorkoutNotes(scheduleDrill, scheduleForm.notes),
      });

      if (error) throw error;

      toast({
        title: "Workout added",
        description: `${scheduleDrill.title} was added to your schedule.`,
      });
      setScheduleDrill(null);
    } catch (error) {
      console.error("Error adding workout to schedule:", error);
      toast({
        title: "Could not add workout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="h-8 bg-gray-700 rounded animate-pulse w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Drill Library</h1>
          </div>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {drills.length} elite drills · Step-by-step instructions · Video demos
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>✅ {completedDrillIds.length} completed</span>
            <span>📋 {drills.length - completedDrillIds.length} remaining</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search drills, categories, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 mr-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Category:</span>
            </div>
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? "bg-gradient-to-r from-yellow-500 to-orange-600" : ""}
              >
                {cat !== "all" && <span className="mr-1">{CAT_ICONS[cat]}</span>}
                {cat}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">Difficulty:</span>
            {DIFFICULTIES.map((diff) => (
              <Button
                key={diff}
                variant={selectedDifficulty === diff ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDifficulty(diff)}
                className={selectedDifficulty === diff ? "bg-gradient-to-r from-yellow-500 to-orange-600" : ""}
              >
                {diff}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Showing {filteredDrills.length} of {drills.length} drills
        </p>

        {filteredDrills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDrills.map((drill) => (
              <DrillCard
                key={drill.id}
                drill={drill}
                isCompleted={completedDrillIds.includes(drill.id)}
                onAddToSchedule={openScheduleDialog}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No drills found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
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

      <Dialog open={!!scheduleDrill} onOpenChange={(open) => !open && setScheduleDrill(null)}>
        <DialogContent className="bg-brand-black border-brand-gray/30 text-brand-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-white">
              Add Workout to Schedule
            </DialogTitle>
          </DialogHeader>
          {scheduleDrill && (
            <form onSubmit={handleScheduleWorkout} className="space-y-4">
              <div className="rounded-lg border border-brand-gray/30 bg-brand-charcoal p-3">
                <p className="font-semibold text-brand-white">{scheduleDrill.title}</p>
                <p className="text-sm text-brand-lightGray line-clamp-2 mt-1">
                  {scheduleDrill.description}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className={getDifficultyColor(scheduleDrill.difficulty)}>
                    {scheduleDrill.difficulty}
                  </Badge>
                  <span className="text-xs text-brand-lightGray">
                    {scheduleDrill.duration_minutes} min
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
                  onClick={() => setScheduleDrill(null)}
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