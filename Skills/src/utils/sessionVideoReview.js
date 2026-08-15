import { supabase } from "@/api/supabaseClient";
import {
  buildZoneStats,
  mapPointToZone,
} from "@/constants/courtZones";
import { SESSION_VIDEO_BUCKET } from "@/utils/sessionVideoConstants";

export function formatVideoTimestamp(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "0:00";

  const mins = Math.floor(value / 60);
  const secs = Math.round(value % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function initializeReviewShots(shots) {
  return (shots || []).map((shot) => ({
    id: shot.id,
    timestamp_seconds: Number(shot.timestamp_seconds),
    result: shot.result,
    confidence: Number(shot.confidence),
    shot_type: shot.shot_type || "unknown",
    court_x: shot.court_x,
    court_y: shot.court_y,
    zone: mapPointToZone(
      shot.court_x != null ? Number(shot.court_x) : null,
      shot.court_y != null ? Number(shot.court_y) : null
    ),
    removed: false,
  }));
}

export function summarizeReviewShots(reviewShots) {
  const active = reviewShots.filter((shot) => !shot.removed);

  return {
    total: active.length,
    makes: active.filter((shot) => shot.result === "make").length,
    misses: active.filter((shot) => shot.result === "miss").length,
    unclear: active.filter((shot) => shot.result === "unclear").length,
    removed: reviewShots.filter((shot) => shot.removed).length,
  };
}

export function validateReviewShots(reviewShots) {
  const active = reviewShots.filter((shot) => !shot.removed);
  const confirmed = active.filter(
    (shot) => shot.result === "make" || shot.result === "miss"
  );
  const unclear = active.filter((shot) => shot.result === "unclear");

  if (confirmed.length === 0) {
    return "Confirm at least one shot as Make or Miss before saving.";
  }

  if (unclear.length > 0) {
    return `${unclear.length} shot${
      unclear.length === 1 ? "" : "s"
    } still marked Unclear. Set each to Make or Miss, or remove it.`;
  }

  return null;
}

export async function fetchVideoReviewContext(videoId, userId) {
  const { data: video, error: videoError } = await supabase
    .from("shooting_session_videos")
    .select("id, user_id, storage_path, duration_seconds, status, created_at")
    .eq("id", videoId)
    .eq("user_id", userId)
    .single();

  if (videoError) {
    throw new Error(videoError.message || "Could not load this video.");
  }

  if (!["needs_review", "complete"].includes(video.status)) {
    throw new Error(
      "This video is not ready for review yet. Finish AI analysis first."
    );
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(SESSION_VIDEO_BUCKET)
    .createSignedUrl(video.storage_path, 3600);

  if (signedError || !signed?.signedUrl) {
    throw new Error(
      signedError?.message || "Could not load a playback URL for this video."
    );
  }

  const { data: shots, error: shotsError } = await supabase
    .from("detected_shots")
    .select(
      "id, timestamp_seconds, result, confidence, shot_type, court_x, court_y"
    )
    .eq("video_id", videoId)
    .order("timestamp_seconds", { ascending: true });

  if (shotsError) {
    throw new Error(shotsError.message || "Could not load detected shots.");
  }

  return {
    video,
    signedUrl: signed.signedUrl,
    shots: shots || [],
  };
}

export async function fetchPendingReviewVideos(userId) {
  const { data, error } = await supabase
    .from("shooting_session_videos")
    .select("id, created_at, duration_seconds, status")
    .eq("user_id", userId)
    .eq("status", "needs_review")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Could not load pending reviews.");
  }

  return data || [];
}

export async function confirmVideoSession({
  videoId,
  userId,
  reviewedShots,
  durationSeconds,
}) {
  const validationError = validateReviewShots(reviewedShots);
  if (validationError) {
    throw new Error(validationError);
  }

  const included = reviewedShots.filter(
    (shot) =>
      !shot.removed && (shot.result === "make" || shot.result === "miss")
  );

  const madeShots = included.filter((shot) => shot.result === "make").length;
  const zoneStats = buildZoneStats(included);
  const nowIso = new Date().toISOString();
  const shotsData = included.map((shot) => ({
    zone: shot.zone,
    made: shot.result === "make",
    timestamp: nowIso,
    video_timestamp_seconds: shot.timestamp_seconds,
    source: "video_ai",
  }));

  const baseSessionPayload = {
    user_id: userId,
    date: nowIso,
    shots_data: shotsData,
    total_shots: included.length,
    made_shots: madeShots,
    shooting_percentage: (madeShots / included.length) * 100,
    duration_seconds: Math.round(Number(durationSeconds) || 0),
  };

  const sessionPayloadAttempts = [
    {
      ...baseSessionPayload,
      zone_stats: zoneStats,
      source_video_id: videoId,
    },
    {
      ...baseSessionPayload,
      zone_stats: zoneStats,
    },
    baseSessionPayload,
  ];

  let session = null;
  let sessionError = null;

  for (const payload of sessionPayloadAttempts) {
    const result = await supabase
      .from("shooting_sessions")
      .insert(payload)
      .select()
      .single();

    session = result.data;
    sessionError = result.error;

    if (!sessionError) {
      break;
    }

    if (!/column|schema cache|does not exist/i.test(sessionError.message || "")) {
      break;
    }
  }

  if (sessionError || !session) {
    if (/column|schema cache|does not exist/i.test(sessionError?.message || "")) {
      throw new Error(
        "Database needs the Phase 3 migration. Run supabase/migrations/add_phase3_video_review.sql in Supabase SQL Editor, then try again."
      );
    }

    throw new Error(sessionError?.message || "Could not save shooting session.");
  }

  for (const shot of included) {
    const { error: updateError } = await supabase
      .from("detected_shots")
      .update({
        result: shot.result,
        shot_type: shot.shot_type,
      })
      .eq("id", shot.id)
      .eq("user_id", userId);

    if (updateError && !/policy|permission|42501/i.test(updateError.message)) {
      console.warn("Could not update detected shot:", updateError.message);
    }
  }

  const removedIds = reviewedShots
    .filter((shot) => shot.removed)
    .map((shot) => shot.id);

  if (removedIds.length > 0) {
    await supabase
      .from("detected_shots")
      .delete()
      .in("id", removedIds)
      .eq("user_id", userId);
  }

  const videoUpdateAttempts = [
    {
      status: "complete",
      shooting_session_id: session.id,
      error_message: null,
    },
    {
      status: "complete",
      error_message: null,
    },
  ];

  let videoUpdateError = null;

  for (const patch of videoUpdateAttempts) {
    const result = await supabase
      .from("shooting_session_videos")
      .update(patch)
      .eq("id", videoId)
      .eq("user_id", userId);

    videoUpdateError = result.error;

    if (!videoUpdateError) {
      break;
    }

    if (!/column|schema cache|does not exist/i.test(videoUpdateError.message || "")) {
      break;
    }
  }

  if (videoUpdateError) {
    throw new Error(
      videoUpdateError.message || "Session saved, but video status did not update."
    );
  }

  return {
    session,
    summary: {
      totalShots: included.length,
      madeShots,
      percentage: ((madeShots / included.length) * 100).toFixed(1),
      duration: formatVideoTimestamp(durationSeconds),
    },
  };
}
