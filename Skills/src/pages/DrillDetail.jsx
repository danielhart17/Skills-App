import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Drill, DrillProgress } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle,
  Play,
  Wrench,
  Target,
} from "lucide-react";
import { toast } from "sonner";

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([^&?\s]+)/);
  return match ? match[1] : null;
}

function getDifficultyColor(difficulty) {
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
}

export default function DrillDetail() {
  const { drillId } = useParams();
  const navigate = useNavigate();
  const [drill, setDrill] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);
  const [completionForm, setCompletionForm] = useState({
    timeSpent: 0,
    notes: "",
  });

  useEffect(() => {
    loadDrill();
  }, [drillId]);

  const loadDrill = async () => {
    setIsLoading(true);
    try {
      const [drillData, progressData, countResult] = await Promise.all([
        Drill.get(drillId),
        DrillProgress.getUserProgress(drillId).catch(() => null),
        supabase.rpc("get_drill_completion_count", { p_drill_id: drillId }),
      ]);

      setDrill(drillData);
      setIsCompleted(!!progressData?.is_completed);
      if (countResult.error) {
        console.warn("Completion count unavailable:", countResult.error);
        setCompletionCount(0);
      } else {
        setCompletionCount(countResult.data ?? 0);
      }

      if (progressData) {
        setCompletionForm({
          timeSpent: progressData.time_spent_minutes || 0,
          notes: progressData.notes || "",
        });
      }
    } catch (error) {
      console.error("Error loading drill:", error);
      toast.error("Failed to load drill");
      setDrill(null);
    }
    setIsLoading(false);
  };

  const handleMarkComplete = async () => {
    try {
      await DrillProgress.markComplete(
        drillId,
        completionForm.timeSpent,
        completionForm.notes
      );
      setIsCompleted(true);
      setCompletionCount((prev) => prev + (isCompleted ? 0 : 1));
      toast.success("Drill marked as complete!");
    } catch (error) {
      console.error("Error marking drill complete:", error);
      toast.error("Failed to mark drill as complete");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="h-4 bg-gray-700 rounded w-2/3" />
          <div className="h-48 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!drill) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Drill not found</h1>
        <Button onClick={() => navigate("/workouts")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Workouts
        </Button>
      </div>
    );
  }

  const ytId = getYouTubeId(drill.youtube_url);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate("/workouts")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Workouts
      </Button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{drill.title}</h1>
          <p className="text-muted-foreground text-lg">{drill.description}</p>
        </div>
        {isCompleted && (
          <Badge className="bg-green-100 text-green-800 shrink-0">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </Badge>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        <Badge className={getDifficultyColor(drill.difficulty)}>
          {drill.difficulty}
        </Badge>
        {drill.category && (
          <Badge variant="outline" className="capitalize">
            {drill.category}
          </Badge>
        )}
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          {drill.duration_minutes || 20} min
        </Badge>
        <Badge variant="secondary">
          <Users className="w-3 h-3 mr-1" />
          {completionCount} completed
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {ytId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Demo Video
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="relative w-full rounded-xl overflow-hidden border border-gray-700 bg-black"
                  style={{ paddingBottom: "56.25%", height: 0 }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    title={`${drill.title} demo video`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {drill.setup && (
            <Card>
              <CardHeader>
                <CardTitle>Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {drill.setup}
                </p>
              </CardContent>
            </Card>
          )}

          {drill.steps?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Step-by-Step</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {drill.steps.map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-muted-foreground">{step}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {drill.focus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Key Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {drill.focus}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {drill.equipment_needed?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Equipment
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {drill.equipment_needed.map((item, i) => (
                  <Badge key={i} variant="outline">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold">{completionCount}</p>
                <p className="text-sm text-muted-foreground">
                  athlete{completionCount === 1 ? "" : "s"} completed this drill
                </p>
              </div>

              {!isCompleted ? (
                <>
                  <div className="space-y-2">
                    <Label>Time spent (minutes)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={completionForm.timeSpent}
                      onChange={(e) =>
                        setCompletionForm({
                          ...completionForm,
                          timeSpent: parseInt(e.target.value, 10) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={completionForm.notes}
                      onChange={(e) =>
                        setCompletionForm({
                          ...completionForm,
                          notes: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="How did it go?"
                    />
                  </div>
                  <Button
                    onClick={handleMarkComplete}
                    className="w-full"
                    variant="outline"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark as Complete
                  </Button>
                </>
              ) : (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 font-semibold">Drill Completed!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
