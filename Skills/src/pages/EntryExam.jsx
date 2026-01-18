import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EntryExam } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  Target,
  Star,
  Zap,
  Award,
} from "lucide-react";

const DIFFICULTY_CONFIG = {
  beginner: {
    label: "Beginner",
    color: "bg-green-500",
    textColor: "text-green-500",
    bgColor: "bg-green-500/20",
    xpPerQuestion: 10,
  },
  intermediate: {
    label: "Intermediate",
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
    xpPerQuestion: 25,
  },
  advanced: {
    label: "Advanced",
    color: "bg-red-500",
    textColor: "text-red-500",
    bgColor: "bg-red-500/20",
    xpPerQuestion: 50,
  },
};

export default function EntryExamPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  
  const [phase, setPhase] = useState("intro"); // intro, exam, results
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [examResult, setExamResult] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      // Check if user has already completed the exam
      const hasCompleted = await EntryExam.hasCompletedExam();
      if (hasCompleted) {
        // Redirect to home if already completed
        navigate("/");
        return;
      }

      // Load all questions
      const allQuestions = await EntryExam.getQuestions();
      
      // Separate by difficulty and shuffle within each category
      const beginnerQs = shuffleArray(allQuestions.filter(q => q.difficulty === "beginner")).slice(0, 4);
      const intermediateQs = shuffleArray(allQuestions.filter(q => q.difficulty === "intermediate")).slice(0, 4);
      const advancedQs = shuffleArray(allQuestions.filter(q => q.difficulty === "advanced")).slice(0, 4);
      
      // Combine in order: beginner -> intermediate -> advanced
      setQuestions([...beginnerQs, ...intermediateQs, ...advancedQs]);
    } catch (error) {
      console.error("Error loading exam questions:", error);
    }
    setIsLoading(false);
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const startExam = () => {
    setPhase("exam");
    setStartTime(Date.now());
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerSelect = (answer) => {
    if (hasAnswered) return;
    setSelectedAnswer(answer);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || hasAnswered) return;

    setHasAnswered(true);
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    const answerRecord = {
      question_id: currentQuestion.id,
      difficulty: currentQuestion.difficulty,
      answer: selectedAnswer,
      is_correct: isCorrect,
    };

    setUserAnswers([...userAnswers, answerRecord]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setHasAnswered(false);
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Calculate scores by difficulty
    const beginnerCorrect = userAnswers.filter(a => a.difficulty === "beginner" && a.is_correct).length;
    const intermediateCorrect = userAnswers.filter(a => a.difficulty === "intermediate" && a.is_correct).length;
    const advancedCorrect = userAnswers.filter(a => a.difficulty === "advanced" && a.is_correct).length;
    
    const totalCorrect = beginnerCorrect + intermediateCorrect + advancedCorrect;
    const totalQuestions = questions.length;
    const percentage = Math.round((totalCorrect / totalQuestions) * 100);

    const resultData = {
      beginner_correct: beginnerCorrect,
      beginner_total: 4,
      intermediate_correct: intermediateCorrect,
      intermediate_total: 4,
      advanced_correct: advancedCorrect,
      advanced_total: 4,
      total_correct: totalCorrect,
      total_questions: totalQuestions,
      percentage,
      time_spent: timeSpent,
      question_responses: userAnswers,
    };

    try {
      const result = await EntryExam.submitExamResult(resultData);
      setExamResult(result);
      setPhase("results");
    } catch (error) {
      console.error("Error submitting exam result:", error);
      // Still show results even if save fails
      setExamResult({
        ...resultData,
        starting_xp: (beginnerCorrect * 10) + (intermediateCorrect * 25) + (advancedCorrect * 50),
        starting_level: calculateLevel((beginnerCorrect * 10) + (intermediateCorrect * 25) + (advancedCorrect * 50)),
      });
      setPhase("results");
    }
  };

  const calculateLevel = (xp) => {
    if (xp <= 50) return 1;
    if (xp <= 150) return 2;
    if (xp <= 300) return 3;
    return 4;
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

    if (option === selectedAnswer && option !== currentQuestion.correct_answer) {
      return "border-red-500 bg-red-50 text-red-900";
    }

    return "border-gray-300 opacity-50";
  };

  const getDifficultyBadge = (difficulty) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    return (
      <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏀</div>
          <p className="text-gray-400">Loading Entry Exam...</p>
        </div>
      </div>
    );
  }

  // INTRO PHASE
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-0 bg-gray-800/50 backdrop-blur">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Skills Assessment</h1>
              <p className="text-gray-400">Let's see where you're at!</p>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-white mb-4">How It Works:</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-500 text-sm font-bold">4</span>
                  </div>
                  <span><strong className="text-green-500">Beginner</strong> questions (10 XP each)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-500 text-sm font-bold">4</span>
                  </div>
                  <span><strong className="text-yellow-500">Intermediate</strong> questions (25 XP each)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-500 text-sm font-bold">4</span>
                  </div>
                  <span><strong className="text-red-500">Advanced</strong> questions (50 XP each)</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">Earn up to 340 XP!</span>
              </div>
              <p className="text-sm text-gray-400">
                Your answers will determine your starting level and XP.
              </p>
            </div>

            <Button 
              onClick={startExam}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6 text-lg"
            >
              Start Assessment
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RESULTS PHASE
  if (phase === "results") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-0 bg-gray-800/50 backdrop-blur">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Assessment Complete!</h1>
              <p className="text-gray-400">Here's how you did</p>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-500">
                  {examResult?.beginner_correct || 0}/4
                </div>
                <div className="text-sm text-gray-400">Beginner</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-500">
                  {examResult?.intermediate_correct || 0}/4
                </div>
                <div className="text-sm text-gray-400">Intermediate</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-500">
                  {examResult?.advanced_correct || 0}/4
                </div>
                <div className="text-sm text-gray-400">Advanced</div>
              </div>
            </div>

            {/* Overall Stats */}
            <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-6 h-6 text-yellow-500" />
                    <span className="text-3xl font-bold text-white">
                      Level {examResult?.starting_level || 1}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">Starting Level</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-6 h-6 text-blue-500" />
                    <span className="text-3xl font-bold text-white">
                      {examResult?.starting_xp || 0}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">Starting XP</p>
                </div>
              </div>
            </div>

            {/* Encouragement Message */}
            <div className="bg-gradient-to-r from-orange-500/10 to-blue-500/10 border border-orange-500/30 rounded-lg p-4 mb-8">
              <div className="flex items-center justify-center gap-2 text-orange-400 mb-2">
                <Award className="w-5 h-5" />
                <span className="font-semibold">
                  {examResult?.percentage >= 80 ? "Outstanding!" : 
                   examResult?.percentage >= 60 ? "Great job!" : 
                   examResult?.percentage >= 40 ? "Good start!" : "Let's get learning!"}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {examResult?.percentage >= 80 
                  ? "You have excellent basketball knowledge!" 
                  : "Keep learning and you'll master these concepts in no time!"}
              </p>
            </div>

            <Button 
              onClick={async () => {
                await refreshProfile();
                navigate("/");
              }}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6 text-lg"
            >
              Start Learning
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // EXAM PHASE
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-gray-400">No questions available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Skills Assessment</h1>
              {getDifficultyBadge(currentQuestion.difficulty)}
            </div>
            <Badge className="bg-blue-500/20 text-blue-400 border-0">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="border-0 bg-gray-800/50 backdrop-blur mb-6">
          <CardContent className="p-8">
            {/* Question Text */}
            <h2 className="text-xl font-semibold text-white mb-6">
              {currentQuestion.question_text}
            </h2>

            {/* Media (if any) */}
            {currentQuestion.media_type === "image" && currentQuestion.media_url && (
              <div className="mb-6 rounded-lg overflow-hidden">
                <img
                  src={currentQuestion.media_url}
                  alt="Question visual"
                  className="w-full h-auto max-h-96 object-contain bg-gray-900"
                />
              </div>
            )}

            {currentQuestion.media_type === "video" && currentQuestion.media_url && (
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
                  className={`w-full p-4 text-left border-2 rounded-lg transition-all ${getOptionClass(option)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">{option}.</span>
                    <span>{currentQuestion[`option_${option.toLowerCase()}`]}</span>
                    {hasAnswered && option === currentQuestion.correct_answer && (
                      <CheckCircle2 className="w-5 h-5 ml-auto text-green-600" />
                    )}
                    {hasAnswered && option === selectedAnswer && option !== currentQuestion.correct_answer && (
                      <XCircle className="w-5 h-5 ml-auto text-red-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Explanation (shown after answering) */}
            {hasAnswered && currentQuestion.explanation && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-blue-400 mb-2">Explanation:</p>
                <p className="text-sm text-gray-300">{currentQuestion.explanation}</p>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end">
              {!hasAnswered ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-gradient-to-r from-orange-500 to-orange-600"
                >
                  {currentQuestionIndex < questions.length - 1 ? (
                    <>
                      Next Question <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    "View Results"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* XP Indicator */}
        <div className="flex justify-center">
          <div className="bg-gray-800/50 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-400">
              +{DIFFICULTY_CONFIG[currentQuestion.difficulty].xpPerQuestion} XP for correct answer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
