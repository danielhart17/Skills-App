import { useState, useEffect } from "react";
import { Challenge } from "@/api/entities";
import { Trainer } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy,
  Target,
  Clock,
  Star,
  Play,
  Filter,
  Crosshair,
  CheckCircle,
} from "lucide-react";

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [featuredChallenge, setFeaturedChallenge] = useState(null);
  const [featuredTrainer, setFeaturedTrainer] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allChallenges, allTrainers] = await Promise.all([
        Challenge.list(),
        Trainer.list(),
      ]);

      setChallenges(allChallenges);
      setTrainers(allTrainers);

      // Find the featured challenge - prioritize is_featured flag, then any challenge with trainer_id
      const featured =
        allChallenges.find((c) => c.is_featured) ||
        allChallenges.find((c) => c.trainer_id);

      if (featured) {
        setFeaturedChallenge(featured);
        // Find the trainer who created this challenge
        const trainer = allTrainers.find((t) => t.id === featured.trainer_id);
        setFeaturedTrainer(trainer);
        console.log("Featured Challenge:", featured);
        console.log("Featured Trainer:", trainer);
      } else {
        console.log("No featured challenge found");
      }
    } catch (error) {
      console.error("Error loading challenges and trainers:", error);
    }
    setIsLoading(false);
  };

  const getCategories = () => {
    return [
      ...new Set(
        challenges.map((challenge) => challenge.category).filter(Boolean)
      ),
    ];
  };

  const filteredChallenges = challenges.filter((challenge) => {
    // Exclude the featured challenge from the main list if it exists
    const isFeatured =
      featuredChallenge && challenge.id === featuredChallenge.id;
    if (isFeatured) return false;

    const categoryMatch =
      selectedCategory === "all" || challenge.category === selectedCategory;
    const difficultyMatch =
      selectedDifficulty === "all" ||
      challenge.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const getDifficultyColor = (difficulty) => {
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
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "shooting":
        return "🎯";
      case "dribbling":
        return "⚡";
      case "defense":
        return "🛡️";
      case "conditioning":
        return "💪";
      case "footwork":
        return "👟";
      default:
        return "🏀";
    }
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
                className="h-64 bg-gray-200 rounded-xl animate-pulse"
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
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              Challenge Library
            </h1>
          </div>
          <p className="text-xl text-brand-lightGray max-w-2xl mx-auto">
            Push your limits with specialized drills and shooting challenges
          </p>
        </div>

        {/* Featured Challenge Section - Always show this section for testing */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400 fill-current" />
            Featured Trainer Challenge
          </h2>

          {featuredChallenge && featuredTrainer ? (
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white overflow-hidden">
              <CardContent className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="md:col-span-2">
                  <Badge className="bg-white text-blue-600 mb-4 uppercase font-semibold">
                    {getCategoryIcon(featuredChallenge.category)}{" "}
                    {featuredChallenge.category}
                  </Badge>
                  <h3 className="text-3xl font-bold mb-2">
                    {featuredChallenge.title}
                  </h3>
                  <p className="text-blue-100 mb-6 text-lg">
                    {featuredChallenge.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-semibold">
                        {featuredChallenge.duration_minutes || 20} min
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      <span className="font-semibold">
                        +{featuredChallenge.xp_reward} XP
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-transparent border-white text-white uppercase font-semibold"
                    >
                      {featuredChallenge.difficulty}
                    </Badge>
                  </div>
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-gray-100 font-bold shadow-lg px-8 py-3"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Attempt Challenge
                  </Button>
                </div>

                <Link
                  to={`/TrainerProfile?id=${featuredTrainer.id}`}
                  className="group bg-white/10 backdrop-blur-sm p-6 rounded-2xl flex flex-col items-center text-center hover:bg-white/20 transition-all duration-300 border border-white/20"
                >
                  <p className="text-sm font-semibold uppercase tracking-wider text-blue-200 mb-4">
                    From Trainer
                  </p>
                  <Avatar className="w-24 h-24 mb-4 border-4 border-white/50 group-hover:border-white transition-all shadow-lg">
                    <AvatarImage
                      src={featuredTrainer.profile_image}
                      alt={`${featuredTrainer.name}'s profile`}
                    />
                    <AvatarFallback className="text-blue-600 font-bold text-2xl bg-white">
                      {featuredTrainer.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="text-xl font-bold mb-1">
                    {featuredTrainer.name}
                  </h4>
                  <div className="flex items-center justify-center gap-1 text-blue-200 mb-2">
                    {featuredTrainer.verified && (
                      <CheckCircle className="w-4 h-4 text-green-300" />
                    )}
                    <span className="text-sm">{featuredTrainer.location}</span>
                  </div>
                  <p className="text-xs text-blue-200 opacity-80">
                    {featuredTrainer.years_experience} years experience
                  </p>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-100 to-gray-200">
              <CardContent className="p-8 text-center">
                <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No Featured Challenge This Week
                </h3>
                <p className="text-gray-500">
                  Check back soon for a new trainer challenge!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Special Shooting Session Button */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 text-white text-center shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crosshair className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Live Shooting Session</h2>
          </div>
          <p className="text-orange-100 mb-6 max-w-md mx-auto">
            Track your makes and misses in real-time with our interactive court
            tracker
          </p>
          <Link to={createPageUrl("ShootingSession")}>
            <Button
              size="lg"
              className="bg-white text-orange-600 hover:bg-gray-100 font-semibold px-8 py-3"
            >
              <Target className="w-5 h-5 mr-2" />
              Start Shooting Session
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">Category:</span>
            </div>
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              size="sm"
              className={
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                  : ""
              }
            >
              All
            </Button>
            {getCategories().map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                className={
                  selectedCategory === category
                    ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                    : ""
                }
              >
                <span className="mr-1">{getCategoryIcon(category)}</span>
                {category}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">Difficulty:</span>
            {["all", "beginner", "intermediate", "advanced"].map(
              (difficulty) => (
                <Button
                  key={difficulty}
                  variant={
                    selectedDifficulty === difficulty ? "default" : "outline"
                  }
                  onClick={() => setSelectedDifficulty(difficulty)}
                  size="sm"
                  className={
                    selectedDifficulty === difficulty
                      ? "bg-gradient-to-r from-yellow-500 to-orange-600"
                      : ""
                  }
                >
                  {difficulty}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => (
            <Card
              key={challenge.id}
              className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-card overflow-hidden"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getCategoryIcon(challenge.category)}
                    </span>
                    <div>
                      <CardTitle className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">
                        {challenge.title}
                      </CardTitle>
                      <p className="text-gray-400 text-sm mt-1">
                        {challenge.description}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={getDifficultyColor(challenge.difficulty)}>
                      {challenge.difficulty}
                    </Badge>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {challenge.duration_minutes || 20}min
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4" />+{challenge.xp_reward}XP
                      </span>
                    </div>
                  </div>

                  {challenge.equipment_needed &&
                    challenge.equipment_needed.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-white mb-2">
                          Equipment needed:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {challenge.equipment_needed.map(
                            (equipment, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {equipment}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  <Button className="w-full bg-brand-orange hover:opacity-90 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    <Play className="w-4 h-4 mr-2" />
                    Start Challenge
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Challenges Found
            </h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or check back later for new challenges
            </p>
            <Button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedDifficulty("all");
              }}
              className="bg-gradient-to-r from-yellow-500 to-orange-600"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
