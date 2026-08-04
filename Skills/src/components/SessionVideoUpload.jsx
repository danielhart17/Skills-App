import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BetaBadge from "@/components/BetaBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  SESSION_VIDEO_ACCEPT,
  SESSION_VIDEO_MAX_BYTES,
  SESSION_VIDEO_MAX_DURATION_SECONDS,
} from "@/utils/sessionVideoConstants";
import {
  uploadSessionVideo,
  validateSessionVideoDuration,
  validateSessionVideoFile,
} from "@/utils/sessionVideoUpload";
import {
  analyzeSessionVideo,
  fetchDetectedShotsSummary,
} from "@/utils/analyzeSessionVideo";
import {
  fetchPendingReviewVideos,
  formatVideoTimestamp,
} from "@/utils/sessionVideoReview";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  FileVideo,
  Loader2,
  ListChecks,
  Upload,
  X,
} from "lucide-react";

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SessionVideoUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const analysisAbortRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadStep, setUploadStep] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const [analysisSummary, setAnalysisSummary] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingReviews() {
      if (!user?.id) return;

      try {
        const rows = await fetchPendingReviewVideos(user.id);
        if (!cancelled) {
          setPendingReviews(rows);
        }
      } catch {
        if (!cancelled) {
          setPendingReviews([]);
        }
      }
    }

    loadPendingReviews();

    return () => {
      cancelled = true;
    };
  }, [user?.id, status]);

  const resetUploadFlow = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    analysisAbortRef.current?.abort();
    analysisAbortRef.current = null;
    setSelectedFile(null);
    setDurationSeconds(null);
    setUploadProgress(0);
    setErrorMessage("");
    setUploadResult(null);
    setUploadStep("");
    setAnalysisProgress(null);
    setAnalysisSummary(null);
    setStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetSelection = resetUploadFlow;

  const handleChooseFile = () => {
    if (status === "uploading" || status === "analyzing") return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setErrorMessage("");
    setUploadResult(null);
    setUploadStep("");
    setAnalysisProgress(null);
    setAnalysisSummary(null);
    setUploadProgress(0);

    const fileValidation = validateSessionVideoFile(file);
    if (!fileValidation.ok) {
      setSelectedFile(null);
      setDurationSeconds(null);
      setErrorMessage(fileValidation.error);
      setStatus("error");
      return;
    }

    setSelectedFile(file);
    setStatus("validating");

    try {
      const durationValidation = await validateSessionVideoDuration(file);
      if (!durationValidation.ok) {
        setErrorMessage(durationValidation.error);
        setStatus("error");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setDurationSeconds(durationValidation.durationSeconds);
      setStatus("ready");
    } catch (error) {
      setErrorMessage(error.message || "Could not validate this video.");
      setStatus("error");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus("cancelled");
    setUploadProgress(0);
    setErrorMessage("Upload cancelled.");
  };

  const handleUpload = async () => {
    if (!selectedFile || status === "uploading") return;

    if (!user?.id) {
      setErrorMessage("You must be signed in to upload a session video.");
      setStatus("error");
      return;
    }

    setErrorMessage("");
    setUploadResult(null);
    setAnalysisSummary(null);
    setUploadProgress(5);
    setUploadStep("Preparing upload…");
    setStatus("uploading");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await uploadSessionVideo({
        file: selectedFile,
        userId: user.id,
        durationSeconds,
        onProgress: (percent) => {
          setUploadProgress(percent);
          if (percent < 10) setUploadStep("Starting upload…");
          else if (percent < 96) setUploadStep("Uploading to storage…");
          else setUploadStep("Saving record…");
        },
        signal: controller.signal,
      });

      setUploadResult(result);
      setUploadStep("");
      setStatus("success");
    } catch (error) {
      if (error?.name === "AbortError") {
        setStatus("cancelled");
        setErrorMessage("Upload cancelled.");
        return;
      }

      setStatus("error");
      setUploadStep("");
      const message = error.message || "Upload failed. Please try again.";
      if (/bucket not found/i.test(message)) {
        setErrorMessage(
          "The session-videos storage bucket is not set up yet. Run the Phase 1 migration SQL in Supabase, then try again."
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile || !uploadResult?.id || status === "analyzing") return;

    setErrorMessage("");
    setAnalysisSummary(null);
    setAnalysisProgress({
      phase: "extracting",
      percent: 0,
      message: "Preparing analysis…",
    });
    setStatus("analyzing");

    const controller = new AbortController();
    analysisAbortRef.current = controller;

    try {
      await analyzeSessionVideo({
        file: selectedFile,
        videoId: uploadResult.id,
        signal: controller.signal,
        onProgress: setAnalysisProgress,
      });

      const summary = await fetchDetectedShotsSummary(uploadResult.id);
      setAnalysisSummary(summary);
      setStatus("analyzed");
    } catch (error) {
    if (error?.name === "AbortError") {
      setStatus("success");
      setAnalysisProgress(null);
      setErrorMessage("Analysis cancelled.");
      return;
    }

    setStatus("success");
    setAnalysisProgress(null);
    setErrorMessage(error.message || "Analysis failed.");
    } finally {
      analysisAbortRef.current = null;
    }
  };

  const handleCancelAnalysis = () => {
    analysisAbortRef.current?.abort();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileVideo className="w-5 h-5 text-brand-orange" />
            Upload Session Video
            <BetaBadge />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/5 p-4 text-sm text-brand-lightGray">
            <p className="font-medium text-white mb-1">
              AI-assisted tracking — review required
            </p>
            <p>
              After upload, analysis suggests shot attempts from sampled frames.
              Review each detection, correct make/miss, then confirm to save to
              your shooting stats.
            </p>
          </div>

          {pendingReviews.length > 0 && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-300" />
                Videos waiting for review
              </p>
              <div className="space-y-2">
                {pendingReviews.map((video) => (
                  <div
                    key={video.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-black/20 p-3"
                  >
                    <div className="text-sm text-gray-300">
                      <p className="text-white font-medium">
                        {new Date(video.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Duration{" "}
                        {formatVideoTimestamp(video.duration_seconds || 0)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        navigate(`/shootingsession/review/${video.id}`)
                      }
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Review Shots
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-800/60 p-3">
              <p className="text-gray-400">Formats</p>
              <p className="text-white font-medium">.mp4, .mov</p>
            </div>
            <div className="rounded-lg bg-gray-800/60 p-3">
              <p className="text-gray-400">Max duration</p>
              <p className="text-white font-medium">
                {SESSION_VIDEO_MAX_DURATION_SECONDS / 60} minutes
              </p>
            </div>
            <div className="rounded-lg bg-gray-800/60 p-3 sm:col-span-2">
              <p className="text-gray-400">Max file size</p>
              <p className="text-white font-medium">
                {formatBytes(SESSION_VIDEO_MAX_BYTES)}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={SESSION_VIDEO_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
          />

          {status === "uploading" && (
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-100 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress > 5 ? "Uploading video..." : uploadStep || "Starting upload..."}
                </span>
                <span className="text-white font-medium">
                  {Math.max(uploadProgress, status === "uploading" ? 5 : 0)}%
                </span>
              </div>
              <Progress value={Math.max(uploadProgress, 5)} className="h-2" />
              {selectedFile && (
                <p className="text-xs text-orange-100/80 truncate">
                  {selectedFile.name}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelUpload}
                className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Cancel Upload
              </Button>
            </div>
          )}

          {!selectedFile &&
            status !== "success" &&
            status !== "analyzed" &&
            status !== "uploading" && (
            <Button
              type="button"
              onClick={handleChooseFile}
              disabled={status === "uploading" || status === "validating"}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white"
            >
              {status === "validating" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking video...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Video
                </>
              )}
            </Button>
          )}

          {selectedFile &&
            status !== "success" &&
            status !== "analyzed" &&
            status !== "analyzing" &&
            status !== "uploading" && (
            <div className="rounded-xl border border-gray-700 bg-gray-900/40 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">
                    {selectedFile.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                    >
                      {formatBytes(selectedFile.size)}
                    </Badge>
                    {durationSeconds != null && (
                      <Badge
                        variant="outline"
                        className="border-gray-600 text-gray-300"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDuration(durationSeconds)}
                      </Badge>
                    )}
                  </div>
                </div>
                {status !== "uploading" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={resetSelection}
                    className="shrink-0 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {(status === "ready" ||
                status === "cancelled" ||
                status === "error") && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={handleUpload}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleChooseFile}
                    className="flex-1"
                  >
                    Choose Different File
                  </Button>
                </div>
              )}
            </div>
          )}

          {status === "analyzing" && analysisProgress && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-white font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
                {analysisProgress.message || "Analyzing video…"}
              </div>
              <Progress
                value={analysisProgress.percent || 5}
                className="h-2"
              />
              {analysisProgress.phase === "extracting" &&
                analysisProgress.total > 0 && (
                  <p className="text-xs text-blue-200">
                    Frame {analysisProgress.current} of {analysisProgress.total}
                  </p>
                )}
              {analysisProgress.phase === "analyzing" &&
                analysisProgress.total > 0 && (
                  <p className="text-xs text-blue-200">
                    Batch {analysisProgress.current} of {analysisProgress.total}
                  </p>
                )}
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelAnalysis}
                className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Cancel Analysis
              </Button>
            </div>
          )}

          {(status === "success" || status === "analyzed") && uploadResult && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-white">Upload complete</p>
                  <p className="text-sm text-gray-300 mt-1">
                    Video stored securely. Video ID: {uploadResult.id}
                  </p>
                </div>
              </div>

              {status === "success" && !analysisSummary && (
                <Button
                  type="button"
                  onClick={handleAnalyze}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Start AI Analysis
                  <BetaBadge className="ml-2" />
                </Button>
              )}

              {status === "analyzed" && analysisSummary && (
                <div className="rounded-lg bg-black/20 p-4 space-y-3">
                  <p className="text-sm font-medium text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-300" />
                    AI draft results — not verified yet
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
                    <div>
                      <p className="text-xl font-bold text-white">
                        {analysisSummary.total}
                      </p>
                      <p className="text-gray-400">Detected</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-green-400">
                        {analysisSummary.makes}
                      </p>
                      <p className="text-gray-400">Makes</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-red-400">
                        {analysisSummary.misses}
                      </p>
                      <p className="text-gray-400">Misses</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-400">
                        {analysisSummary.unclear}
                      </p>
                      <p className="text-gray-400">Unclear</p>
                    </div>
                  </div>
                  {analysisSummary.lowConfidence > 0 && (
                    <p className="text-xs text-yellow-200">
                      {analysisSummary.lowConfidence} detection
                      {analysisSummary.lowConfidence === 1 ? "" : "s"} flagged
                      low confidence — review carefully before saving.
                    </p>
                  )}
                  <Button
                    type="button"
                    onClick={() =>
                      navigate(`/shootingsession/review/${uploadResult.id}`)
                    }
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    Review & Confirm Shots
                  </Button>
                  <p className="text-xs text-gray-400">
                    Status in database:{" "}
                    <code className="bg-black/30 px-1 rounded">needs_review</code>
                  </p>
                </div>
              )}

              <Button type="button" variant="outline" onClick={resetSelection}>
                Upload Another Video
              </Button>
            </div>
          )}

          {errorMessage &&
            status !== "analyzed" &&
            status !== "uploading" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="whitespace-pre-wrap">{errorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
