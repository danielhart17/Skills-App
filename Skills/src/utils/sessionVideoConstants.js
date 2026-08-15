export const SESSION_VIDEO_BUCKET = "session-videos";

export const SESSION_VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export const SESSION_VIDEO_MAX_DURATION_SECONDS = 5 * 60; // 5 minutes

export const SESSION_VIDEO_ACCEPT =
  "video/mp4,video/quicktime,.mp4,.mov";

export const SESSION_VIDEO_ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
]);

export const SESSION_VIDEO_ALLOWED_EXTENSIONS = new Set([".mp4", ".mov"]);

/** Frames sampled per second for client-side extraction (Phase 2). */
export const FRAME_SAMPLE_FPS = 4;

/** Max frames sent to Claude per edge function call. */
export const FRAMES_PER_ANALYSIS_BATCH = 6;

/** Max width for extracted JPEG frames (keeps API payloads smaller). */
export const FRAME_MAX_WIDTH = 768;
