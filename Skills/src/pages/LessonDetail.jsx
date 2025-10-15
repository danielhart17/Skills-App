import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lesson } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Star, CheckCircle, Play, Brain } from "lucide-react";

export default function LessonDetail() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      const lessonData = await Lesson.get(lessonId);
      setLesson(lessonData);

      // Check if lesson is already completed
      const stored = localStorage.getItem(
        `completed_lessons_${lessonData.chapter}`
      );
      if (stored) {
        const completedLessons = JSON.parse(stored);
        if (completedLessons.includes(lessonId)) {
          setIsCompleted(true);
        }
      }
    } catch (error) {
      console.error("Error loading lesson:", error);
    }
    setIsLoading(false);
  };

  const handleStartLesson = () => {
    // TODO: Navigate to actual lesson content/quiz
    console.log("Starting lesson:", lessonId);

    // Mark as completed and save to localStorage
    if (lesson && !isCompleted) {
      const storageKey = `completed_lessons_${lesson.chapter}`;
      const stored = localStorage.getItem(storageKey);
      const completedLessons = stored ? JSON.parse(stored) : [];

      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId);
        localStorage.setItem(storageKey, JSON.stringify(completedLessons));
      }

      setIsCompleted(true);

      // Go back after a short delay
      setTimeout(() => {
        navigate(-1);
      }, 1500);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-700 border-green-300";
      case "intermediate":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "advanced":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-charcoal">
        <div className="text-2xl text-white">Loading lesson...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-charcoal">
        <div className="text-center">
          <p className="text-xl text-white mb-4">Lesson not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-charcoal py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-white hover:bg-brand-gray"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Learning Path
          </Button>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-2xl border-0 overflow-hidden bg-card">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Brain className="w-6 h-6" />
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${getDifficultyColor(
                      lesson.difficulty
                    )} border`}
                  >
                    {lesson.difficulty}
                  </Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                  {lesson.title}
                </h1>
                <p className="text-lg text-blue-100">{lesson.chapter}</p>
              </div>
              {isCompleted && (
                <div className="ml-4">
                  <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">
                  {lesson.estimated_time} minutes
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                <Star className="w-5 h-5 text-yellow-300" />
                <span className="font-semibold">+{lesson.xp_reward} XP</span>
              </div>
            </div>
          </div>

          <CardContent className="p-8">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
              <div className="prose prose-lg max-w-none">
                <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                  {lesson.description}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center pt-6">
              {isCompleted ? (
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg"
                  disabled
                >
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Lesson Completed!
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-xl"
                  onClick={handleStartLesson}
                >
                  <Play className="w-6 h-6 mr-2" />
                  Start Lesson
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                What You'll Learn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Key concepts and strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Practical applications</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Real game situations</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Lesson Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Mode:</span>
                  <span className="font-semibold text-white">
                    {lesson.mode === "iq" ? "Basketball IQ" : "On-Court"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Level:</span>
                  <span className="font-semibold text-white">
                    {lesson.level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chapter:</span>
                  <span className="font-semibold text-white">
                    {lesson.chapter}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
