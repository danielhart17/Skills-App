import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShootingSession, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SessionVideoUpload from "@/components/SessionVideoUpload";
import BetaBadge from "@/components/BetaBadge";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import {
  Target,
  Play,
  Pause,
  Square,
  RotateCcw,
  Award,
  CheckCircle2,
  Upload,
} from "lucide-react";

const LIVE_TRACKER_ENABLED = FEATURE_FLAGS.LIVE_SHOOTING_SESSION_TRACKER;

// Define court zones matching the reference screenshot
// Court orientation: Hoop at TOP (Y=0), Half-court at BOTTOM (Y=100)
const COURT_ZONES = [
  {
    id: "left-corner",
    name: "Left Corner",
    color: "rgba(128, 128, 128, 0.5)", // Gray
    hoverColor: "rgba(128, 128, 128, 0.7)",
    path: "M 0 5 L 0 40 L 10.5 35 Q 7.5 30 8 5 Z", // Top left corner
  },
  {
    id: "right-corner",
    name: "Right Corner",
    color: "rgba(128, 128, 128, 0.5)", // Gray
    hoverColor: "rgba(128, 128, 128, 0.7)",
    path: "M 92 5 Q 92.5 30 89.5 35 L 100 40 L 100 5 Z", // Top right corner
  },
  {
    id: "left-mid",
    name: "Left Mid",
    color: "rgba(59, 130, 246, 0.5)", // Blue
    hoverColor: "rgba(59, 130, 246, 0.7)",
    path: "M 8 5 Q 7.5 30 10.5 35 L 25 28 L 25 5 Z", // Left wing/elbow
  },
  {
    id: "right-mid",
    name: "Right Mid",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 75 5 L 75 28 L 89.5 35 Q 92.5 30  92 5 Z", // Right wing/elbow
  },
  {
    id: "left-inside",
    name: "Left Inside",
    color: "rgba(59, 130, 246, 0.5)", // Blue
    hoverColor: "rgba(59, 130, 246, 0.7)",
    path: "M 25 5 L 40 5 Q 39 21 43 24 L 30 36 Q 25 31 25 27 L 25 5 Z", // Left wing/elbow
  },
  {
    id: "inside",
    name: "Inside",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 43 24 Q 50 29.5 57 24 L 70 36 Q 67.5 39 63 41 Q 50 44.5 37 41 Q 32.5 39 30 36 L 43 24 Z", // Free throw circle area
  },
  {
    id: "right-inside",
    name: "Right Inside",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 75 5 L 60 5 Q 61 21 57 24 L 70 36 Q 75 31 75 27  L 75 5 Z", // Right wing/elbow
  },
  {
    id: "restricted",
    name: "Restricted Area",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 40 5 L 40 17 A 3 3 0 1 0 60 17 L 60 5 Z", // Center paint/restricted
  },
  {
    id: "top-key",
    name: "Top of Key",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 30 55 L 20 100 L 80 100 L 70 55 Q 50 64 30 55 Z", // Top of key area
  },
  {
    id: "free-throw",
    name: "Free Throw",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 37 41 L 30 55 Q 50 64 70 55 L 63 41 Q 50 45 37 41 Z", // Free throw circle area
  },
  {
    id: "left-elbow",
    name: "Left Elbow",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 10.5 35 L 25 28 Q 27 35 37 41 L 30 55 Q 18 50 10.5 35 Z", // Left mid-range
  },
  {
    id: "right-elbow",
    name: "Right Elbow",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 89.5 35 L 75 28 Q 73 35 63 41 L 70 55 Q 82 50 89.5 35 Z", // Right baseline area
  },
  {
    id: "left-wing",
    name: "Left Wing",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 10.5 35 L 0 40 L 0 100 L 20 100 L 30 55 Q 18 50 10.5 35 Z", // Left mid-range
  },
  {
    id: "right-wing",
    name: "Right Wing",
    color: "rgba(239, 68, 68, 0.5)", // Red
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 89.5 35 L 100 40 L 100 100 L 80 100 L 70 55 Q 82 50 89.5 35 Z", // Right mid-range
  },
];

export default function ShootingSessionPage() {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [shots, setShots] = useState([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedZone, setSelectedZone] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [zoneStats, setZoneStats] = useState({});
  const courtRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isActive]);

  const handleZoneClick = (zoneId) => {
    if (!isActive) return;
    setSelectedZone(zoneId);
  };

  const recordShot = (made) => {
    if (!selectedZone) return;

    const newShot = {
      zone: selectedZone,
      made,
      timestamp: new Date().toISOString(),
    };

    setShots((prev) => [...prev, newShot]);

    // Update zone stats
    setZoneStats((prev) => {
      const current = prev[selectedZone] || { made: 0, attempts: 0 };
      return {
        ...prev,
        [selectedZone]: {
          made: current.made + (made ? 1 : 0),
          attempts: current.attempts + 1,
        },
      };
    });

    setSelectedZone(null);
  };

  const startSession = () => {
    setIsActive(true);
    setShots([]);
    setSessionTime(0);
    setZoneStats({});
    setSelectedZone(null);
  };

  const pauseSession = () => {
    setIsActive(false);
  };

  const endSession = async () => {
    setIsActive(false);

    if (shots.length > 0) {
      const madeShots = shots.filter((shot) => shot.made).length;
      const percentage = (madeShots / shots.length) * 100;

      // Get best zone stats
      const bestZone = Object.entries(zoneStats).reduce(
        (best, [zoneId, stats]) => {
          const zonePercentage = (stats.made / stats.attempts) * 100;
          if (!best || zonePercentage > best.percentage) {
            const zoneName = COURT_ZONES.find((z) => z.id === zoneId)?.name;
            return {
              name: zoneName,
              percentage: zonePercentage,
              made: stats.made,
              attempts: stats.attempts,
            };
          }
          return best;
        },
        null
      );

      try {
        const user = await User.me();
        await ShootingSession.create({
          user_id: user.id,
          date: new Date().toISOString().split("T")[0],
          shots_data: shots,
          zone_stats: zoneStats, // Save zone stats
          total_shots: shots.length,
          made_shots: madeShots,
          shooting_percentage: percentage,
          duration_seconds: sessionTime,
        });

        // Show summary dialog
        setSessionSummary({
          totalShots: shots.length,
          madeShots,
          percentage: percentage.toFixed(1),
          duration: formatTime(sessionTime),
          bestZone,
        });
        setShowSummary(true);
      } catch (error) {
        console.error("Error saving session:", error);
      }
    }
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    setSessionSummary(null);
    resetSession();
    navigate("/home");
  };

  const resetSession = () => {
    setIsActive(false);
    setShots([]);
    setSessionTime(0);
    setSelectedZone(null);
    setZoneStats({});
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const getMadeShots = () => shots.filter((shot) => shot.made).length;
  const getPercentage = () =>
    shots.length > 0 ? Math.round((getMadeShots() / shots.length) * 100) : 0;

  // // Helper function to get approximate center X of a zone path
  // const getZoneCenterX = (path) => {
  //   // Extract numbers from path and average the X coordinates
  //   const coords = path.match(/\d+/g);
  //   if (!coords || coords.length === 0) return 50;
  //   const xCoords = coords.filter((_, i) => i % 2 === 0).map(Number);
  //   return xCoords.reduce((a, b) => a + b, 0) / xCoords.length;
  // };

  // // Helper function to get approximate center Y of a zone path
  // const getZoneCenterY = (path) => {
  //   // Extract numbers from path and average the Y coordinates
  //   const coords = path.match(/\d+/g);
  //   if (!coords || coords.length === 0) return 50;
  //   const yCoords = coords.filter((_, i) => i % 2 === 1).map(Number);
  //   return yCoords.reduce((a, b) => a + b, 0) / yCoords.length;
  // };

  // Around line 145, replace the helper functions with:
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

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-white">
              {LIVE_TRACKER_ENABLED
                ? "Live Shooting Session"
                : "Shooting Session"}
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {LIVE_TRACKER_ENABLED
              ? "Track your shooting performance in real-time or upload a practice video for AI-assisted review"
              : "Upload a practice video for AI-assisted review"}
          </p>
        </div>

        <Tabs
          defaultValue={LIVE_TRACKER_ENABLED ? "manual" : "upload"}
          className="space-y-8"
        >
          {LIVE_TRACKER_ENABLED && (
            <div className="flex justify-center">
              <TabsList className="grid w-full max-w-xl grid-cols-2 h-auto p-1">
                <TabsTrigger
                  value="manual"
                  className="flex items-center gap-2 py-2.5"
                >
                  <Target className="w-4 h-4" />
                  Live Manual Tracking
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  className="flex items-center gap-2 py-2.5"
                >
                  <Upload className="w-4 h-4" />
                  Upload Video
                  <BetaBadge />
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {LIVE_TRACKER_ENABLED && (
          <TabsContent value="manual">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Basketball Court */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Interactive Court</span>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="px-3 py-1"
                  >
                    {isActive ? "🔴 LIVE" : "⭕ PAUSED"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div
                    ref={courtRef}
                    className={`relative w-full rounded-lg border-2 border-gray-300 ${
                      isActive ? "cursor-pointer" : "cursor-not-allowed"
                    } overflow-hidden bg-black`}
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
                      {COURT_ZONES.map((zone) => {
                        const stats = zoneStats[zone.id];
                        const isSelected = selectedZone === zone.id;
                        const isHovered = hoveredZone === zone.id;
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
                                isSelected
                                  ? "rgba(59, 130, 246, 0.8)"
                                  : isHovered
                                  ? zone.hoverColor
                                  : hasStats
                                  ? zone.color
                                  : "rgba(255, 255, 255, 0.1)"
                              }
                              stroke={
                                isSelected || isHovered
                                  ? "#ffffff"
                                  : "rgba(255, 255, 255, 0.3)"
                              }
                              strokeWidth={isSelected ? "0.5" : "0.2"}
                              className={`transition-all duration-200 ${
                                isActive ? "cursor-pointer" : ""
                              }`}
                              onClick={() => handleZoneClick(zone.id)}
                              onMouseEnter={() => setHoveredZone(zone.id)}
                              onMouseLeave={() => setHoveredZone(null)}
                            />

                            {/* Zone stats text */}
                            {hasStats && (
                              <>
                                <text
                                  // x={getZoneCenterX(zone.path)}
                                  // y={getZoneCenterY(zone.path) - 2}
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
                                  // x={getZoneCenterX(zone.path)}
                                  // y={getZoneCenterY(zone.path) + 3}
                                  x={getZoneLabelPosition(zone.id).x}
                                  y={getZoneLabelPosition(zone.id).y + 5} // 5 units below the made-attempts
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

                    {/* Instructions overlay */}
                    {!isActive && shots.length === 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <Target className="w-12 h-12 mx-auto mb-4" />
                          <h3 className="text-xl font-bold mb-2">
                            Start Your Session
                          </h3>
                          <p className="text-sm opacity-90">
                            Click start to begin tracking shots by zone
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Selected zone indicator */}
                    {selectedZone && isActive && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
                        <p className="font-bold">
                          {COURT_ZONES.find((z) => z.id === selectedZone)?.name}
                        </p>
                        <p className="text-xs">Did you make the shot?</p>
                      </div>
                    )}
                  </div>

                  {/* Shot recording buttons */}
                  {selectedZone && isActive && (
                    <div className="flex justify-center gap-4 mt-4">
                      <Button
                        onClick={() => recordShot(true)}
                        className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg"
                      >
                        ✅ Made
                      </Button>
                      <Button
                        onClick={() => recordShot(false)}
                        className="bg-red-500 hover:bg-red-600 text-white px-8 py-6 text-lg"
                      >
                        ❌ Miss
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats & Controls */}
          <div className="space-y-6">
            {/* Session Stats */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Session Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {shots.length}
                    </div>
                    <div className="text-sm text-blue-800">Total Shots</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {getMadeShots()}
                    </div>
                    <div className="text-sm text-green-800">Made</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {getPercentage()}%
                    </div>
                    <div className="text-sm text-orange-800">Accuracy</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatTime(sessionTime)}
                    </div>
                    <div className="text-sm text-purple-800">Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Controls */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isActive && shots.length === 0 && (
                  <Button
                    onClick={startSession}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Session
                  </Button>
                )}

                {isActive && (
                  <>
                    <Button
                      onClick={pauseSession}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause Session
                    </Button>
                    <Button
                      onClick={endSession}
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      End Session
                    </Button>
                  </>
                )}

                {!isActive && shots.length > 0 && (
                  <>
                    <Button
                      onClick={() => setIsActive(true)}
                      className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                    <Button
                      onClick={endSession}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Save Session
                    </Button>
                  </>
                )}

                <Button
                  onClick={resetSession}
                  variant="outline"
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader>
                <CardTitle className="text-lg text-orange-800">
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-orange-700 space-y-2">
                <p>• Click any zone on the court to select it</p>
                <p>• Mark each shot as Made (✅) or Miss (❌)</p>
                <p>• Stats update in real-time for each zone</p>
                <p>• Hover over zones to highlight them</p>
                <p>• Session data saves automatically when you finish</p>
              </CardContent>
            </Card>
          </div>
            </div>
          </TabsContent>
          )}

          <TabsContent value="upload">
            <SessionVideoUpload />
          </TabsContent>
        </Tabs>
      </div>

      {/* Session Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              Session Complete!
            </DialogTitle>
            <DialogDescription>
              Great work! Here&apos;s your session summary.
            </DialogDescription>
          </DialogHeader>

          {sessionSummary && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {sessionSummary.totalShots}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Shots</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {sessionSummary.madeShots}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Made Shots</div>
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                <div className="text-5xl font-bold text-orange-600">
                  {sessionSummary.percentage}%
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Overall Shooting Percentage
                </div>
              </div>

              {sessionSummary.bestZone && (
                <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-300">
                  <div className="text-lg font-bold text-purple-800 mb-1">
                    🏆 Best Zone
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {sessionSummary.bestZone.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    {sessionSummary.bestZone.made}-
                    {sessionSummary.bestZone.attempts} (
                    {sessionSummary.bestZone.percentage.toFixed(0)}%)
                  </div>
                </div>
              )}

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">
                  {sessionSummary.duration}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Session Duration
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleCloseSummary}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
          >
            Back to Home
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
