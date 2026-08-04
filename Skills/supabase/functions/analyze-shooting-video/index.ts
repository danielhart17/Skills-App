import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOT_RESULTS = new Set(["make", "miss", "unclear"]);
const SHOT_TYPES = new Set([
  "layup",
  "midrange",
  "three",
  "freethrow",
  "unknown",
]);
const MERGE_WINDOW_SECONDS = 1.25;

type IncomingFrame = {
  timestamp_seconds: number;
  image_base64: string;
};

type DetectedShot = {
  timestamp_seconds: number;
  result: "make" | "miss" | "unclear";
  confidence: number;
  shot_type: string;
  court_x: number | null;
  court_y: number | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseClaudeJson(text: string): { shots: DetectedShot[] } {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const parsed = JSON.parse(candidate);

  if (!parsed || !Array.isArray(parsed.shots)) {
    throw new Error("Model response missing shots array.");
  }

  return { shots: parsed.shots.map(normalizeShot) };
}

function normalizeShot(raw: Record<string, unknown>): DetectedShot {
  const timestamp = Number(raw.timestamp_seconds);
  const confidence = Number(raw.confidence);
  const result = String(raw.result || "unclear");
  const shotType = String(raw.shot_type || "unknown");

  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new Error("Invalid timestamp_seconds in model output.");
  }

  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error("Invalid confidence in model output.");
  }

  if (!SHOT_RESULTS.has(result)) {
    throw new Error(`Invalid result "${result}" in model output.`);
  }

  const normalizedType = SHOT_TYPES.has(shotType) ? shotType : "unknown";

  const courtX =
    raw.court_x === null || raw.court_x === undefined
      ? null
      : Number(raw.court_x);
  const courtY =
    raw.court_y === null || raw.court_y === undefined
      ? null
      : Number(raw.court_y);

  if (
    courtX !== null &&
    (!Number.isFinite(courtX) || courtX < 0 || courtX > 100)
  ) {
    throw new Error("Invalid court_x in model output.");
  }

  if (
    courtY !== null &&
    (!Number.isFinite(courtY) || courtY < 0 || courtY > 100)
  ) {
    throw new Error("Invalid court_y in model output.");
  }

  return {
    timestamp_seconds: Math.round(timestamp * 100) / 100,
    result: result as DetectedShot["result"],
    confidence: Math.round(confidence * 1000) / 1000,
    shot_type: normalizedType,
    court_x: courtX,
    court_y: courtY,
  };
}

function buildPrompt(frames: IncomingFrame[]) {
  const frameList = frames
    .map(
      (frame) =>
        `- Frame at ${frame.timestamp_seconds.toFixed(2)}s (use this exact timestamp if you report a shot from this frame)`
    )
    .join("\n");

  return `You are analyzing basketball practice video frames sampled sequentially from one continuous clip.

Return STRICT JSON ONLY. No markdown fences, no prose, no explanation.

Schema:
{"shots":[{"timestamp_seconds":number,"result":"make"|"miss"|"unclear","confidence":0-1,"shot_type":"layup"|"midrange"|"three"|"freethrow"|"unknown","court_x":0-100|null,"court_y":0-100|null}]}

Rules:
- Report a shot ONLY when you see a release or the ball clearly heading toward the basket/rim.
- Use result "unclear" when the ball path through the rim is NOT visible in these frames. Never guess make/miss.
- confidence reflects how sure you are about result AND that it is a real shot attempt (0-1).
- shot_type: classify if possible, else "unknown".
- court_x and court_y: approximate shooter location on a half court (hoop at top, y=0). Use null if unknown.
- At most one shot entry per distinct attempt in this batch.
- timestamp_seconds MUST match one of the provided frame timestamps when possible.

Frames in order:
${frameList}`;
}

async function callClaude(frames: IncomingFrame[]) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set on edge function.");
  }

  const content: Array<Record<string, unknown>> = [
    { type: "text", text: buildPrompt(frames) },
  ];

  for (const frame of frames) {
    content.push({
      type: "text",
      text: `Frame at ${frame.timestamp_seconds.toFixed(2)}s`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: frame.image_base64,
      },
    });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const text = payload.content?.find((part: { type: string }) => part.type === "text")?.text;

  if (!text) {
    throw new Error("Anthropic response missing text content.");
  }

  return parseClaudeJson(text);
}

function shouldReplaceShot(current: DetectedShot, candidate: DetectedShot) {
  if (current.result === "unclear" && candidate.result !== "unclear") {
    return true;
  }
  if (candidate.result === "unclear" && current.result !== "unclear") {
    return false;
  }
  return candidate.confidence > current.confidence;
}

function deduplicateShots(shots: DetectedShot[]) {
  const sorted = [...shots].sort(
    (a, b) => a.timestamp_seconds - b.timestamp_seconds
  );
  const merged: DetectedShot[] = [];

  for (const shot of sorted) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      Math.abs(shot.timestamp_seconds - previous.timestamp_seconds) <=
        MERGE_WINDOW_SECONDS
    ) {
      if (shouldReplaceShot(previous, shot)) {
        merged[merged.length - 1] = shot;
      }
      continue;
    }
    merged.push(shot);
  }

  return merged;
}

async function finalizeVideoAnalysis(
  supabase: ReturnType<typeof createClient>,
  videoId: string,
  userId: string
) {
  const { data: existingRows, error: fetchError } = await supabase
    .from("detected_shots")
    .select(
      "timestamp_seconds, result, confidence, shot_type, court_x, court_y"
    )
    .eq("video_id", videoId)
    .eq("user_id", userId);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const deduped = deduplicateShots((existingRows || []) as DetectedShot[]);

  const { error: deleteError } = await supabase
    .from("detected_shots")
    .delete()
    .eq("video_id", videoId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (deduped.length > 0) {
    const { error: insertError } = await supabase.from("detected_shots").insert(
      deduped.map((shot) => ({
        video_id: videoId,
        user_id: userId,
        timestamp_seconds: shot.timestamp_seconds,
        result: shot.result,
        confidence: shot.confidence,
        shot_type: shot.shot_type,
        court_x: shot.court_x,
        court_y: shot.court_y,
        batch_index: null,
      }))
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { error: statusError } = await supabase
    .from("shooting_session_videos")
    .update({
      status: deduped.length > 0 ? "needs_review" : "failed",
      error_message:
        deduped.length > 0
          ? null
          : "Analysis finished but no shot attempts were detected.",
    })
    .eq("id", videoId)
    .eq("user_id", userId);

  if (statusError) {
    throw new Error(statusError.message);
  }

  return deduped.length;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are not configured.");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    const body = await req.json();
    const videoId = body.videoId as string;
    const batchIndex = Number(body.batchIndex ?? 0);
    const totalBatches = Number(body.totalBatches ?? 1);
    const finalize = Boolean(body.finalize);
    const finalizeOnly = Boolean(body.finalizeOnly);
    const frames = (body.frames || []) as IncomingFrame[];

    if (!videoId) {
      return jsonResponse({ error: "videoId is required." }, 400);
    }

    const { data: videoRow, error: videoError } = await supabase
      .from("shooting_session_videos")
      .select("id, user_id, status")
      .eq("id", videoId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (videoError) {
      throw new Error(videoError.message);
    }

    if (!videoRow) {
      return jsonResponse({ error: "Video not found." }, 404);
    }

    if (finalizeOnly) {
      const finalizedCount = await finalizeVideoAnalysis(
        supabase,
        videoId,
        user.id
      );
      return jsonResponse({ ok: true, finalizedCount });
    }

    if (!Array.isArray(frames) || frames.length === 0) {
      return jsonResponse({ error: "frames array is required." }, 400);
    }

    if (batchIndex === 0) {
      await supabase
        .from("shooting_session_videos")
        .update({ status: "processing", error_message: null })
        .eq("id", videoId)
        .eq("user_id", user.id);
    }

    const { shots } = await callClaude(frames);

    let insertedCount = 0;
    if (shots.length > 0) {
      const { error: insertError } = await supabase.from("detected_shots").insert(
        shots.map((shot) => ({
          video_id: videoId,
          user_id: user.id,
          timestamp_seconds: shot.timestamp_seconds,
          result: shot.result,
          confidence: shot.confidence,
          shot_type: shot.shot_type,
          court_x: shot.court_x,
          court_y: shot.court_y,
          batch_index: batchIndex,
        }))
      );

      if (insertError) {
        throw new Error(insertError.message);
      }

      insertedCount = shots.length;
    }

    let finalizedCount = null;
    if (finalize || batchIndex >= totalBatches - 1) {
      finalizedCount = await finalizeVideoAnalysis(supabase, videoId, user.id);
    }

    return jsonResponse({
      ok: true,
      batchIndex,
      insertedCount,
      modelShotCount: shots.length,
      finalizedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("analyze-shooting-video error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
