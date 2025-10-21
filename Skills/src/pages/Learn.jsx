import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Chapter, Lesson, UserProgress } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  CheckCircle,
  Star,
  Book,
  ChevronRight,
  Trophy,
  Dumbbell,
} from "lucide-react";

export default function Learn() {
  const navigate = useNavigate();
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState("iq"); // "iq" or "oncourt"

  useEffect(() => {
    const loadData = async () => {
      await loadChapters();
      await loadLessons();
      await loadCompletedLessons();
    };
    loadData();
  }, [mode]); // Reload when mode changes

  const loadChapters = async () => {
    try {
      const allChapters = await Chapter.filter({ mode });
      setChapters(allChapters);
    } catch (error) {
      console.error("Error loading chapters:", error);
    }
  };

  const loadLessons = async () => {
    try {
      const allLessons = await Lesson.list();
      setLessons(allLessons);
    } catch (error) {
      console.error("Error loading lessons:", error);
    }
  };

  const loadCompletedLessons = async () => {
    try {
      const completedLessonIds = await UserProgress.getCompletedLessons();
      setCompletedLessons(completedLessonIds);
    } catch (error) {
      console.error("Error loading completed lessons:", error);
      // Fallback to localStorage if Supabase fails
      const stored = localStorage.getItem("completedLessons");
      if (stored) {
        setCompletedLessons(JSON.parse(stored));
      }
    }
    setIsLoading(false);
  };

  const getChapterStats = (chapterTitle) => {
    // Match lessons by chapter name (the 'chapter' field in lessons table)
    const chapterLessons = lessons.filter((l) => l.chapter === chapterTitle);
    const completed = chapterLessons.filter((lesson) =>
      completedLessons.includes(lesson.id)
    ).length;

    return {
      total: chapterLessons.length,
      completed: completed,
      totalXP: chapterLessons.reduce((sum, l) => sum + (l.xp_reward || 0), 0),
    };
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
                className="h-48 bg-gray-200 rounded-xl animate-pulse"
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
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                mode === "iq"
                  ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                  : "bg-gradient-to-br from-orange-500 to-red-600"
              }`}
            >
              {mode === "iq" ? (
                <Brain className="w-6 h-6 text-white" />
              ) : (
                <Dumbbell className="w-6 h-6 text-white" />
              )}
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">Learn</h1>
          </div>
          <p className="text-xl text-brand-lightGray max-w-2xl mx-auto">
            {mode === "iq"
              ? "Master the mental game with strategic knowledge, rules, and basketball theory"
              : "Develop fundamental skills and on-court techniques through structured training"}
          </p>

          {/* Mode Toggle */}
          <div className="flex justify-center pt-4">
            <Tabs value={mode} onValueChange={setMode} className="w-[400px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="iq" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  IQ Mode
                </TabsTrigger>
                <TabsTrigger
                  value="oncourt"
                  className="flex items-center gap-2"
                >
                  <Dumbbell className="w-4 h-4" />
                  On Court
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Chapter Cards */}
        {chapters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chapters.map((chapter) => {
              const stats = getChapterStats(chapter.title);
              const progress =
                stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

              return (
                <Card
                  key={chapter.id}
                  className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-card overflow-hidden cursor-pointer"
                  onClick={() =>
                    navigate(
                      `/LearningPath/${encodeURIComponent(chapter.title)}`
                    )
                  }
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-md ${
                            mode === "iq"
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                              : "bg-gradient-to-br from-orange-500 to-red-600"
                          }`}
                        >
                          <Book className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle
                            className={`text-lg font-bold text-white mb-1 transition-colors ${
                              mode === "iq"
                                ? "group-hover:text-blue-400"
                                : "group-hover:text-orange-400"
                            }`}
                          >
                            {chapter.title}
                          </CardTitle>
                          <p className="text-sm text-gray-400">
                            {stats.total}{" "}
                            {stats.total === 1 ? "lesson" : "lessons"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-6 h-6 text-gray-600 group-hover:translate-x-1 transition-all ${
                          mode === "iq"
                            ? "group-hover:text-blue-400"
                            : "group-hover:text-orange-400"
                        }`}
                      />
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400 font-medium">
                          {stats.completed}/{stats.total} completed
                        </span>
                        {progress === 100 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-semibold">Complete</span>
                          </div>
                        )}
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <span className="text-sm font-semibold text-white">
                          {stats.totalXP} XP
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {stats.completed === 0 ? (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700"
                          >
                            Start
                          </Badge>
                        ) : stats.completed === stats.total ? (
                          <Badge className="bg-green-500 text-white">
                            <Trophy className="w-3 h-3 mr-1" />
                            Mastered
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-orange-100 text-orange-700"
                          >
                            Continue
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                mode === "iq" ? "bg-blue-100" : "bg-orange-100"
              }`}
            >
              {mode === "iq" ? (
                <Brain className="w-12 h-12 text-blue-500" />
              ) : (
                <Dumbbell className="w-12 h-12 text-orange-500" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No {mode === "iq" ? "IQ Mode" : "On Court"} Chapters Yet
            </h3>
            <p className="text-brand-lightGray">
              {mode === "iq"
                ? "Basketball theory lessons are coming soon!"
                : "On-court training lessons are coming soon!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
