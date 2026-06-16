import { useState, useEffect, useRef } from "react";
import { Play } from "lucide-react";
import { getSignedMediaUrl } from "@/api/messagingService";

export default function MediaAttachment({ attachment }) {
  const [url, setUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getSignedMediaUrl(attachment.file_url)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [attachment.file_url]);

  if (!url) {
    return (
      <div className="w-48 h-32 rounded-lg bg-brand-charcoal animate-pulse" />
    );
  }

  if (attachment.file_type === "image") {
    return (
      <img
        src={url}
        alt={attachment.file_name || "Attachment"}
        loading="lazy"
        className="max-w-full max-h-64 rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="relative max-w-full">
      {!playing ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="relative block rounded-lg overflow-hidden bg-black"
        >
          <video
            src={url}
            preload="metadata"
            muted
            className="max-h-48 w-full object-cover"
            onLoadedData={(e) => {
              e.target.currentTime = 1;
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Play className="w-12 h-12 text-white" />
          </span>
          <span className="absolute bottom-2 left-2 text-xs text-white/80 truncate max-w-[90%]">
            {attachment.file_name}
          </span>
        </button>
      ) : (
        <video
          ref={videoRef}
          src={url}
          controls
          autoPlay
          className="max-w-full max-h-64 rounded-lg"
        />
      )}
    </div>
  );
}
