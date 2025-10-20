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
import {
  Target,
  Play,
  Pause,
  Square,
  RotateCcw,
  Award,
  CheckCircle2,
} from "lucide-react";

export default function ShootingSessionPage() {
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [shots, setShots] = useState([]);
  const [sessionTime, setSessionTime] = useState(0);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
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

  const handleCourtClick = (event) => {
    if (!isActive) return;

    const rect = courtRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setSelectedSpot({ x, y });
  };

  const recordShot = (made) => {
    if (!selectedSpot) return;

    const newShot = {
      x: selectedSpot.x,
      y: selectedSpot.y,
      made,
      timestamp: new Date().toISOString(),
    };

    setShots((prev) => [...prev, newShot]);
    setSelectedSpot(null);
  };

  const startSession = () => {
    setIsActive(true);
    setShots([]);
    setSessionTime(0);
  };

  const pauseSession = () => {
    setIsActive(false);
  };

  const endSession = async () => {
    setIsActive(false);

    if (shots.length > 0) {
      const madeShots = shots.filter((shot) => shot.made).length;
      const percentage = (madeShots / shots.length) * 100;

      try {
        const user = await User.me();
        await ShootingSession.create({
          user_id: user.id,
          date: new Date().toISOString().split("T")[0],
          shots_data: shots,
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
    navigate("/Home");
  };

  const resetSession = () => {
    setIsActive(false);
    setShots([]);
    setSessionTime(0);
    setSelectedSpot(null);
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

  const getZoneColor = (shot) => {
    return shot.made ? "bg-green-500" : "bg-red-500";
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
              Live Shooting Session
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track your shooting performance in real-time
          </p>
        </div>

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
                    onClick={handleCourtClick}
                    className={`relative w-full bg-orange-200 rounded-lg border-2 border-orange-800 ${
                      isActive ? "cursor-crosshair" : "cursor-not-allowed"
                    } overflow-hidden`}
                    style={{ aspectRatio: "94 / 85" }} // Realistic half-court aspect ratio
                  >
                    {/* SVG Court Lines based on reference image */}
                    <svg
                      viewBox="0 0 940 850"
                      className="absolute inset-0 w-full h-full"
                      preserveAspectRatio="none"
                    >
                      <g stroke="#FF6B35" strokeWidth="8" fill="none">
                        {/* The Key / Paint */}
                        <rect
                          x="310"
                          y="0"
                          width="320"
                          height="380"
                          fill="rgba(255, 107, 53, 0.15)"
                        />
                        {/* Free Throw Circle */}
                        <circle cx="470" cy="380" r="120" strokeWidth="8" />
                        {/* Free Throw Line */}
                        <line
                          x1="310"
                          y1="380"
                          x2="630"
                          y2="380"
                          strokeWidth="8"
                        />
                        {/* 3-Point Line - Curved arc at bottom */}
                        <path d="M 50 260 Q 475 800, 875 260" strokeWidth="8" />
                        <line x1="50" y1="0" x2="50" y2="262" />
                        <line x1="875" y1="0" x2="875" y2="262" />
                        {/* Key Hash Marks */}
                        <g strokeWidth="6">
                          <line x1="310" y1="140" x2="290" y2="140" />
                          <line x1="310" y1="190" x2="290" y2="190" />
                          <line x1="310" y1="240" x2="290" y2="240" />

                          <line x1="630" y1="140" x2="650" y2="140" />
                          <line x1="630" y1="190" x2="650" y2="190" />
                          <line x1="630" y1="240" x2="650" y2="240" />
                        </g>
                      </g>

                      {/* Hoop and Backboard */}
                      <g>
                        <rect
                          x="390"
                          y="60"
                          width="160"
                          height="4"
                          fill="rgba(0,0,0,0.2)"
                        />
                        <line
                          x1="470"
                          y1="64"
                          x2="470"
                          y2="88"
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="470"
                          cy="105"
                          r="15"
                          fill="none"
                          stroke="#FF6B35"
                          strokeWidth="6"
                        />
                      </g>
                    </svg>

                    {/* Shot markers */}
                    {shots.map((shot, index) => (
                      <div
                        key={index}
                        className={`absolute w-3 h-3 rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 ${getZoneColor(
                          shot
                        )}`}
                        style={{
                          left: `${shot.x}%`,
                          top: `${shot.y}%`,
                        }}
                      />
                    ))}

                    {/* Selected spot indicator */}
                    {selectedSpot && (
                      <div
                        className="absolute w-6 h-6 border-4 border-blue-500 rounded-full bg-blue-200/50 transform -translate-x-1/2 -translate-y-1/2 animate-pulse"
                        style={{
                          left: `${selectedSpot.x}%`,
                          top: `${selectedSpot.y}%`,
                        }}
                      />
                    )}

                    {/* Instructions overlay */}
                    {!isActive && shots.length === 0 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <Target className="w-12 h-12 mx-auto mb-4" />
                          <h3 className="text-xl font-bold mb-2">
                            Start Your Session
                          </h3>
                          <p className="text-sm opacity-90">
                            Click start to begin tracking shots
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shot recording buttons */}
                  {selectedSpot && isActive && (
                    <div className="flex justify-center gap-4 mt-4">
                      <Button
                        onClick={() => recordShot(true)}
                        className="bg-green-500 hover:bg-green-600 text-white px-8"
                      >
                        ✅ Made
                      </Button>
                      <Button
                        onClick={() => recordShot(false)}
                        className="bg-red-500 hover:bg-red-600 text-white px-8"
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
                <p>
                  • Click anywhere on the court to mark your shooting position
                </p>
                <p>• Track makes and misses to build your shot chart</p>
                <p>• Green dots = made shots, Red dots = misses</p>
                <p>• Session data saves automatically when you finish</p>
              </CardContent>
            </Card>
          </div>
        </div>
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
                  Shooting Percentage
                </div>
              </div>

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
