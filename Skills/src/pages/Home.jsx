import { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Lesson } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Brain, Trophy, Target, Flame, Star, Clock, Play } from "lucide-react";

export default function Home() {
  const { isTrainer } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [recentLessons, setRecentLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const lessons = await Lesson.list();
      setRecentLessons(lessons.slice(0, 3));
    } catch (error) {
      console.error("Error loading user data:", error);
    }
    setIsLoading(false);
  };

  const getLevelProgress = () => {
    if (!user) return 0;
    // Calculate XP needed for the current level
    const xpForPreviousLevels =
      (((user.current_level - 1) * user.current_level) / 2) * 100;
    const xpForNextLevel = user.current_level * 100; // XP needed to complete current level
    const currentLevelTotalXp = user.total_xp - xpForPreviousLevels; // XP earned within the current level
    const progress = (currentLevelTotalXp / xpForNextLevel) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getStreakColor = () => {
    if (!user) return "text-gray-500";
    if (user.current_streak >= 30) return "text-red-500";
    if (user.current_streak >= 14) return "text-orange-500";
    if (user.current_streak >= 7) return "text-yellow-500";
    return "text-blue-500";
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 rounded-xl animate-pulse"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
              Welcome back, {user?.full_name?.split(" ")[0] || "Player"}! 🏀
            </h1>
            <p className="text-brand-lightGray text-lg">
              Ready to improve your game today?
            </p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Learn")}>
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg transition-all">
                <Brain className="w-5 h-5 mr-2" />
                Learn
              </Button>
            </Link>
            <Link to="/drills">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl shadow-lg transition-all">
                <Target className="w-5 h-5 mr-2" />
                Drills
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards - Hidden for trainers */}
        {!isTrainer() && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      Current Level
                    </p>
                    <p className="text-3xl font-bold">
                      {user?.current_level || 1}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-blue-200" />
                </div>
                <div className="mt-4">
                  <Progress
                    value={getLevelProgress()}
                    className="h-2 bg-blue-400"
                  />
                  <p className="text-blue-100 text-xs mt-1">
                    {Math.round(getLevelProgress())}% to next level
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">
                      Current Streak
                    </p>
                    <p className="text-3xl font-bold">
                      {user?.current_streak || 0}
                    </p>
                  </div>
                  <Flame className={`w-8 h-8 ${getStreakColor()}`} />
                </div>
                <p className="text-yellow-100 text-xs mt-2">
                  Best: {user?.longest_streak || 0} days
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-0 shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Play className="w-6 h-6 text-brand-orange" />
                Continue Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentLessons.length > 0 ? (
                recentLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20">
                        <Brain className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">
                          {lesson.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="default" className="text-xs">
                            Learn
                          </Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.estimated_time || 5}min
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="bg-brand-orange hover:opacity-90"
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                    >
                      Start
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    No lessons available yet.
                  </p>
                  <Link to={createPageUrl("Learn")}>
                    <Button className="bg-gradient-to-r from-blue-500 to-indigo-500">
                      Explore Lessons
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Today's Challenge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30">
                <h3 className="font-bold text-lg text-white mb-2">
                  Perfect Your Free Throws
                </h3>
                <p className="text-gray-300 mb-4">
                  Make 20 consecutive free throws to earn the &quot;Clutch
                  Shooter&quot; badge
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500 text-white">+50 XP</Badge>
                    <Badge
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                    >
                      🏆 Badge
                    </Badge>
                  </div>
                  <Link to={createPageUrl("Challenges")}>
                    <Button className="bg-brand-orange hover:opacity-90 text-white">
                      Accept Challenge
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
