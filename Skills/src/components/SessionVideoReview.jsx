import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BetaBadge from "@/components/BetaBadge";
import { COURT_ZONES, getZoneName } from "@/constants/courtZones";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  confirmVideoSession,
  fetchVideoReviewContext,
  formatVideoTimestamp,
  initializeReviewShots,
  summarizeReviewShots,
} from "@/utils/sessionVideoReview";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Save,
  Trash2,
} from "lucide-react";

function resultBadgeClass(result) {
  if (result === "make") return "bg-green-500/20 text-green-300 border-green-500/30";
  if (result === "miss") return "bg-red-500/20 text-red-300 border-red-500/30";
  return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
}

export default function SessionVideoReview({ videoId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoMeta, setVideoMeta] = useState(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [reviewShots, setReviewShots] = useState([]);
  const [selectedShotId, setSelectedShotId] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [savedSummary, setSavedSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReview() {
      if (!videoId || !user?.id) return;

      setLoading(true);
      setErrorMessage("");

      try {
        const context = await fetchVideoReviewContext(videoId, user.id);
        if (cancelled) return;

        setVideoMeta(context.video);
        setSignedUrl(context.signedUrl);
        const initialized = initializeReviewShots(context.shots);
        setReviewShots(initialized);
        setSelectedShotId(initialized[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message || "Could not load review data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReview();

    return () => {
      cancelled = true;
    };
  }, [videoId, user?.id]);

  const summary = useMemo(
    () => summarizeReviewShots(reviewShots),
    [reviewShots]
  );

  const isReadOnly = videoMeta?.status === "complete";

  const updateShot = (shotId, patch) => {
    setReviewShots((current) =>
      current.map((shot) =>
        shot.id === shotId ? { ...shot, ...patch } : shot
      )
    );
  };

  const seekToShot = (shot) => {
    setSelectedShotId(shot.id);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, shot.timestamp_seconds - 0.15);
    video.play().catch(() => {
      video.pause();
    });
  };

  const handleConfirm = async () => {
    if (!user?.id || !videoMeta) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const result = await confirmVideoSession({
        videoId: videoMeta.id,
        userId: user.id,
        reviewedShots: reviewShots,
        durationSeconds: videoMeta.duration_seconds,
      });

      setSavedSummary(result.summary);
      setShowSummary(true);
      setVideoMeta((current) =>
        current ? { ...current, status: "complete" } : current
      );
    } catch (error) {
      setErrorMessage(error.message || "Could not save this session.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-gray-300">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
        Loading review…
      </div>
    );
  }

  if (errorMessage && !videoMeta) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate("/shootingsession")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shooting Session
        </Button>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 flex gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            className="px-0 text-gray-300 hover:text-white"
            onClick={() => navigate("/shootingsession")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Shooting Session
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-2">
            Review AI Shots
            <BetaBadge />
          </h1>
          <p className="text-gray-400 mt-1">
            Scrub the video, verify each detection, then save to your shooting stats.
          </p>
        </div>

        {!isReadOnly && (
          <Button
            onClick={handleConfirm}
            disabled={saving || reviewShots.length === 0}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Confirm & Save Session
              </>
            )}
          </Button>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
          This video review was already saved. You can still watch the clip and inspect the detections below.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <Card className="xl:col-span-3 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-brand-orange" />
              Session Video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {signedUrl ? (
              <video
                ref={videoRef}
                src={signedUrl}
                controls
                playsInline
                className="w-full rounded-xl bg-black"
              />
            ) : (
              <div className="rounded-xl bg-black/40 p-8 text-center text-gray-400">
                Video unavailable
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
              <div className="rounded-lg bg-gray-800/60 p-3">
                <p className="text-xl font-bold text-white">{summary.total}</p>
                <p className="text-gray-400">Active</p>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3">
                <p className="text-xl font-bold text-green-400">{summary.makes}</p>
                <p className="text-gray-400">Makes</p>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3">
                <p className="text-xl font-bold text-red-400">{summary.misses}</p>
                <p className="text-gray-400">Misses</p>
              </div>
              <div className="rounded-lg bg-gray-800/60 p-3">
                <p className="text-xl font-bold text-yellow-400">{summary.unclear}</p>
                <p className="text-gray-400">Unclear</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Detected Shots</CardTitle>
          </CardHeader>
          <CardContent>
            {reviewShots.length === 0 ? (
              <p className="text-gray-400 text-sm">
                No detected shots to review for this video.
              </p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {reviewShots
                  .filter((shot) => !shot.removed)
                  .map((shot, index) => (
                    <div
                      key={shot.id}
                      className={`rounded-xl border p-3 space-y-3 transition-colors ${
                        selectedShotId === shot.id
                          ? "border-brand-orange/60 bg-brand-orange/10"
                          : "border-gray-700 bg-gray-900/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => seekToShot(shot)}
                          className="text-left"
                        >
                          <p className="font-medium text-white">
                            Shot {index + 1}
                          </p>
                          <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {formatVideoTimestamp(shot.timestamp_seconds)}
                          </p>
                        </button>

                        <Badge
                          variant="outline"
                          className={resultBadgeClass(shot.result)}
                        >
                          {shot.result}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {["make", "miss", "unclear"].map((result) => (
                          <Button
                            key={result}
                            type="button"
                            size="sm"
                            variant={shot.result === result ? "default" : "outline"}
                            disabled={isReadOnly}
                            onClick={() => updateShot(shot.id, { result })}
                            className={
                              shot.result === result
                                ? result === "make"
                                  ? "bg-green-600 hover:bg-green-700"
                                  : result === "miss"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-yellow-600 hover:bg-yellow-700"
                                : ""
                            }
                          >
                            {result === "make"
                              ? "Make"
                              : result === "miss"
                                ? "Miss"
                                : "Unclear"}
                          </Button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs text-gray-400">Court zone</p>
                        <Select
                          value={shot.zone}
                          disabled={isReadOnly}
                          onValueChange={(zone) => updateShot(shot.id, { zone })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {COURT_ZONES.map((zone) => (
                              <SelectItem key={zone.id} value={zone.id}>
                                {zone.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>
                          Confidence {(shot.confidence * 100).toFixed(0)}%
                        </span>
                        <span>{getZoneName(shot.zone)}</span>
                      </div>

                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => updateShot(shot.id, { removed: true })}
                          className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove false detection
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 flex gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      )}

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              Session Saved
            </DialogTitle>
            <DialogDescription>
              Your reviewed shots now count toward your shooting stats.
            </DialogDescription>
          </DialogHeader>

          {savedSummary && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {savedSummary.totalShots}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Shots</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {savedSummary.madeShots}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Made Shots</div>
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                <div className="text-5xl font-bold text-orange-600">
                  {savedSummary.percentage}%
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Verified Shooting Percentage
                </div>
              </div>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-700">
                  {savedSummary.duration}
                </div>
                <div className="text-sm text-gray-600 mt-1">Video Duration</div>
              </div>
            </div>
          )}

          <Button
            onClick={() => navigate("/profile")}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
          >
            View in Profile
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
