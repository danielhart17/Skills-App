import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarPlus,
  Clock,
  CheckCircle,
  Play,
  Users,
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

function getDifficultyColor(difficulty) {
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
}

export default function DrillCard({
  drill,
  isCompleted,
  completionCount = 0,
  onAddToSchedule,
}) {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-lg bg-card overflow-hidden group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl shrink-0">
                {CAT_ICONS[drill.category] || "🏀"}
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-base group-hover:text-yellow-400 transition-colors leading-tight break-words">
                  {drill.title}
                </h3>
                <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">
                  {drill.description}
                </p>
              </div>
            </div>
            {isCompleted && (
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            )}
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={getDifficultyColor(drill.difficulty)}>
                {drill.difficulty}
              </Badge>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                {drill.duration_minutes}min
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Users className="w-3.5 h-3.5" />
                {completionCount} completed
              </span>
            </div>
            {drill.equipment_needed?.length > 0 && (
              <span className="text-xs text-gray-500">
                {drill.equipment_needed.slice(0, 2).join(", ")}
                {drill.equipment_needed.length > 2 &&
                  ` +${drill.equipment_needed.length - 2}`}
              </span>
            )}
          </div>
        </div>

        {drill.tags?.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {drill.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full border border-gray-700 text-gray-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              className="w-full bg-brand-orange hover:opacity-90 text-white"
              onClick={() => navigate(`/drills/${drill.id}`)}
            >
              <Play className="w-4 h-4 mr-2" />
              {isCompleted ? "Review Drill" : "View Drill"}
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
      </CardContent>
    </Card>
  );
}
