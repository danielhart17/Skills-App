import { useCallback, useEffect, useRef, useState } from "react";
import { Run } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import BetaBadge from "@/components/BetaBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import {
  currentPaceFromRecentPath,
  formatDistanceMiles,
  formatDuration,
  formatPace,
  haversineMeters,
  metersToMiles,
  paceMinPerMileFromMeters,
  releaseScreenWakeLock,
  requestLocationPermission,
  requestScreenWakeLock,
  shouldKeepGpsPoint,
  startGeolocationWatch,
} from "@/utils/runTracking";
import {
  Activity,
  AlertCircle,
  Clock,
  Gauge,
  History,
  Loader2,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  Save,
  Square,
  Trash2,
} from "lucide-react";

const STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  PAUSED: "paused",
  SUMMARY: "summary",
};

function formatStoredDistance(miles) {
  return (Number(miles) || 0).toFixed(2);
}

function RunStatsGrid({ distanceLabel, durationSeconds, avgPace }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
      <div className="rounded-xl bg-black/30 p-4">
        <p className="text-xs text-gray-400 mb-1">Distance</p>
        <p className="text-2xl font-bold text-white">{distanceLabel}</p>
      </div>
      <div className="rounded-xl bg-black/30 p-4">
        <p className="text-xs text-gray-400 mb-1">Moving time</p>
        <p className="text-2xl font-bold text-white">
          {formatDuration(durationSeconds)}
        </p>
      </div>
      <div className="rounded-xl bg-black/30 p-4 col-span-2 sm:col-span-1">
        <p className="text-xs text-gray-400 mb-1">Avg pace</p>
        <p className="text-2xl font-bold text-brand-orange">
          {formatPace(avgPace)}
        </p>
        <p className="text-xs text-gray-500">min/mi</p>
      </div>
    </div>
  );
}

export default function RunTracker() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("track");
  const [permissionStatus, setPermissionStatus] = useState("checking");
  const [permissionMessage, setPermissionMessage] = useState("");
  const [status, setStatus] = useState(STATUS.IDLE);

  const [path, setPath] = useState([]);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [movingSeconds, setMovingSeconds] = useState(0);
  const [currentPace, setCurrentPace] = useState(null);
  const [avgPace, setAvgPace] = useState(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [trackingError, setTrackingError] = useState("");
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);

  const pathRef = useRef([]);
  const distanceMetersRef = useRef(0);
  const accumulatedMsRef = useRef(0);
  const segmentStartedAtRef = useRef(null);
  const watchCleanupRef = useRef(null);
  const wakeLockRef = useRef(null);
  const tickRef = useRef(null);
  const startedAtRef = useRef(null);

  const clearWatch = () => {
    if (watchCleanupRef.current) {
      watchCleanupRef.current();
      watchCleanupRef.current = null;
    }
  };

  const clearTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const dropWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    await releaseScreenWakeLock(lock);
  }, []);

  const acquireWakeLock = useCallback(async () => {
    await dropWakeLock();
    wakeLockRef.current = await requestScreenWakeLock();
  }, [dropWakeLock]);

  const recomputeStats = useCallback((nextPath, nextMovingSeconds) => {
    setCurrentPace(currentPaceFromRecentPath(nextPath, 30));
    setAvgPace(
      paceMinPerMileFromMeters(distanceMetersRef.current, nextMovingSeconds)
    );
  }, []);

  const getMovingSecondsNow = useCallback(() => {
    const liveMs =
      accumulatedMsRef.current +
      (segmentStartedAtRef.current
        ? Date.now() - segmentStartedAtRef.current
        : 0);
    return Math.floor(liveMs / 1000);
  }, []);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = window.setInterval(() => {
      const seconds = getMovingSecondsNow();
      setMovingSeconds(seconds);
      recomputeStats(pathRef.current, seconds);
    }, 1000);
  }, [getMovingSecondsNow, recomputeStats]);

  const handlePoint = useCallback(
    (point) => {
      setGpsReady(true);
      setTrackingError("");

      const previous = pathRef.current[pathRef.current.length - 1] || null;
      if (!shouldKeepGpsPoint(point, previous)) {
        return;
      }

      const kept = {
        lat: point.lat,
        lng: point.lng,
        t: point.t,
        accuracy: point.accuracy,
      };

      if (previous) {
        distanceMetersRef.current += haversineMeters(previous, kept);
        setDistanceMeters(distanceMetersRef.current);
      }

      const nextPath = [...pathRef.current, kept];
      pathRef.current = nextPath;
      setPath(nextPath);
      recomputeStats(nextPath, getMovingSecondsNow());
    },
    [getMovingSecondsNow, recomputeStats]
  );

  const handleGpsError = useCallback((error) => {
    setTrackingError(error.message || "Location error");
  }, []);

  const checkPermission = useCallback(async () => {
    setPermissionStatus("checking");
    setPermissionMessage("");
    try {
      const result = await requestLocationPermission();
      if (result.ok) {
        setPermissionStatus("granted");
        setPermissionMessage("");
      } else {
        setPermissionStatus("denied");
        setPermissionMessage(
          result.message || "Location access is required to track runs."
        );
      }
    } catch {
      setPermissionStatus("denied");
      setPermissionMessage(
        "Location access is required to track runs. Tap Retry to try again."
      );
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!user?.id) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    try {
      const rows = await Run.list();
      setHistory(rows || []);
    } catch (error) {
      console.error("Failed to load runs:", error);
      toast({
        title: "Could not load run history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === "visible" && status === STATUS.RUNNING) {
        await acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [status, acquireWakeLock]);

  useEffect(() => {
    return () => {
      clearWatch();
      clearTick();
      releaseScreenWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
    };
  }, []);

  const startRun = async () => {
    if (!user?.id) {
      setTrackingError("You must be signed in to track a run.");
      return;
    }
    if (permissionStatus !== "granted") {
      await checkPermission();
      return;
    }

    pathRef.current = [];
    distanceMetersRef.current = 0;
    accumulatedMsRef.current = 0;
    segmentStartedAtRef.current = Date.now();
    startedAtRef.current = new Date();

    setPath([]);
    setDistanceMeters(0);
    setMovingSeconds(0);
    setCurrentPace(null);
    setAvgPace(null);
    setGpsReady(false);
    setTrackingError("");
    setSummary(null);
    setStatus(STATUS.RUNNING);
    setActiveTab("track");

    clearWatch();
    watchCleanupRef.current = startGeolocationWatch({
      onPoint: handlePoint,
      onError: handleGpsError,
    });
    startTick();
    await acquireWakeLock();
  };

  const pauseRun = async () => {
    if (status !== STATUS.RUNNING) return;

    if (segmentStartedAtRef.current) {
      accumulatedMsRef.current += Date.now() - segmentStartedAtRef.current;
      segmentStartedAtRef.current = null;
    }

    clearWatch();
    clearTick();
    setMovingSeconds(Math.floor(accumulatedMsRef.current / 1000));
    setStatus(STATUS.PAUSED);
    await dropWakeLock();
  };

  const resumeRun = async () => {
    if (status !== STATUS.PAUSED) return;

    segmentStartedAtRef.current = Date.now();
    setStatus(STATUS.RUNNING);
    setTrackingError("");

    clearWatch();
    watchCleanupRef.current = startGeolocationWatch({
      onPoint: handlePoint,
      onError: handleGpsError,
    });
    startTick();
    await acquireWakeLock();
  };

  const stopRun = async () => {
    if (status !== STATUS.RUNNING && status !== STATUS.PAUSED) return;

    if (segmentStartedAtRef.current) {
      accumulatedMsRef.current += Date.now() - segmentStartedAtRef.current;
      segmentStartedAtRef.current = null;
    }

    clearWatch();
    clearTick();
    await dropWakeLock();

    const durationSeconds = Math.max(
      0,
      Math.floor(accumulatedMsRef.current / 1000)
    );
    const meters = distanceMetersRef.current;
    const avg = paceMinPerMileFromMeters(meters, durationSeconds);

    setMovingSeconds(durationSeconds);
    setAvgPace(avg);
    setSummary({
      distanceMeters: meters,
      durationSeconds,
      avgPace: avg,
      pointCount: pathRef.current.length,
      startedAt: startedAtRef.current,
      endedAt: new Date(),
      path: pathRef.current,
    });
    setStatus(STATUS.SUMMARY);
  };

  const resetToIdle = () => {
    pathRef.current = [];
    distanceMetersRef.current = 0;
    accumulatedMsRef.current = 0;
    segmentStartedAtRef.current = null;
    startedAtRef.current = null;
    setPath([]);
    setDistanceMeters(0);
    setMovingSeconds(0);
    setCurrentPace(null);
    setAvgPace(null);
    setGpsReady(false);
    setTrackingError("");
    setSummary(null);
    setSaving(false);
    setStatus(STATUS.IDLE);
  };

  const discardRun = () => {
    resetToIdle();
    toast({
      title: "Run discarded",
      description: "This run was not saved.",
    });
  };

  const saveRun = async () => {
    if (!summary || !user?.id || saving) return;

    setSaving(true);
    setTrackingError("");

    try {
      const distanceMiles = metersToMiles(summary.distanceMeters);

      await Run.create({
        started_at:
          summary.startedAt?.toISOString() ||
          summary.endedAt?.toISOString() ||
          new Date().toISOString(),
        ended_at: summary.endedAt?.toISOString() || new Date().toISOString(),
        duration_seconds: summary.durationSeconds,
        distance_miles: Number(distanceMiles.toFixed(4)),
        avg_pace_min_per_mile:
          summary.avgPace != null ? Number(summary.avgPace.toFixed(3)) : null,
        max_speed_mph: null,
        path: summary.path || [],
      });

      toast({
        title: "Run saved",
        description: `${formatDistanceMiles(summary.distanceMeters)} mi · ${formatDuration(
          summary.durationSeconds
        )}`,
      });

      resetToIdle();
      await loadHistory();
      setActiveTab("history");
    } catch (error) {
      console.error("Failed to save run:", error);
      setTrackingError(error.message || "Could not save run.");
      toast({
        title: "Could not save run",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const isTracking = status === STATUS.RUNNING || status === STATUS.PAUSED;

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-white">Run Tracker</h1>
            <BetaBadge />
          </div>
          <p className="text-brand-lightGray">
            Live GPS tracking — miles &amp; min/mile pace
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-black/30">
            <TabsTrigger value="track" className="data-[state=active]:bg-brand-orange">
              <Activity className="w-4 h-4 mr-2" />
              Track
            </TabsTrigger>
            <TabsTrigger
              value="history"
              disabled={isTracking || status === STATUS.SUMMARY}
              className="data-[state=active]:bg-brand-orange"
            >
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="track" className="space-y-6 mt-6">
            {permissionStatus === "checking" && (
              <Card className="border-0 shadow-xl bg-card">
                <CardContent className="py-8 text-center text-gray-400">
                  Checking location permission…
                </CardContent>
              </Card>
            )}

            {permissionStatus === "denied" && (
              <Card className="border-0 shadow-xl bg-card">
                <CardContent className="py-6 space-y-4">
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      {permissionMessage ||
                        "Location access is required to track runs."}
                    </p>
                  </div>
                  <Button
                    onClick={checkPermission}
                    className="w-full bg-brand-orange hover:bg-orange-600 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Location Access
                  </Button>
                </CardContent>
              </Card>
            )}

            {permissionStatus === "granted" && status !== STATUS.SUMMARY && (
              <Card className="border-0 shadow-xl bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Activity className="w-5 h-5 text-brand-orange" />
                    {status === STATUS.IDLE && "Ready to run"}
                    {status === STATUS.RUNNING && "Run in progress"}
                    {status === STATUS.PAUSED && "Paused"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-xl bg-black/30 p-4">
                      <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3" /> Distance
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {formatDistanceMiles(distanceMeters)}
                      </p>
                      <p className="text-xs text-gray-500">mi</p>
                    </div>
                    <div className="rounded-xl bg-black/30 p-4">
                      <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> Time
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {formatDuration(movingSeconds)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/30 p-4">
                      <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                        <Gauge className="w-3 h-3" /> Current
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {formatPace(currentPace)}
                      </p>
                      <p className="text-xs text-gray-500">min/mi</p>
                    </div>
                    <div className="rounded-xl bg-black/30 p-4">
                      <p className="text-xs text-gray-400 mb-1">Average</p>
                      <p className="text-2xl font-bold text-brand-orange">
                        {formatPace(avgPace)}
                      </p>
                      <p className="text-xs text-gray-500">min/mi</p>
                    </div>
                  </div>

                  {status === STATUS.RUNNING && (
                    <p className="text-center text-sm text-gray-400">
                      {gpsReady
                        ? "GPS locked — keep this tab open while you run."
                        : "Waiting for GPS lock…"}
                    </p>
                  )}

                  {trackingError && (
                    <p className="text-sm text-red-300 text-center rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      {trackingError}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    {status === STATUS.IDLE && (
                      <Button
                        onClick={startRun}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    )}

                    {status === STATUS.RUNNING && (
                      <>
                        <Button
                          onClick={pauseRun}
                          variant="outline"
                          className="flex-1 border-gray-600 text-white"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                        <Button
                          onClick={stopRun}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop
                        </Button>
                      </>
                    )}

                    {status === STATUS.PAUSED && (
                      <>
                        <Button
                          onClick={resumeRun}
                          className="flex-1 bg-brand-orange hover:bg-orange-600 text-white"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </Button>
                        <Button
                          onClick={stopRun}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Square className="w-4 h-4 mr-2" />
                          Stop
                        </Button>
                      </>
                    )}
                  </div>

                  {!isTracking && (
                    <p className="text-xs text-gray-500 text-center">
                      Uses browser GPS. Paused time does not count toward
                      duration or pace. Best outdoors with a strong signal.
                    </p>
                  )}

                  {isTracking && path.length > 0 && (
                    <p className="text-xs text-gray-500 text-center">
                      {path.length} GPS point{path.length === 1 ? "" : "s"} kept
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {status === STATUS.SUMMARY && summary && (
              <Card className="border-0 shadow-xl bg-card">
                <CardHeader>
                  <CardTitle className="text-white">Run Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RunStatsGrid
                    distanceLabel={`${formatDistanceMiles(
                      summary.distanceMeters
                    )} mi`}
                    durationSeconds={summary.durationSeconds}
                    avgPace={summary.avgPace}
                  />

                  <p className="text-sm text-gray-400 text-center">
                    {summary.pointCount} GPS point
                    {summary.pointCount === 1 ? "" : "s"} recorded
                  </p>

                  {trackingError && (
                    <p className="text-sm text-red-300 text-center rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      {trackingError}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={discardRun}
                      disabled={saving}
                      variant="outline"
                      className="flex-1 border-gray-600 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Discard
                    </Button>
                    <Button
                      onClick={saveRun}
                      disabled={saving}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="border-0 shadow-xl bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <History className="w-5 h-5 text-brand-orange" />
                  Run History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="py-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading runs…
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No saved runs yet. Finish a run and tap Save to see it here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((run) => (
                      <button
                        key={run.id}
                        type="button"
                        onClick={() => setSelectedRun(run)}
                        className="w-full text-left rounded-xl border border-gray-700 bg-black/20 p-4 hover:border-brand-orange/50 hover:bg-brand-orange/5 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <p className="font-medium text-white">
                            {new Date(run.started_at).toLocaleString()}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <p className="text-gray-400 text-xs">Distance</p>
                              <p className="text-white font-semibold">
                                {formatStoredDistance(run.distance_miles)} mi
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Time</p>
                              <p className="text-white font-semibold">
                                {formatDuration(run.duration_seconds)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Avg pace</p>
                              <p className="text-brand-orange font-semibold">
                                {formatPace(
                                  run.avg_pace_min_per_mile != null
                                    ? Number(run.avg_pace_min_per_mile)
                                    : null
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog
          open={Boolean(selectedRun)}
          onOpenChange={(open) => {
            if (!open) setSelectedRun(null);
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Run Details</DialogTitle>
            </DialogHeader>

            {selectedRun && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-gray-400 text-center">
                  {new Date(selectedRun.started_at).toLocaleString()}
                </p>

                <RunStatsGrid
                  distanceLabel={`${formatStoredDistance(
                    selectedRun.distance_miles
                  )} mi`}
                  durationSeconds={selectedRun.duration_seconds}
                  avgPace={
                    selectedRun.avg_pace_min_per_mile != null
                      ? Number(selectedRun.avg_pace_min_per_mile)
                      : null
                  }
                />

                <p className="text-xs text-gray-500 text-center">
                  {(selectedRun.path?.length || 0).toLocaleString()} GPS points
                  saved
                </p>

                <Button
                  onClick={() => setSelectedRun(null)}
                  className="w-full bg-brand-orange hover:bg-orange-600 text-white"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
