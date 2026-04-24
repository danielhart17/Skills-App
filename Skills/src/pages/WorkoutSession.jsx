import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { WorkoutAssignment } from "@/api/entities";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Play,
  Pause,
  CheckCircle,
  Clock,
  Target,
  ArrowLeft,
  Trophy,
  Timer,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function WorkoutSession() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user, isParent } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [notes, setNotes] = useState("");
  const [completing, setCompleting] = useState(false);

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    try {
      const data = await WorkoutAssignment.get(assignmentId);
      setAssignment(data);

      if (data.status === "assigned") {
        await WorkoutAssignment.start(assignmentId);
        setAssignment({ ...data, status: "in_progress" });
      }
    } catch (error) {
      console.error("Error loading assignment:", error);
      toast.error("Failed to load workout");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, navigate]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await WorkoutAssignment.complete(assignmentId, elapsedTime, notes || null);
      toast.success("Workout completed! Great job!");
      
      if (isParent()) {
        navigate("/ParentDashboard");
      } else {
        navigate("/workouts");
      }
    } catch (error) {
      console.error("Error completing workout:", error);
      toast.error(error.message || "Failed to complete workout");
    } finally {
      setCompleting(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-white mb-2">Workout Not Found</h2>
        <Button onClick={() => navigate(-1)} variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const challenge = assignment.challenge;
  const isGuiding = isParent() && assignment.assigned_by_parent_id === user?.id;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isGuiding && (
                <Badge className="bg-purple-500">
                  <User className="w-3 h-3 mr-1" />
                  Guiding {assignment.child?.full_name}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white">{challenge.title}</h1>
            <p className="text-brand-lightGray mt-2">{challenge.description}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Badge className={getDifficultyColor(challenge.difficulty)}>
            {challenge.difficulty}
          </Badge>
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {challenge.duration_minutes} min
          </Badge>
          <Badge variant="secondary">
            <Trophy className="w-3 h-3 mr-1" />
            {challenge.xp_reward} XP
          </Badge>
        </div>
      </div>

      {/* Timer Card */}
      <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-500 to-red-600 mb-6">
        <CardContent className="p-8 text-center text-white">
          <Timer className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <p className="text-6xl font-mono font-bold mb-4">
            {formatTime(elapsedTime)}
          </p>
          <p className="text-orange-100 mb-6">
            Target: {challenge.duration_minutes} minutes
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setIsRunning(!isRunning)}
              className="min-w-32"
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  {elapsedTime === 0 ? "Start" : "Resume"}
                </>
              )}
            </Button>
          </div>
          {elapsedTime > 0 && (
            <Progress
              value={Math.min(
                (elapsedTime / (challenge.duration_minutes * 60)) * 100,
                100
              )}
              className="mt-6 h-2 bg-white/20"
            />
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      {challenge.instructions && (
        <Card className="border-0 shadow-xl bg-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert max-w-none">
              {challenge.instructions.split("\n").map((line, i) => (
                <p key={i} className="text-gray-300 mb-2">
                  {line}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup */}
      {challenge.setup && (
        <Card className="border-0 shadow-xl bg-card mb-6">
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">{challenge.setup}</p>
          </CardContent>
        </Card>
      )}

      {/* Focus Areas */}
      {challenge.focus && (
        <Card className="border-0 shadow-xl bg-card mb-6">
          <CardHeader>
            <CardTitle>Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">{challenge.focus}</p>
          </CardContent>
        </Card>
      )}

      {/* Equipment */}
      {challenge.equipment_needed?.length > 0 && (
        <Card className="border-0 shadow-xl bg-card mb-6">
          <CardHeader>
            <CardTitle>Equipment Needed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {challenge.equipment_needed.map((item, i) => (
                <Badge key={i} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="border-0 shadow-xl bg-card mb-6">
        <CardHeader>
          <CardTitle>Session Notes</CardTitle>
          <CardDescription>
            Add any observations or notes about this workout session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did it go? Any areas to focus on next time?"
            className="min-h-24"
          />
        </CardContent>
      </Card>

      {/* Complete Button */}
      <div className="flex justify-center pb-8">
        <Button
          size="lg"
          onClick={handleComplete}
          disabled={completing}
          className="bg-green-500 hover:bg-green-600 min-w-48"
        >
          {completing ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-5 h-5 mr-2" />
          )}
          Complete Workout
        </Button>
      </div>

      {isGuiding && (
        <p className="text-center text-sm text-gray-500">
          This completion will be credited to {assignment.child?.full_name}'s profile
        </p>
      )}
    </div>
  );
}
