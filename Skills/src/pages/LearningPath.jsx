import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lesson } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle, ArrowLeft, Trophy } from "lucide-react";

export default function LearningPath() {
  const { chapter } = useParams();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChapterLessons();
    loadCompletedLessons();
  }, [chapter]);

  // Reload completed lessons when component becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCompletedLessons();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    globalThis.addEventListener("focus", loadCompletedLessons);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      globalThis.removeEventListener("focus", loadCompletedLessons);
    };
  }, [chapter]);

  const loadChapterLessons = async () => {
    try {
      const allLessons = await Lesson.list();
      const chapterLessons = allLessons
        .filter((lesson) => lesson.mode === "iq" && lesson.chapter === chapter)
        .sort((a, b) => a.level - b.level);
      setLessons(chapterLessons);
    } catch (error) {
      console.error("Error loading lessons:", error);
    }
    setIsLoading(false);
  };

  const loadCompletedLessons = () => {
    // Load from localStorage
    const stored = localStorage.getItem(`completed_lessons_${chapter}`);
    if (stored) {
      setCompletedLessons(JSON.parse(stored));
    }
  };

  const isLessonUnlocked = (index) => {
    if (index === 0) return true; // First lesson is always unlocked
    return completedLessons.includes(lessons[index - 1]?.id);
  };

  const isLessonCompleted = (lessonId) => {
    return completedLessons.includes(lessonId);
  };

  const getCurrentProgressIndex = () => {
    // Find the index of the furthest completed lesson or current unlocked lesson
    for (let i = lessons.length - 1; i >= 0; i--) {
      if (isLessonCompleted(lessons[i].id)) {
        return i;
      }
    }
    return -1; // No lessons completed yet, so progress is before first lesson
  };

  const getPathPosition = (index) => {
    // Create zigzag pattern: start left of center, then alternate right/left
    // Lesson 0: left (-120px)
    // Lesson 1: right (+120px)
    // Lesson 2: left (-120px)
    // Lesson 3: right (+120px)
    // etc.

    // Start left, then alternate
    return { x: index % 2 === 0 ? -120 : 120 };
  };

  const handleLessonClick = (lesson, index) => {
    if (isLessonUnlocked(index)) {
      // Navigate to lesson detail page
      navigate(`/lesson/${lesson.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/images/chapter-lessons-bg.png)" }}
      />

      {/* Content */}
      <div className="relative z-10 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/IQMode")}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Chapters
          </Button>
          <h1 className="text-3xl font-bold text-white">{chapter}</h1>
        </div>

        {/* Learning Path */}
        <div className="relative py-12">
          {lessons.map((lesson, index) => {
            const unlocked = isLessonUnlocked(index);
            const completed = isLessonCompleted(lesson.id);
            const position = getPathPosition(index);
            const isStart = index === 0;
            const progressIndex = getCurrentProgressIndex();

            // Calculate connection to next lesson
            const hasNextLesson = index < lessons.length - 1;
            const nextPosition = hasNextLesson
              ? getPathPosition(index + 1)
              : null;
            const hasProgressLine = index <= progressIndex;

            return (
              <div
                key={lesson.id}
                className="relative flex items-center justify-center"
                style={{
                  transform: `translateX(${position.x}px)`,
                  height: "220px",
                }}
              >
                {/* Connection line to next lesson */}
                {hasNextLesson &&
                  (() => {
                    const horizontalDiff = nextPosition.x - position.x;
                    const absWidth = Math.abs(horizontalDiff);
                    const buttonRadius = 56; // Half of 112px (w-28) button width

                    // Distance from bottom of first icon to top of second icon
                    // Center to center is 220px, minus radius from each end
                    const verticalDistance = 220 - 2 * buttonRadius; // 220 - 112 = 108px
                    const halfVertical = verticalDistance / 2;

                    // Create S-curve:
                    // 1. Start at bottom of current icon
                    // 2. Go straight down to halfway point
                    // 3. Travel horizontally to above next icon
                    // 4. Curve down and enter from top

                    // Control points for smooth S-curve:
                    // CP1: Straight down from start, no horizontal movement yet
                    const controlPoint1X = 0;
                    const controlPoint1Y = halfVertical + 50;

                    // CP2: At horizontal position above next icon, starting to curve down
                    const controlPoint2X = horizontalDiff;
                    const controlPoint2Y = halfVertical - 50;

                    // End point: Top of next icon
                    const endX = horizontalDiff;
                    const endY = verticalDistance;

                    return (
                      <svg
                        className="absolute pointer-events-none overflow-visible"
                        style={{
                          left: "50%",
                          top: `${110 + buttonRadius}px`, // Start from bottom of button
                          width: `${absWidth}px`,
                          height: `${verticalDistance}px`,
                          zIndex: 0,
                        }}
                      >
                        <path
                          d={`M 0 0 
                            C ${controlPoint1X} ${controlPoint1Y}, 
                              ${controlPoint2X} ${controlPoint2Y}, 
                              ${endX} ${endY}`}
                          fill="none"
                          stroke={hasProgressLine ? "#3b82f6" : "#d1d5db"}
                          strokeWidth="15"
                          strokeLinecap="round"
                        />
                      </svg>
                    );
                  })()}

                {/* START label for first lesson */}
                {isStart && (
                  <>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10">
                      <div className="bg-blue-500 text-white px-6 py-2 rounded-t-xl font-bold text-sm shadow-lg">
                        START
                      </div>
                    </div>
                    {/* Connection line from START to first lesson */}
                    <svg
                      className="absolute pointer-events-none overflow-visible"
                      style={{
                        left: "50%",
                        top: "-10px", // Start from bottom of START box
                        width: "8px",
                        height: "75px", // Height to reach the lesson icon
                        zIndex: 0,
                      }}
                    >
                      <path
                        d="M 0 0 L 0 65"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="15"
                        strokeLinecap="round"
                      />
                    </svg>
                  </>
                )}

                {/* Lesson node */}
                <div className="relative flex items-center justify-center z-20">
                  <button
                    type="button"
                    onClick={() => handleLessonClick(lesson, index)}
                    disabled={!unlocked}
                    className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl border-8 transition-all duration-300 ${
                      completed
                        ? "bg-blue-400 border-blue-500 hover:scale-110"
                        : unlocked
                        ? "bg-gradient-to-br from-yellow-400 to-orange-500 border-blue-500 animate-scale-pulse hover:scale-110 cursor-pointer"
                        : "bg-gray-600 border-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {completed ? (
                      <CheckCircle className="w-14 h-14 text-white" />
                    ) : unlocked ? (
                      <img
                        src="/images/active-lesson-icon.png"
                        alt="Active Lesson"
                        className="w-25 h-25 object-contain"
                      />
                    ) : (
                      <Lock className="w-14 h-14 text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Completion trophy */}
          {lessons.length > 0 && completedLessons.length === lessons.length && (
            <div className="relative flex justify-center mt-16">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-2xl animate-bounce">
                <Trophy className="w-16 h-16 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        <div className="fixed bottom-6 right-6 bg-white rounded-full px-6 py-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-gray-900">
              {completedLessons.length}/{lessons.length} Complete
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
