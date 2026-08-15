import { supabase } from "@/api/supabaseClient";
import { FRAMES_PER_ANALYSIS_BATCH } from "@/utils/sessionVideoConstants";
import { extractVideoFrames } from "@/utils/extractVideoFrames";

const ANALYSIS_FUNCTION = "analyze-shooting-video";

function getProjectRef() {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] || "YOUR_PROJECT_REF";
}

const ANALYSIS_NOT_DEPLOYED_MESSAGE = `The analyze-shooting-video edge function is not deployed. Run:\n\ncd Skills-App/Skills\nnpx supabase functions deploy analyze-shooting-video --project-ref ${getProjectRef()}\n\nThen in Supabase Dashboard → Edge Functions → Secrets, add ANTHROPIC_API_KEY. Also run supabase/migrations/add_detected_shots.sql if you have not yet.`;

async function parseFunctionInvokeError(error, data) {
  if (data?.error) return data.error;

  let message = error?.message || "Edge function request failed";

  try {
    if (error?.context?.json) {
      const body = await error.context.json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
  } catch {
    // ignore
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("failed to send a request to the edge function") ||
    lower.includes("not_found") ||
    lower.includes("requested function was not found") ||
    lower.includes("function not found")
  ) {
    return ANALYSIS_NOT_DEPLOYED_MESSAGE;
  }

  return message;
}

async function invokeAnalysisBatch(body) {
  const { data, error } = await supabase.functions.invoke(
    ANALYSIS_FUNCTION,
    { body }
  );

  if (error) {
    throw new Error(await parseFunctionInvokeError(error, data));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function updateVideoStatus(videoId, patch) {
  const { error } = await supabase
    .from("shooting_session_videos")
    .update(patch)
    .eq("id", videoId);

  if (error) {
    throw new Error(error.message || "Could not update video status.");
  }
}

/**
 * Extract frames in the browser, then send batches to the edge function.
 */
export async function analyzeSessionVideo({
  file,
  videoId,
  onProgress,
  signal,
}) {
  onProgress?.({
    phase: "extracting",
    current: 0,
    total: 0,
    percent: 0,
    message: "Extracting frames from video…",
  });

  const frames = await extractVideoFrames(file, {
    onProgress,
    signal,
  });

  if (frames.length === 0) {
    throw new Error("No frames could be extracted from this video.");
  }

  const batches = chunkArray(frames, FRAMES_PER_ANALYSIS_BATCH);

  await updateVideoStatus(videoId, {
    status: "processing",
    error_message: null,
  });

  let finalized = false;
  let lastError = null;
  let successfulBatches = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    if (signal?.aborted) {
      throw new DOMException("Analysis cancelled.", "AbortError");
    }

    const percent = Math.round(((batchIndex + 1) / batches.length) * 100);
    onProgress?.({
      phase: "analyzing",
      current: batchIndex + 1,
      total: batches.length,
      percent,
      message: `Analyzing batch ${batchIndex + 1} of ${batches.length}…`,
    });

    const data = await invokeAnalysisBatch({
      videoId,
      batchIndex,
      totalBatches: batches.length,
      finalize: batchIndex === batches.length - 1,
      frames: batches[batchIndex].map((frame) => ({
        timestamp_seconds: frame.timestamp_seconds,
        image_base64: frame.image_base64,
      })),
    });

    successfulBatches += 1;
    if (data?.finalizedCount != null) {
      finalized = true;
    }
  }

  if (!finalized && successfulBatches > 0) {
    try {
      await invokeAnalysisBatch({
        videoId,
        finalizeOnly: true,
      });
      finalized = true;
    } catch (error) {
      lastError = error;
    }
  }

  const { count, error: countError } = await supabase
    .from("detected_shots")
    .select("*", { count: "exact", head: true })
    .eq("video_id", videoId);

  if (countError) {
    throw new Error(countError.message || "Could not read analysis results.");
  }

  const finalCount = count ?? 0;

  if (finalCount === 0) {
    await updateVideoStatus(videoId, {
      status: "failed",
      error_message:
        lastError?.message ||
        "Analysis completed but no shot attempts were detected.",
    });
    throw lastError || new Error("No shot attempts were detected.");
  }

  if (lastError) {
    await updateVideoStatus(videoId, {
      status: "needs_review",
      error_message: `Partial analysis: ${lastError.message}`,
    });
  }

  onProgress?.({
    phase: "complete",
    current: batches.length,
    total: batches.length,
    percent: 100,
    message: "Analysis complete — review and confirm your shots.",
  });

  return {
    shotCount: finalCount,
    batchCount: batches.length,
    frameCount: frames.length,
    partialFailure: Boolean(lastError),
  };
}

export async function fetchDetectedShotsSummary(videoId) {
  const { data, error } = await supabase
    .from("detected_shots")
    .select("result, confidence")
    .eq("video_id", videoId);

  if (error) {
    throw new Error(error.message || "Could not load detected shots.");
  }

  const rows = data || [];
  return {
    total: rows.length,
    makes: rows.filter((row) => row.result === "make").length,
    misses: rows.filter((row) => row.result === "miss").length,
    unclear: rows.filter((row) => row.result === "unclear").length,
    lowConfidence: rows.filter((row) => Number(row.confidence) < 0.6).length,
  };
}
