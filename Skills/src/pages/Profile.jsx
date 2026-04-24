import { useState, useEffect, useCallback } from "react";
import { User, ParentChild } from "@/api/entities";
import { ShootingSession } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User as UserIcon,
  Star,
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  Clock,
  Eye,
  Edit,
  Upload,
  Loader2,
  Camera,
  Users,
  Link2,
  Copy,
  RefreshCw,
  UserX,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Court zones configuration (matches ShootingSession.jsx exactly)
const COURT_ZONES = [
  {
    id: "left-corner",
    name: "Left Corner",
    color: "rgba(128, 128, 128, 0.5)",
    path: "M 0 5 L 0 40 L 10.5 35 Q 7.5 30 8 5 Z",
  },
  {
    id: "right-corner",
    name: "Right Corner",
    color: "rgba(128, 128, 128, 0.5)",
    path: "M 92 5 Q 92.5 30 89.5 35 L 100 40 L 100 5 Z",
  },
  {
    id: "left-mid",
    name: "Left Mid",
    color: "rgba(59, 130, 246, 0.5)",
    path: "M 8 5 Q 7.5 30 10.5 35 L 25 28 L 25 5 Z",
  },
  {
    id: "right-mid",
    name: "Right Mid",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 75 5 L 75 28 L 89.5 35 Q 92.5 30  92 5 Z",
  },
  {
    id: "left-inside",
    name: "Left Inside",
    color: "rgba(59, 130, 246, 0.5)",
    path: "M 25 5 L 40 5 Q 39 21 43 24 L 30 36 Q 25 31 25 27 L 25 5 Z",
  },
  {
    id: "inside",
    name: "Inside",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 43 24 Q 50 29.5 57 24 L 70 36 Q 67.5 39 63 41 Q 50 44.5 37 41 Q 32.5 39 30 36 L 43 24 Z",
  },
  {
    id: "right-inside",
    name: "Right Inside",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 75 5 L 60 5 Q 61 21 57 24 L 70 36 Q 75 31 75 27  L 75 5 Z",
  },
  {
    id: "restricted",
    name: "Restricted Area",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 40 5 L 40 17 A 3 3 0 1 0 60 17 L 60 5 Z",
  },
  {
    id: "top-key",
    name: "Top of Key",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 30 55 L 20 100 L 80 100 L 70 55 Q 50 64 30 55 Z",
  },
  {
    id: "free-throw",
    name: "Free Throw",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 37 41 L 30 55 Q 50 64 70 55 L 63 41 Q 50 45 37 41 Z",
  },
  {
    id: "left-elbow",
    name: "Left Elbow",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 10.5 35 L 25 28 Q 27 35 37 41 L 30 55 Q 18 50 10.5 35 Z",
  },
  {
    id: "right-elbow",
    name: "Right Elbow",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 89.5 35 L 75 28 Q 73 35 63 41 L 70 55 Q 82 50 89.5 35 Z",
  },
  {
    id: "left-wing",
    name: "Left Wing",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 10.5 35 L 0 40 L 0 100 L 20 100 L 30 55 Q 18 50 10.5 35 Z",
  },
  {
    id: "right-wing",
    name: "Right Wing",
    color: "rgba(239, 68, 68, 0.5)",
    path: "M 89.5 35 L 100 40 L 100 100 L 80 100 L 70 55 Q 82 50 89.5 35 Z",
  },
];

// Label positions (matches ShootingSession.jsx exactly)
const getZoneLabelPosition = (zoneId) => {
  const positions = {
    "left-corner": { x: 5, y: 20 },
    "right-corner": { x: 95, y: 20 },
    "left-mid": { x: 17, y: 15 },
    "right-mid": { x: 83, y: 15 },
    "left-inside": { x: 33, y: 18 },
    inside: { x: 50, y: 34 },
    "right-inside": { x: 67, y: 18 },
    restricted: { x: 50, y: 18 },
    "top-key": { x: 50, y: 75 },
    "free-throw": { x: 50, y: 50 },
    "left-elbow": { x: 25, y: 42 },
    "right-elbow": { x: 75, y: 42 },
    "left-wing": { x: 12, y: 70 },
    "right-wing": { x: 88, y: 70 },
  };
  return positions[zoneId] || { x: 50, y: 50 };
};

// Helper function to get court zones
const getCourtZones = () => COURT_ZONES;

const POSITIONS = [
  "Point Guard",
  "Shooting Guard", 
  "Small Forward",
  "Power Forward",
  "Center",
  "Guard",
  "Forward",
  "Not set",
];

export default function Profile() {
  const { isTrainer, isAthlete, refreshProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  
  // Edit profile state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    favorite_position: "",
    avatar_url: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Parent linking state
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteExpires, setInviteExpires] = useState(null);
  const [linkedParents, setLinkedParents] = useState([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);

  const loadParentLinks = useCallback(async () => {
    if (!isAthlete()) return;
    setLoadingParents(true);
    try {
      const parents = await ParentChild.getMyParentLinks();
      setLinkedParents(parents);
      
      const codes = await ParentChild.getMyInviteCodes();
      if (codes.length > 0) {
        const activeCode = codes[0];
        setInviteCode(activeCode.code);
        setInviteExpires(new Date(activeCode.expires_at));
      } else {
        setInviteCode(null);
        setInviteExpires(null);
      }
    } catch (error) {
      console.error("Error loading parent links:", error);
    } finally {
      setLoadingParents(false);
    }
  }, [isAthlete]);

  useEffect(() => {
    loadProfileData();
  }, []);

  useEffect(() => {
    if (isAthlete()) {
      loadParentLinks();
    }
  }, [isAthlete, loadParentLinks]);

  const loadProfileData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const userSessions = await ShootingSession.filter({
        user_id: currentUser.id,
      });
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
    const progress =
      ((user.total_xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getXPToNextLevel = () => {
    if (!user) return 0;
    const nextLevelXP = user.current_level * 100;
    return nextLevelXP - user.total_xp;
  };

  const getAverageShootingPercentage = () => {
    if (sessions.length === 0) return 0;
    const totalPercentage = sessions.reduce(
      (sum, session) => sum + (session.shooting_percentage || 0),
      0
    );
    return Math.round(totalPercentage / sessions.length);
  };

  const getTotalShots = () => {
    return sessions.reduce(
      (sum, session) => sum + (session.total_shots || 0),
      0
    );
  };

  const getBadgeIcon = (badgeId) => {
    const badgeIcons = {
      first_lesson: "🎓",
      streak_7: "🔥",
      streak_30: "🏆",
      sharpshooter: "🎯",
      consistent: "📈",
      dedicated: "💪",
    };
    return badgeIcons[badgeId] || "🏅";
  };

  const getBadgeName = (badgeId) => {
    const badgeNames = {
      first_lesson: "First Lesson",
      streak_7: "7-Day Streak",
      streak_30: "30-Day Streak",
      sharpshooter: "Sharpshooter",
      consistent: "Consistent Player",
      dedicated: "Dedicated Trainer",
    };
    return badgeNames[badgeId] || "Achievement";
  };

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setShowSessionDialog(true);
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const openEditDialog = () => {
    setEditForm({
      full_name: user?.full_name || "",
      favorite_position: user?.favorite_position || "Not set",
      avatar_url: user?.avatar_url || "",
    });
    setShowEditDialog(true);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(fileName);

      setEditForm(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          favorite_position: editForm.favorite_position === "Not set" ? null : editForm.favorite_position,
          avatar_url: editForm.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Refresh user data
      setUser(prev => ({
        ...prev,
        full_name: editForm.full_name,
        favorite_position: editForm.favorite_position === "Not set" ? null : editForm.favorite_position,
        avatar_url: editForm.avatar_url,
      }));
      
      if (refreshProfile) {
        await refreshProfile();
      }

      toast.success("Profile updated successfully!");
      setShowEditDialog(false);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInviteCode = async () => {
    setGeneratingCode(true);
    try {
      const result = await ParentChild.createInviteCode();
      setInviteCode(result.code);
      setInviteExpires(new Date(result.expires_at));
      toast.success("Invite code generated!");
    } catch (error) {
      console.error("Error generating code:", error);
      toast.error(error.message || "Failed to generate invite code");
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast.success("Code copied to clipboard!");
    }
  };

  const handleRevokeParentLink = async (linkId) => {
    try {
      await ParentChild.revokeLink(linkId);
      toast.success("Parent link removed");
      loadParentLinks();
    } catch (error) {
      console.error("Error revoking link:", error);
      toast.error("Failed to remove parent link");
    }
  };

  const isCodeExpired = inviteExpires && new Date() > inviteExpires;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 bg-gray-200 rounded-xl animate-pulse"
              ></div>
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
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              Player Profile
            </h1>
          </div>
        </div>

        {/* Profile Overview */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white relative">
          <Button
            onClick={openEditDialog}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                <AvatarImage src={user?.avatar_url || ""} />
                <AvatarFallback className="bg-white text-purple-600 font-bold text-2xl">
                  {user?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "P"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold mb-2">
                  {user?.full_name || "Player"}
                </h2>
                <p className="text-purple-100 mb-4">{user?.email}</p>

                {!isTrainer() ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {user?.current_level || 1}
                      </div>
                      <div className="text-purple-100 text-sm">Level</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {user?.total_xp || 0}
                      </div>
                      <div className="text-purple-100 text-sm">Total XP</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {user?.current_streak || 0}
                      </div>
                      <div className="text-purple-100 text-sm">Day Streak</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {user?.badges?.length || 0}
                      </div>
                      <div className="text-purple-100 text-sm">Badges</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {user?.badges?.length || 0}
                      </div>
                      <div className="text-purple-100 text-sm">Badges</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress & Stats - Hidden for trainers */}
        {!isTrainer() && (
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
                  <span className="text-lg font-semibold">
                    Level {user?.current_level || 1}
                  </span>
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
                  <span className="font-semibold">
                    {user?.longest_streak || 0} days
                  </span>
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
                    <div className="text-2xl font-bold text-red-500">
                      {getAverageShootingPercentage()}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Accuracy</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-500">
                      {getTotalShots()}
                    </div>
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
                    <span className="text-sm text-gray-600">
                      Lessons Completed
                    </span>
                    <span className="font-semibold">
                      {user?.completed_lessons?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Favorite Position
                    </span>
                    <Badge variant="outline">
                      {user?.favorite_position || "Not set"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Active</span>
                    <span className="text-sm text-gray-500">
                      {user?.last_active_date
                        ? format(new Date(user.last_active_date), "MMM d, yyyy")
                        : "Today"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Parent Linking Section - For Athletes Only */}
        {isAthlete() && (
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Parent/Guardian Link
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Linked Parents */}
              {linkedParents.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase">
                    Linked Parents
                  </h3>
                  {linkedParents.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {link.parent?.full_name || "Parent"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {link.parent?.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeParentLink(link.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Generate Invite Code */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase">
                  Link a New Parent
                </h3>
                <p className="text-sm text-gray-600">
                  Generate an invite code to share with your parent or guardian.
                  They can use this code to link their account to yours.
                </p>

                {inviteCode && !isCodeExpired ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-4 bg-gray-100 rounded-lg text-center">
                        <p className="text-3xl font-mono font-bold tracking-widest text-orange-600">
                          {inviteCode}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Expires in{" "}
                          {Math.max(
                            0,
                            Math.round((inviteExpires - new Date()) / 60000)
                          )}{" "}
                          minutes
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyCode}
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleGenerateInviteCode}
                      disabled={generatingCode}
                      className="w-full"
                    >
                      {generatingCode ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Generate New Code
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateInviteCode}
                    disabled={generatingCode}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    {generatingCode ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    Generate Invite Code
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div
                    key={index}
                    className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200"
                  >
                    <div className="text-3xl mb-2">{getBadgeIcon(badgeId)}</div>
                    <div className="font-semibold text-sm text-gray-900">
                      {getBadgeName(badgeId)}
                    </div>
                  </div>
                ))}

                {/* Placeholder badges */}
                {Array(8 - user.badges.length)
                  .fill(0)
                  .map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-50"
                    >
                      <div className="text-3xl mb-2 text-gray-400">🔒</div>
                      <div className="font-semibold text-sm text-gray-400">
                        Locked
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Badges Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Complete lessons and workouts to earn your first badge!
                </p>
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
                  <div
                    key={session.id}
                    onClick={() => handleViewSession(session)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-500 group-hover:text-orange-500 transition-colors" />
                      <span className="font-medium group-hover:text-orange-600 transition-colors">
                        {format(new Date(session.date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-600 group-hover:text-gray-800 transition-colors">
                        {session.made_shots}/{session.total_shots} shots
                      </span>
                      <Badge
                        className={
                          session.shooting_percentage >= 50
                            ? "bg-green-100 text-green-800 group-hover:bg-green-200 transition-colors"
                            : "bg-red-100 text-red-800 group-hover:bg-red-200 transition-colors"
                        }
                      >
                        {Math.round(session.shooting_percentage)}%
                      </Badge>
                      <Eye className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Session Details Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-6 h-6 text-orange-500" />
              Session Details
            </DialogTitle>
            <DialogDescription>
              {selectedSession &&
                format(new Date(selectedSession.date), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6 py-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {selectedSession.total_shots}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Shots</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {selectedSession.made_shots}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Made Shots</div>
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                <div className="text-5xl font-bold text-orange-600">
                  {Math.round(selectedSession.shooting_percentage)}%
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Shooting Percentage
                </div>
              </div>

              {selectedSession.duration_seconds && (
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div className="text-2xl font-bold text-gray-700">
                      {formatDuration(selectedSession.duration_seconds)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Session Duration
                  </div>
                </div>
              )}

              {/* Zone Stats Court View */}
              {selectedSession.zone_stats && Object.keys(selectedSession.zone_stats).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-center">Zone Breakdown</h3>
                  
                  {/* Court with Zone Stats */}
                  <div className="relative">
                    <div
                      className="relative w-full rounded-lg border-2 border-gray-300 overflow-hidden bg-black"
                      style={{ aspectRatio: "1 / 1" }}
                    >
                      {/* Background court image */}
                      <img
                        src="/images/half-court.png"
                        alt="Basketball Court"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Interactive SVG zones overlay */}
                      <svg
                        viewBox="0 0 100 100"
                        className="absolute inset-0 w-full h-full"
                        preserveAspectRatio="none"
                      >
                        {getCourtZones().map((zone) => {
                          const stats = selectedSession.zone_stats[zone.id];
                          const hasStats = stats && stats.attempts > 0;
                          const percentage = hasStats
                            ? ((stats.made / stats.attempts) * 100).toFixed(0)
                            : "0";

                          return (
                            <g key={zone.id}>
                              {/* Zone area */}
                              <path
                                d={zone.path}
                                fill={
                                  hasStats
                                    ? zone.color
                                    : "rgba(255, 255, 255, 0.05)"
                                }
                                stroke="rgba(255, 255, 255, 0.3)"
                                strokeWidth="0.2"
                              />

                              {/* Zone stats text */}
                              {hasStats && (
                                <>
                                  <text
                                    x={getZoneLabelPosition(zone.id).x}
                                    y={getZoneLabelPosition(zone.id).y}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="4"
                                    fontWeight="bold"
                                    className="pointer-events-none"
                                    style={{
                                      textShadow: "0 0 3px rgba(0,0,0,0.8)",
                                    }}
                                  >
                                    {stats.made}-{stats.attempts}
                                  </text>
                                  <text
                                    x={getZoneLabelPosition(zone.id).x}
                                    y={getZoneLabelPosition(zone.id).y + 5}
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="3.5"
                                    fontWeight="bold"
                                    className="pointer-events-none"
                                    style={{
                                      textShadow: "0 0 3px rgba(0,0,0,0.8)",
                                    }}
                                  >
                                    {percentage}%
                                  </text>
                                </>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Best Zone Highlight */}
                  {(() => {
                    const bestZone = Object.entries(selectedSession.zone_stats).reduce(
                      (best, [zoneId, stats]) => {
                        if (stats.attempts === 0) return best;
                        const percentage = (stats.made / stats.attempts) * 100;
                        if (!best || percentage > best.percentage) {
                          const zoneName = getCourtZones().find((z) => z.id === zoneId)?.name;
                          return {
                            name: zoneName,
                            percentage,
                            made: stats.made,
                            attempts: stats.attempts,
                          };
                        }
                        return best;
                      },
                      null
                    );

                    return bestZone ? (
                      <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                        <div className="text-lg font-bold text-purple-800 mb-1">
                          🏆 Best Zone
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          {bestZone.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          {bestZone.made}-{bestZone.attempts} ({bestZone.percentage.toFixed(0)}%)
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Missed Shots:</span>
                  <span className="font-semibold text-red-600">
                    {selectedSession.total_shots - selectedSession.made_shots}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowSessionDialog(false)}
            className="w-full"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-purple-500" />
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update your profile information and photo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-purple-200">
                  <AvatarImage src={editForm.avatar_url || ""} />
                  <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-2xl">
                    {editForm.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "P"}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 w-8 h-8 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>
              <p className="text-sm text-gray-500">Click the camera to upload a photo</p>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter your name"
              />
            </div>

            {/* Favorite Position */}
            <div className="space-y-2">
              <Label htmlFor="favorite_position">Favorite Position</Label>
              <Select
                value={editForm.favorite_position}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, favorite_position: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
