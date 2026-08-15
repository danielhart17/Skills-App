import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Drill } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Clock, ChevronUp, Play, RotateCcw } from "lucide-react";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { createPageUrl } from "@/utils";

const CAT_ICONS = {
  shooting: "🎯", dribbling: "⚡", footwork: "👟",
  conditioning: "💪", defense: "🛡️", passing: "🏀", other: "🏀",
};

function getDifficultyColor(difficulty) {
  switch (difficulty) {
    case "beginner": return "bg-green-100 text-green-800 border-green-200";
    case "intermediate": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "advanced": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([^&?\s]+)/);
  return match ? match[1] : null;
}

function PlanDrillCard({ drill, order, why }) {
  const [expanded, setExpanded] = useState(false);
  const ytId = getYouTubeId(drill.youtube_url);

  return (
    <Card className="border-0 shadow-lg bg-card overflow-hidden">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-orange text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
              {order}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-lg">{CAT_ICONS[drill.category]}</span>
                <h3 className="font-bold text-white text-base">{drill.title}</h3>
              </div>
              <p className="text-sm text-yellow-400 italic mb-2">{why}</p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={getDifficultyColor(drill.difficulty)}>
                  {drill.difficulty}
                </Badge>
                <span className="flex items-center gap-1 text-sm text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {drill.duration_minutes}min
                </span>
                {drill.tags?.slice(0, 2).map((tag, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <Button
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:text-white"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="w-4 h-4 mr-2" />Hide Instructions</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />View Instructions & Video</>
            )}
          </Button>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AIWorkoutBuilder() {
  const navigate = useNavigate();
  const [allDrills, setAllDrills] = useState([]);
  const [position, setPosition] = useState("");
  const [level, setLevel] = useState("");
  const [duration, setDuration] = useState("");
  const [focus, setFocus] = useState("");
  const [goals, setGoals] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!FEATURE_FLAGS.AI_WORKOUT_BUILDER) {
      navigate(createPageUrl("Workouts"), { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!FEATURE_FLAGS.AI_WORKOUT_BUILDER) return;
    Drill.list().then(setAllDrills).catch(console.error);
  }, []);

  if (!FEATURE_FLAGS.AI_WORKOUT_BUILDER) {
    return null;
  }

  const generateWorkout = async () => {
    if (!level || !duration) {
      setError("Please select at least your skill level and session length.");
      return;
    }
    setError("");
    setIsLoading(true);
    setPlan(null);

    try {
      const drillList = allDrills.map((d, i) =>
        `${i + 1}. "${d.title}" | Category: ${d.category} | Difficulty: ${d.difficulty} | Duration: ${d.duration_minutes}min | Tags: ${(d.tags || []).join(", ")}`
      ).join("\n");

      const prompt = `You are an elite basketball skills trainer for Locked In Sports, a premier youth basketball development program.

A player wants a personalized workout plan:
- Position: ${position || "Not specified"}
- Skill Level: ${level}
- Session Length: ${duration}
- Focus Area: ${focus || "Full Workout"}
- Goals: ${goals || "Build a balanced workout"}

Available drills:
${drillList}

Select 4-7 drills that best match this player. Respond ONLY with valid JSON, no markdown, no explanation:
{
  "planTitle": "Short punchy workout name",
  "planSub": "X drills · Y minutes · Level",
  "summary": "2-3 sentences explaining why you chose these drills for this player.",
  "drills": [
    { "drillIndex": <1-based number from list>, "why": "One sentence why this drill fits this player." }
  ],
  "coachingTips": "2-3 actionable coaching tips specific to this player."
}`;

      const { data, error: fnError } = await supabase.functions.invoke("generate-workout", {
        body: { prompt },
      });

      if (fnError) {
        let details = fnError.message;
        // FunctionsHttpError exposes the Response on .context; the edge
        // function returns { error, status, details } on upstream failure.
        if (fnError.context && typeof fnError.context.text === "function") {
          try {
            const body = await fnError.context.text();
            const parsed = JSON.parse(body);
            details = parsed.details || parsed.error || body;
          } catch {
            // context body was not JSON; fall back to fnError.message
          }
        }
        throw new Error(details);
      }

      const raw = typeof data === "string" ? data : JSON.stringify(data);
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean.startsWith("{") ? clean : JSON.stringify(data));

      // Map drill indices to actual drill objects
      const planWithDrills = {
        ...parsed,
        drills: parsed.drills
          .map((item) => ({
            drill: allDrills[item.drillIndex - 1],
            why: item.why,
          }))
          .filter((item) => item.drill),
      };

      setPlan(planWithDrills);
    } catch (err) {
      console.error(err);
      setError(
        err?.message
          ? `Couldn't build your plan: ${err.message}`
          : "Something went wrong building your plan. Please try again."
      );
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-400">
                AI Powered
              </p>
              <h1 className="text-2xl font-bold text-white">Build My Workout</h1>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Tell us about your goals and our AI trainer will build a personalized drill plan from the Locked In Sports library.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Position</label>
              <Select onValueChange={setPosition}>
                <SelectTrigger className="bg-card border-gray-700 text-white">
                  <SelectValue placeholder="Select position..." />
                </SelectTrigger>
                <SelectContent>
                  {["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center", "Any / Multi-position"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Skill Level <span className="text-orange-400">*</span>
              </label>
              <Select onValueChange={setLevel}>
                <SelectTrigger className="bg-card border-gray-700 text-white">
                  <SelectValue placeholder="Select level..." />
                </SelectTrigger>
                <SelectContent>
                  {["Beginner", "Intermediate", "Advanced"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Session Length <span className="text-orange-400">*</span>
              </label>
              <Select onValueChange={setDuration}>
                <SelectTrigger className="bg-card border-gray-700 text-white">
                  <SelectValue placeholder="Select duration..." />
                </SelectTrigger>
                <SelectContent>
                  {["20 minutes", "30 minutes", "45 minutes", "60 minutes", "90 minutes"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Focus Area</label>
              <Select onValueChange={setFocus}>
                <SelectTrigger className="bg-card border-gray-700 text-white">
                  <SelectValue placeholder="Select focus..." />
                </SelectTrigger>
                <SelectContent>
                  {["Shooting", "Ball Handling", "Finishing", "Footwork", "Speed & Athleticism", "Full Workout"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Describe Your Goals
            </label>
            <Textarea
              placeholder="e.g. I want to improve my pull-up jumper and get a quicker first step. I play JV point guard and my crossover is weak going left..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="bg-card border-gray-700 text-white placeholder:text-gray-500 min-h-24 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:opacity-90 text-white font-bold py-6 text-base"
            onClick={generateWorkout}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Building your workout plan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Generate My Workout Plan
              </span>
            )}
          </Button>
        </div>

        {/* Results */}
        {plan && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{plan.planTitle}</h2>
                <p className="text-gray-400 text-sm mt-1">{plan.planSub}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={generateWorkout}
                className="border-gray-700 text-gray-400 hover:text-white flex-shrink-0"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Regenerate
              </Button>
            </div>

            {/* Coach Summary */}
            <div className="bg-green-950/40 border border-green-800/50 rounded-xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-400 mb-2">
                Coach's Game Plan
              </p>
              <p className="text-sm text-gray-300 leading-relaxed">{plan.summary}</p>
            </div>

            {/* Drill Cards */}
            <div className="space-y-4">
              {plan.drills.map((item, i) => (
                <PlanDrillCard
                  key={item.drill.id}
                  drill={item.drill}
                  order={i + 1}
                  why={item.why}
                />
              ))}
            </div>

            {/* Coaching Tips */}
            {plan.coachingTips && (
              <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
                  Coach's Tips for You
                </p>
                <p className="text-sm text-gray-300 leading-relaxed">{plan.coachingTips}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}