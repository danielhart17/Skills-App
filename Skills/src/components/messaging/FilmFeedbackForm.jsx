import { useState, useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { validateVideoFile } from "@/api/messagingService";

export default function FilmFeedbackForm({ onSend, sending }) {
  const [gameRef, setGameRef] = useState("");
  const [timestampRef, setTimestampRef] = useState("");
  const [body, setBody] = useState("");
  const [clip, setClip] = useState(null);
  const fileRef = useRef(null);

  const handleClip = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateVideoFile(file);
    if (!v.ok) {
      alert(v.error);
      return;
    }
    setClip(file);
  };

  const handleSend = () => {
    if (!body.trim() && !clip) return;
    const fullBody = [
      gameRef.trim() && `Game: ${gameRef.trim()}`,
      timestampRef.trim() && `Timestamp: ${timestampRef.trim()}`,
      body.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    onSend({
      body: fullBody,
      gameRef: gameRef.trim(),
      timestampRef: timestampRef.trim(),
      clip,
    });
  };

  return (
    <div className="space-y-3 p-3 rounded-xl bg-brand-charcoal border border-brand-gray/30">
      <div className="space-y-1">
        <Label className="text-xs text-brand-lightGray">Game or Practice</Label>
        <Input
          value={gameRef}
          onChange={(e) => setGameRef(e.target.value)}
          placeholder="vs CT Blackout 6/7"
          className="bg-brand-black border-brand-gray/30 text-brand-white text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-brand-lightGray">Timestamp</Label>
        <Input
          value={timestampRef}
          onChange={(e) => setTimestampRef(e.target.value)}
          placeholder="2:34 — defensive rotation"
          className="bg-brand-black border-brand-gray/30 text-brand-white text-sm"
        />
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Break down what you saw..."
        rows={3}
        className="bg-brand-black border-brand-gray/30 text-brand-white text-sm resize-none"
      />
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleClip}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          className="border-brand-gray/30 text-brand-lightGray"
        >
          <Paperclip className="w-4 h-4 mr-1" />
          Attach clip
        </Button>
        {clip && (
          <span className="text-xs text-brand-lightGray truncate flex-1">
            {clip.name}
          </span>
        )}
      </div>
      <Button
        onClick={handleSend}
        disabled={sending || (!body.trim() && !clip)}
        className="w-full bg-gradient-orange-blue text-white"
      >
        {sending ? "Sending..." : "Send Film Feedback"}
      </Button>
    </div>
  );
}
