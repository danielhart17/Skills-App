import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Question,
  Lesson,
  UserLessonAttempt,
  UserQuestionProgress,
  UserProgress,
} from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  RotateCcw,
} from "lucide-react";

export default function QuestionPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLessonAndQuestions();
  }, [lessonId]);

  const loadLessonAndQuestions = async () => {
    try {
      const [lessonData, questionsData] = await Promise.all([
        Lesson.get(lessonId),
        Question.filter({ lesson_id: lessonId }),
      ]);

      setLesson(lessonData);
      setQuestions(questionsData);

      // Load existing user progress for this lesson
      try {
        const existingProgress = await UserQuestionProgress.filter({
          lesson_id: lessonId,
        });
        if (existingProgress && existingProgress.length > 0) {
          // If user has already answered questions, we could show their previous answers
          // For now, we'll just log it - you might want to handle this differently
          console.log(
            "User has existing progress for this lesson:",
            existingProgress
          );
        }
      } catch (progressError) {
        console.log(
          "No existing progress found or error loading progress:",
          progressError
        );
      }
    } catch (error) {
      console.error("Error loading lesson and questions:", error);
    }
    setIsLoading(false);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answer) => {
    if (hasAnswered) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || hasAnswered) return;

    setHasAnswered(true);
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    // Save answer
    const answerRecord = {
      question_id: currentQuestion.id,
      answer: selectedAnswer,
      is_correct: isCorrect,
    };

    setUserAnswers([...userAnswers, answerRecord]);

    // Save to database
    try {
      await UserQuestionProgress.create({
        question_id: currentQuestion.id,
        lesson_id: lessonId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
      });
    } catch (error) {
      console.error("Error saving question progress:", error);
      // Don't prevent the user from continuing - the answer is still recorded locally
      // The upsert should handle most cases, but if there's still an error, we'll continue
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    } else {
      finishLesson();
    }
  };

  const finishLesson = async () => {
    const correctAnswers = userAnswers.filter((a) => a.is_correct).length;
    const totalQuestions = questions.length;
    const percentage = (correctAnswers / totalQuestions) * 100;
    const passed = percentage >= 80;

    // Save lesson attempt
    try {
      await UserLessonAttempt.create({
        lesson_id: lessonId,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
      });

      // If passed, save to completed lessons in Supabase
      if (passed) {
        await UserProgress.create({
          item_type: "lesson",
          item_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        });

        // Also update localStorage as a backup
        const completedLessons = JSON.parse(
          localStorage.getItem("completedLessons") || "[]"
        );
        if (!completedLessons.includes(lessonId)) {
          completedLessons.push(lessonId);
          localStorage.setItem(
            "completedLessons",
            JSON.stringify(completedLessons)
          );
        }
      }
    } catch (error) {
      console.error("Error saving lesson attempt:", error);
    }

    setIsCompleted(true);
  };

  const getScore = () => {
    const correctAnswers = userAnswers.filter((a) => a.is_correct).length;
    const percentage = (correctAnswers / questions.length) * 100;
    return {
      correct: correctAnswers,
      total: questions.length,
      percentage: Math.round(percentage),
      passed: percentage >= 80,
    };
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setHasAnswered(false);
    setUserAnswers([]);
    setIsCompleted(false);
  };

  const handleBackToPath = () => {
    if (lesson?.chapter) {
      navigate(`/learningpath/${encodeURIComponent(lesson.chapter)}`);
    } else {
      navigate("/learn");
    }
  };

  const getOptionClass = (option) => {
    if (!hasAnswered) {
      return selectedAnswer === option
        ? "border-blue-500 bg-blue-50 text-blue-900"
        : "border-gray-300 hover:border-blue-300 hover:bg-gray-50";
    }

    if (option === currentQuestion.correct_answer) {
      return "border-green-500 bg-green-50 text-green-900";
    }

    if (
      option === selectedAnswer &&
      option !== currentQuestion.correct_answer
    ) {
      return "border-red-500 bg-red-50 text-red-900";
    }

    return "border-gray-300 opacity-50";
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!lesson || questions.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            No Questions Available
          </h1>
          <p className="text-gray-400 mb-6">
            This lesson doesn't have any questions yet.
          </p>
          <Button onClick={handleBackToPath} className="bg-brand-orange">
            Back to Learning Path
          </Button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const score = getScore();

    return (
      <div className="p-6 lg:p-8 bg-brand-charcoal min-h-screen">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 bg-card">
            <CardContent className="p-8 text-center">
              {score.passed ? (
                <>
                  <div className="mb-6">
                    <Trophy className="w-20 h-20 text-yellow-500 mx-auto" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-4">
                    Congratulations!
                  </h1>
                  <p className="text-gray-300 mb-6">
                    You passed the lesson with {score.percentage}%
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <RotateCcw className="w-20 h-20 text-orange-500 mx-auto" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-4">
                    Keep Practicing!
                  </h1>
                  <p className="text-gray-300 mb-6">
                    You scored {score.percentage}%. You need 80% to pass.
                  </p>
                </>
              )}

              <div className="bg-brand-gray rounded-lg p-6 mb-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {score.correct}
                    </div>
                    <div className="text-sm text-gray-400">Correct</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {score.total - score.correct}
                    </div>
                    <div className="text-sm text-gray-400">Incorrect</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {score.percentage}%
                    </div>
                    <div className="text-sm text-gray-400">Score</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                {!score.passed && (
                  <Button onClick={handleRetry} className="bg-brand-orange">
                    Try Again
                  </Button>
                )}
                <Button
                  onClick={handleBackToPath}
                  variant={score.passed ? "default" : "outline"}
                  className={score.passed ? "bg-brand-blue" : ""}
                >
                  Back to Learning Path
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-brand-charcoal min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
            <Badge className="bg-brand-blue text-white">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="border-0 bg-card mb-6">
          <CardContent className="p-8">
            {/* Question Text */}
            <h2 className="text-xl font-semibold text-white mb-6">
              {currentQuestion.question_text}
            </h2>

            {/* Media (if any) */}
            {currentQuestion.media_type === "image" &&
              currentQuestion.media_url && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src={currentQuestion.media_url}
                    alt="Question visual"
                    className="w-full h-auto max-h-96 object-contain bg-gray-900"
                  />
                </div>
              )}

            {currentQuestion.media_type === "video" &&
              currentQuestion.media_url && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <video
                    src={currentQuestion.media_url}
                    controls
                    className="w-full h-auto max-h-96"
                  />
                </div>
              )}

            {/* Answer Options */}
            <div className="space-y-3 mb-6">
              {["A", "B", "C", "D"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleAnswerSelect(option)}
                  disabled={hasAnswered}
                  className={`w-full p-4 text-left border-2 rounded-lg transition-all ${getOptionClass(
                    option
                  )}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{option}.</span>
                    <span>
                      {currentQuestion[`option_${option.toLowerCase()}`]}
                    </span>
                    {hasAnswered &&
                      option === currentQuestion.correct_answer && (
                        <CheckCircle2 className="w-5 h-5 ml-auto text-green-600" />
                      )}
                    {hasAnswered &&
                      option === selectedAnswer &&
                      option !== currentQuestion.correct_answer && (
                        <XCircle className="w-5 h-5 ml-auto text-red-600" />
                      )}
                  </div>
                </button>
              ))}
            </div>

            {/* Explanation (shown after answering) */}
            {hasAnswered && currentQuestion.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Explanation:
                </p>
                <p className="text-sm text-blue-800">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button
                onClick={handleBackToPath}
                variant="outline"
                className="border-gray-700 text-gray-300"
              >
                Exit Quiz
              </Button>

              {!hasAnswered ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="bg-brand-blue"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-brand-orange"
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    "Finish Lesson"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
