import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { ShootingSession } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User as UserIcon, 
  Star, 
  Flame, 
  Trophy, 
  Target,
  TrendingUp,
  Calendar,
  Award,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const userSessions = await ShootingSession.filter({ user_id: currentUser.id });
      setSessions(userSessions);
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
    setIsLoading(false);
  };

  const getLevelProgress = () => {
    if (!user) return 0;
    const currentLevelXP = (user.current_level - 1) * 100;
    const nextLevelXP = user.current_level * 100;
    const progress = ((user.total_xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getXPToNextLevel = () => {
    if (!user) return 0;
    const nextLevelXP = user.current_level * 100;
    return nextLevelXP - user.total_xp;
  };

  const getAverageShootingPercentage = () => {
    if (sessions.length === 0) return 0;
    const totalPercentage = sessions.reduce((sum, session) => sum + (session.percentage || 0), 0);
    return Math.round(totalPercentage / sessions.length);
  };

  const getTotalShots = () => {
    return sessions.reduce((sum, session) => sum + (session.total_shots || 0), 0);
  };

  const getBadgeIcon = (badgeId) => {
    const badgeIcons = {
      'first_lesson': '🎓',
      'streak_7': '🔥',
      'streak_30': '🏆',
      'sharpshooter': '🎯',
      'consistent': '📈',
      'dedicated': '💪'
    };
    return badgeIcons[badgeId] || '🏅';
  };

  const getBadgeName = (badgeId) => {
    const badgeNames = {
      'first_lesson': 'First Lesson',
      'streak_7': '7-Day Streak',
      'streak_30': '30-Day Streak',
      'sharpshooter': 'Sharpshooter',
      'consistent': 'Consistent Player',
      'dedicated': 'Dedicated Trainer'
    };
    return badgeNames[badgeId] || 'Achievement';
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Player Profile</h1>
          </div>
        </div>

        {/* Profile Overview */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src="" />
                <AvatarFallback className="bg-white text-purple-600 font-bold text-2xl">
                  {user?.full_name?.split(' ').map(n => n[0]).join('') || 'P'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">{user?.full_name || 'Player'}</h2>
                <p className="text-purple-100 mb-4">{user?.email}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{user?.current_level || 1}</div>
                    <div className="text-purple-100 text-sm">Level</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{user?.total_xp || 0}</div>
                    <div className="text-purple-100 text-sm">Total XP</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{user?.current_streak || 0}</div>
                    <div className="text-purple-100 text-sm">Day Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{user?.badges?.length || 0}</div>
                    <div className="text-purple-100 text-sm">Badges</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Level Progress */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Level Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Level {user?.current_level || 1}</span>
                <span className="text-sm text-gray-500">
                  {getXPToNextLevel()} XP to next level
                </span>
              </div>
              <Progress value={getLevelProgress()} className="h-3" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{((user?.current_level || 1) - 1) * 100} XP</span>
                <span>{(user?.current_level || 1) * 100} XP</span>
              </div>
            </CardContent>
          </Card>

          {/* Streak */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Activity Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-orange-500 mb-2">
                  {user?.current_streak || 0}
                </div>
                <div className="text-gray-600">Days in a row</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Best streak:</span>
                <span className="font-semibold">{user?.longest_streak || 0} days</span>
              </div>
            </CardContent>
          </Card>

          {/* Shooting Stats */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                Shooting Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-red-500">{getAverageShootingPercentage()}%</div>
                  <div className="text-sm text-gray-600">Avg Accuracy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-500">{getTotalShots()}</div>
                  <div className="text-sm text-gray-600">Total Shots</div>
                </div>
              </div>
              <div className="text-center text-sm text-gray-500">
                {sessions.length} shooting sessions completed
              </div>
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Lessons Completed</span>
                  <span className="font-semibold">{user?.completed_lessons?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Favorite Position</span>
                  <Badge variant="outline">{user?.favorite_position || 'Not set'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last Active</span>
                  <span className="text-sm text-gray-500">
                    {user?.last_active_date 
                      ? format(new Date(user.last_active_date), 'MMM d, yyyy')
                      : 'Today'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements & Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.badges && user.badges.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {user.badges.map((badgeId, index) => (
                  <div key={index} className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                    <div className="text-3xl mb-2">{getBadgeIcon(badgeId)}</div>
                    <div className="font-semibold text-sm text-gray-900">{getBadgeName(badgeId)}</div>
                  </div>
                ))}
                
                {/* Placeholder badges */}
                {Array(8 - user.badges.length).fill(0).map((_, index) => (
                  <div key={`placeholder-${index}`} className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-50">
                    <div className="text-3xl mb-2 text-gray-400">🔒</div>
                    <div className="font-semibold text-sm text-gray-400">Locked</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Badges Yet</h3>
                <p className="text-gray-600 mb-4">Complete lessons and challenges to earn your first badge!</p>
                <Button className="bg-gradient-to-r from-yellow-500 to-orange-600">
                  Start Learning
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Recent Shooting Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">
                        {format(new Date(session.date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600">
                        {session.made_shots}/{session.total_shots} shots
                      </span>
                      <Badge className={session.percentage >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {Math.round(session.percentage)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}