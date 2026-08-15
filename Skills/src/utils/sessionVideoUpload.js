import { supabase } from "@/api/supabaseClient";
import {
  readLocalAccessToken,
  readLocalSession,
} from "@/utils/localAuthSession";
import {
  SESSION_VIDEO_ALLOWED_EXTENSIONS,
  SESSION_VIDEO_ALLOWED_MIME_TYPES,
  SESSION_VIDEO_BUCKET,
  SESSION_VIDEO_MAX_BYTES,
  SESSION_VIDEO_MAX_DURATION_SECONDS,
} from "@/utils/sessionVideoConstants";

const UPLOAD_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const UPLOAD_STALL_MS = 60 * 1000; // no bytes for 60s
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getFileExtension(file) {
  const name = file.name?.toLowerCase() || "";
  const dotIndex = name.lastIndexOf(".");
  return dotIndex >= 0 ? name.slice(dotIndex) : "";
}

function getContentType(file) {
  if (file.type && SESSION_VIDEO_ALLOWED_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  const extension = getFileExtension(file);
  if (extension === ".mov") return "video/quicktime";
  return "video/mp4";
}

export function validateSessionVideoFile(file) {
  if (!file) {
    return { ok: false, error: "Choose a video file to upload." };
  }

  const extension = getFileExtension(file);
  const mimeOk =
    SESSION_VIDEO_ALLOWED_MIME_TYPES.has(file.type) ||
    SESSION_VIDEO_ALLOWED_EXTENSIONS.has(extension);

  if (!mimeOk) {
    return {
      ok: false,
      error: "Only .mp4 and .mov files are supported.",
    };
  }

  if (file.size > SESSION_VIDEO_MAX_BYTES) {
    return {
      ok: false,
      error: "Video must be 200 MB or smaller.",
    };
  }

  return { ok: true };
}

export function readVideoDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const cleanup = () => {
      URL.revokeObjectURL(video.src);
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read the video duration."));
        return;
      }

      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read this video file."));
    };

    video.src = URL.createObjectURL(file);
  });
}

export async function validateSessionVideoDuration(file) {
  const durationSeconds = await readVideoDurationSeconds(file);

  if (durationSeconds > SESSION_VIDEO_MAX_DURATION_SECONDS) {
    const maxMinutes = SESSION_VIDEO_MAX_DURATION_SECONDS / 60;
    return {
      ok: false,
      error: `Video must be ${maxMinutes} minutes or shorter.`,
      durationSeconds,
    };
  }

  return { ok: true, durationSeconds };
}

function buildStoragePath(userId, file) {
  const extension = getFileExtension(file) || ".mp4";
  const safeExtension = SESSION_VIDEO_ALLOWED_EXTENSIONS.has(extension)
    ? extension
    : ".mp4";

  return `${userId}/${crypto.randomUUID()}${safeExtension}`;
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function getLocalAccessToken() {
  const token = readLocalAccessToken();
  if (!token) {
    throw new Error("You must be signed in to upload a session video.");
  }
  return token;
}

function buildStorageUploadUrl(storagePath) {
  const base = new URL(SUPABASE_URL);
  base.hostname = base.hostname.replace("supabase.", "storage.supabase.");
  const objectPath = `${SESSION_VIDEO_BUCKET}/${storagePath}`.replace(
    /^\/+/,
    ""
  );
  return `${base.origin}/storage/v1/object/${objectPath}`;
}

function mapUploadProgress(loaded, total, fileSize) {
  const denominator = total > 0 ? total : fileSize;
  if (!denominator) return 12;
  const ratio = Math.min(loaded / denominator, 1);
  return 10 + Math.round(ratio * 85);
}

function parseStorageUploadError(status, responseText) {
  let message = responseText || `Upload failed (${status}).`;

  try {
    const parsed = JSON.parse(responseText);
    message =
      parsed.message ||
      parsed.error ||
      parsed.statusCode ||
      message;
  } catch {
    // keep raw response text
  }

  if (/bucket not found/i.test(message)) {
    return "Storage bucket session-videos not found. Run the Phase 1 migration SQL in Supabase.";
  }

  if (/row-level security|permission|denied|403/i.test(message)) {
    return "Storage permission denied. Confirm the session-videos bucket policies are installed and you are signed in as an athlete.";
  }

  if (/payload too large|file size|413/i.test(message)) {
    return "File exceeds the storage bucket size limit (200 MB).";
  }

  return message;
}

function uploadFileViaXHR({
  file,
  url,
  accessToken,
  onProgress,
  signal,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file);

    let timeoutId;
    let stallCheckId;
    let lastProgressAt = Date.now();
    let lastLoaded = 0;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(stallCheckId);
      signal?.removeEventListener("abort", onAbort);
    };

    const fail = (error) => {
      cleanup();
      reject(error);
    };

    const onAbort = () => {
      xhr.abort();
      fail(new DOMException("Upload cancelled.", "AbortError"));
    };

    if (signal?.aborted) {
      fail(new DOMException("Upload cancelled.", "AbortError"));
      return;
    }

    signal?.addEventListener("abort", onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      lastProgressAt = Date.now();
      lastLoaded = event.loaded;
      onProgress?.(mapUploadProgress(event.loaded, event.total, file.size));
    };

    xhr.onload = () => {
      cleanup();

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      fail(
        new Error(parseStorageUploadError(xhr.status, xhr.responseText))
      );
    };

    xhr.onerror = () => {
      fail(new Error("Network error during upload. Check your connection and try again."));
    };

    xhr.onabort = () => {
      fail(new DOMException("Upload cancelled.", "AbortError"));
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");

    timeoutId = window.setTimeout(() => {
      xhr.abort();
      fail(
        new Error(
          "Upload timed out after 10 minutes. Try a shorter clip or stronger Wi‑Fi."
        )
      );
    }, UPLOAD_TIMEOUT_MS);

    stallCheckId = window.setInterval(() => {
      if (xhr.readyState === XMLHttpRequest.DONE) return;

      const stalledFor = Date.now() - lastProgressAt;
      if (stalledFor < UPLOAD_STALL_MS) return;

      xhr.abort();
      fail(
        new Error(
          lastLoaded > 0
            ? "Upload stalled mid-transfer. Check your connection and try again."
            : "Upload could not connect to storage. Try again in a moment or use a smaller file."
        )
      );
    }, 5000);

    onProgress?.(10);
    xhr.send(formData);
  });
}

async function ensureAuthenticatedUser(expectedUserId) {
  if (!expectedUserId) {
    throw new Error("You must be signed in to upload a session video.");
  }

  const session = readLocalSession();
  if (session?.user?.id && session.user.id !== expectedUserId) {
    throw new Error("Session user mismatch. Please sign out and sign back in.");
  }

  getLocalAccessToken();
  return session?.user ?? { id: expectedUserId };
}

async function uploadFileToStorage(file, storagePath, onProgress, signal) {
  if (signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  const accessToken = getLocalAccessToken();
  const uploadUrl = buildStorageUploadUrl(storagePath);

  await uploadFileViaXHR({
    file,
    url: uploadUrl,
    accessToken,
    onProgress,
    signal,
  });

  onProgress?.(96);
  return { path: storagePath };
}

async function insertVideoRecord({
  userId,
  storagePath,
  durationSeconds,
  accessToken,
}) {
  const url = `${SUPABASE_URL}/rest/v1/shooting_session_videos?select=id,storage_path,duration_seconds,status,created_at`;

  const response = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        storage_path: storagePath,
        duration_seconds: durationSeconds,
        status: "uploaded",
      }),
    }),
    30000,
    "Saving upload record timed out. Your video may have uploaded — try refreshing and check again."
  );

  const responseText = await response.text();

  if (!response.ok) {
    let message = responseText || "Could not save upload record.";

    try {
      const parsed = JSON.parse(responseText);
      message = parsed.message || parsed.error || parsed.hint || message;
    } catch {
      // keep raw text
    }

    if (
      message.includes("does not exist") ||
      message.includes("42P01")
    ) {
      throw new Error(
        "Database table shooting_session_videos not found. Run the Phase 1 migration SQL first."
      );
    }

    throw new Error(message);
  }

  const rows = JSON.parse(responseText);
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function uploadSessionVideo({
  file,
  userId,
  durationSeconds,
  onProgress,
  signal,
}) {
  onProgress?.(5);

  await ensureAuthenticatedUser(userId);

  if (signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  const storagePath = buildStoragePath(userId, file);
  onProgress?.(8);

  await uploadFileToStorage(file, storagePath, onProgress, signal);

  if (signal?.aborted) {
    await supabase.storage.from(SESSION_VIDEO_BUCKET).remove([storagePath]);
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  onProgress?.(98);

  const accessToken = getLocalAccessToken();
  let data;

  try {
    data = await insertVideoRecord({
      userId,
      storagePath,
      durationSeconds,
      accessToken,
    });
  } catch (error) {
    await supabase.storage.from(SESSION_VIDEO_BUCKET).remove([storagePath]);
    throw error;
  }

  onProgress?.(100);
  return data;
}
