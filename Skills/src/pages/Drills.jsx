import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Drill, DrillProgress } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Clock,
  Users,
  Search,
  Filter,
  CheckCircle,
  MapPin,
  Wrench,
} from "lucide-react";

export default function Drills() {
  const navigate = useNavigate();
  const [drills, setDrills] = useState([]);
  const [completedDrills, setCompletedDrills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [drillsData, completedData] = await Promise.all([
        Drill.list(),
        DrillProgress.getCompletedDrills(),
      ]);

      setDrills(drillsData);
      setCompletedDrills(completedData);
    } catch (error) {
      console.error("Error loading drills:", error);
    }
    setIsLoading(false);
  };

  const filteredDrills = drills.filter((drill) => {
    const matchesSearch =
      drill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drill.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || drill.category === selectedCategory;
    const matchesDifficulty =
      selectedDifficulty === "all" || drill.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

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

  const getCategoryIcon = (category) => {
    switch (category) {
      case "shooting":
        return "🏀";
      case "dribbling":
        return "⚡";
      case "defense":
        return "🛡️";
      case "passing":
        return "📤";
      case "conditioning":
        return "💪";
      case "footwork":
        return "👟";
      case "rebounding":
        return "⬆️";
      default:
        return "🎯";
    }
  };

  const getCategories = () => {
    const categories = [...new Set(drills.map((drill) => drill.category))];
    return categories.sort();
  };

  const isDrillCompleted = (drillId) => {
    return completedDrills.includes(drillId);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Basketball Drills</h1>
        </div>
        <p className="text-muted-foreground">
          Practice your skills with these basketball drills. Each drill includes
          detailed instructions, setup, and focus points.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search drills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryIcon(category)} {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedDifficulty}
              onValueChange={setSelectedDifficulty}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          Showing {filteredDrills.length} of {drills.length} drills
        </div>
      </div>

      {/* Drills Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredDrills.map((drill) => (
          <Card
            key={drill.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(`/drills/${drill.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{drill.title}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {drill.description}
                  </p>
                </div>
                {isDrillCompleted(drill.id) && (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Purpose Preview */}
              <div>
                <h4 className="font-semibold text-sm mb-1">Purpose:</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {drill.purpose}
                </p>
              </div>

              {/* Badges */}
              <div className="flex gap-2 flex-wrap">
                <Badge className={getDifficultyColor(drill.difficulty)}>
                  {drill.difficulty}
                </Badge>
                <Badge variant="outline">
                  {getCategoryIcon(drill.category)} {drill.category}
                </Badge>
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  {drill.duration_minutes}m
                </Badge>
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  {drill.players_needed}
                </Badge>
              </div>

              {/* Equipment */}
              {drill.equipment_needed && drill.equipment_needed.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    Equipment:
                  </h4>
                  <div className="flex gap-1 flex-wrap">
                    {drill.equipment_needed
                      .slice(0, 3)
                      .map((equipment, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {equipment}
                        </Badge>
                      ))}
                    {drill.equipment_needed.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{drill.equipment_needed.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Space Required */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {drill.space_required}
              </div>

              {/* Action Button */}
              <Button
                className="w-full"
                variant={isDrillCompleted(drill.id) ? "outline" : "default"}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/drills/${drill.id}`);
                }}
              >
                {isDrillCompleted(drill.id) ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    View Again
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Start Drill
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredDrills.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No drills found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filter criteria.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setSelectedDifficulty("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
