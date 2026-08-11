import { useState, useRef, useEffect } from "react";
import { Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import WorkoutBuilder from "./WorkoutBuilder";
import FilmFeedbackForm from "./FilmFeedbackForm";
import { uploadMessageMedia, validateMediaFile } from "@/api/messagingService";

const TRAINER_TYPES = [
  { id: "text", label: "Message" },
  { id: "workout", label: "Workout" },
  { id: "film_feedback", label: "Film Feedback" },
];

export default function MessageComposer({
  mode,
  userId,
  contactName,
  replyPrefix,
  onClearReply,
  composeMode,
  onComposeModeChange,
  onSend,
}) {
  const isTrainer = mode === "trainer";
  const [text, setText] = useState(replyPrefix || "");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const activeMode = composeMode || "text";

  useEffect(() => {
    if (replyPrefix) setText(replyPrefix);
  }, [replyPrefix]);

  const handleTextChange = (v) => {
    setText(v);
    if (!v.startsWith(replyPrefix) && replyPrefix) onClearReply?.();
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = [];
    for (const f of files) {
      const check = validateMediaFile(f);
      if (!check.ok) {
        alert(check.error);
        continue;
      }
      valid.push(f);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const sendTextMedia = async () => {
    const body = text.trim();
    if (!body && pendingFiles.length === 0) return;

    setSending(true);
    setUploadProgress(0);
    try {
      const attachments = [];
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const pct = ((i + 1) / pendingFiles.length) * 100;
        const up = await uploadMessageMedia(file, userId, (p) =>
          setUploadProgress(
            Math.round((i / pendingFiles.length) * 100 + p / pendingFiles.length)
          )
        );
        attachments.push(up);
        setUploadProgress(pct);
      }

      await onSend({
        body: replyPrefix ? `${replyPrefix}${body}` : body,
        messageType: attachments.length && !body ? "media" : "text",
        attachments,
      });

      setText("");
      setPendingFiles([]);
      onClearReply?.();
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const sendWorkout = async (payload) => {
    setSending(true);
    try {
      await onSend({
        messageType: "workout",
        workoutPayload: payload,
      });
      onComposeModeChange?.(null);
    } finally {
      setSending(false);
    }
  };

  const sendFilm = async ({ body, clip }) => {
    setSending(true);
    setUploadProgress(0);
    try {
      let attachments = [];
      if (clip) {
        const up = await uploadMessageMedia(clip, userId, setUploadProgress);
        attachments = [up];
      }
      await onSend({
        body,
        messageType: "film_feedback",
        attachments,
      });
      onComposeModeChange?.(null);
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const canSend =
    activeMode === "text" &&
    (text.trim().length > 0 || pendingFiles.length > 0) &&
    !sending;

  return (
    <div className="shrink-0 border-t border-brand-gray/30 bg-brand-black p-3 space-y-2 safe-area-pb">
      {isTrainer && (
        <div className="flex gap-1 flex-wrap">
          {TRAINER_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onComposeModeChange?.(t.id)}
              className={`text-xs px-2.5 py-1 rounded-full border ${
                activeMode === t.id
                  ? "bg-brand-orange text-white border-brand-orange"
                  : "border-brand-gray/40 text-brand-lightGray"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {activeMode === "workout" && isTrainer ? (
        <WorkoutBuilder
          athleteName={contactName}
          onSend={sendWorkout}
          sending={sending}
        />
      ) : activeMode === "film_feedback" && isTrainer ? (
        <FilmFeedbackForm onSend={sendFilm} sending={sending} />
      ) : (
        <>
          {pendingFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {pendingFiles.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="relative text-xs bg-brand-charcoal rounded-lg p-2 pr-6 max-w-[120px]"
                >
                  {f.type.startsWith("image/") ? (
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <span className="text-brand-lightGray truncate block">
                      {f.name} ({(f.size / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  )}
                  <button
                    type="button"
                    className="absolute top-1 right-1 text-brand-gray hover:text-red-400"
                    onClick={() => removeFile(i)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Progress value={uploadProgress} className="h-1" />
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              className="text-brand-lightGray shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`Message ${contactName}...`}
              className="flex-1 bg-brand-charcoal border-brand-gray/30 text-brand-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canSend) sendTextMedia();
                }
              }}
            />
            <Button
              type="button"
              size="icon"
              disabled={!canSend}
              onClick={sendTextMedia}
              className="bg-brand-blue text-white shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
