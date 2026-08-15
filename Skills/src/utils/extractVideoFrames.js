import {
  FRAME_MAX_WIDTH,
  FRAME_SAMPLE_FPS,
} from "@/utils/sessionVideoConstants";

function seekVideo(video, timeSeconds) {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("Failed while seeking through the video."));
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = Math.min(timeSeconds, video.duration || timeSeconds);
  });
}

function loadVideoMetadata(video, objectUrl) {
  return new Promise((resolve, reject) => {
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => resolve();
    video.onerror = () =>
      reject(new Error("Could not load this video for frame extraction."));

    video.src = objectUrl;
  });
}

function canvasToJpegBase64(canvas, quality = 0.72) {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.split(",")[1];
}

/**
 * Sample frames from a local video file using <video> + <canvas>.
 * Returns JPEG base64 frames with timestamps (seconds).
 */
export async function extractVideoFrames(
  file,
  { fps = FRAME_SAMPLE_FPS, maxWidth = FRAME_MAX_WIDTH, onProgress, signal } = {}
) {
  if (!file) {
    throw new Error("No video file available for frame extraction.");
  }

  const video = document.createElement("video");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not available in this browser.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    await loadVideoMetadata(video, objectUrl);

    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error("Could not determine video duration.");
    }

    const interval = 1 / fps;
    const timestamps = [];
    for (let t = 0; t < duration; t += interval) {
      timestamps.push(Math.round(t * 100) / 100);
    }

    const scale = video.videoWidth > 0 ? Math.min(1, maxWidth / video.videoWidth) : 1;
    canvas.width = Math.max(1, Math.round((video.videoWidth || maxWidth) * scale));
    canvas.height = Math.max(1, Math.round((video.videoHeight || maxWidth) * scale));

    const frames = [];

    for (let index = 0; index < timestamps.length; index += 1) {
      if (signal?.aborted) {
        throw new DOMException("Analysis cancelled.", "AbortError");
      }

      await seekVideo(video, timestamps[index]);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      frames.push({
        timestamp_seconds: timestamps[index],
        image_base64: canvasToJpegBase64(canvas),
      });

      onProgress?.({
        phase: "extracting",
        current: index + 1,
        total: timestamps.length,
        percent: Math.round(((index + 1) / timestamps.length) * 100),
      });
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
    video.removeAttribute("src");
    video.load();
  }
}
