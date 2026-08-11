import { format, parseISO } from "date-fns";
import { Film, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import WorkoutMessageCard from "./WorkoutMessageCard";
import MediaAttachment from "./MediaAttachment";

function parseFilmFeedback(body) {
  if (!body) return { gameRef: "", timestampRef: "", text: "" };
  const lines = body.split("\n\n");
  let gameRef = "";
  let timestampRef = "";
  const rest = [];
  lines.forEach((line) => {
    if (line.startsWith("Game: ")) gameRef = line.replace("Game: ", "");
    else if (line.startsWith("Timestamp: ")) timestampRef = line.replace("Timestamp: ", "");
    else rest.push(line);
  });
  return { gameRef, timestampRef, text: rest.join("\n\n") };
}

export default function MessageBubble({
  message,
  isOwn,
  athleteId,
  isTrainerView,
  onReply,
  onGiveFeedback,
}) {
  const name = message.senderProfile?.full_name || "User";
  const initials = name.slice(0, 2).toUpperCase();
  const time = format(parseISO(message.created_at), "h:mm a");

  const bubbleBase = isOwn
    ? "bg-brand-blue text-white ml-auto"
    : "bg-brand-gray/40 text-brand-white mr-auto";

  const renderContent = () => {
    if (message.message_type === "workout") {
      return (
        <WorkoutMessageCard
          payload={message.workout_payload}
          athleteId={athleteId}
          isAthleteView={!isTrainerView}
        />
      );
    }

    if (message.message_type === "film_feedback") {
      const { gameRef, timestampRef, text } = parseFilmFeedback(message.body);
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-orange text-sm font-medium">
            <Film className="w-4 h-4" />
            Film Feedback
          </div>
          {(gameRef || timestampRef) && (
            <div className="flex flex-wrap gap-1">
              {gameRef && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-orange/20 text-orange-300">
                  {gameRef}
                </span>
              )}
              {timestampRef && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-blue/20 text-blue-300">
                  {timestampRef}
                </span>
              )}
            </div>
          )}
          {text && <p className="text-sm whitespace-pre-wrap">{text}</p>}
          {(message.attachments || []).map((a) => (
            <MediaAttachment key={a.id} attachment={a} />
          ))}
          {!isOwn && isTrainerView && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 text-brand-lightGray"
              onClick={() =>
                onReply?.(
                  `Re: ${gameRef || "Film"}${timestampRef ? ` @ ${timestampRef}` : ""} — `
                )
              }
            >
              Reply to this
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {message.body && (
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        )}
        {(message.attachments || []).map((a) => (
          <MediaAttachment key={a.id} attachment={a} />
        ))}
      </div>
    );
  };

  return (
    <div
      className={`flex gap-2 max-w-[85%] ${isOwn ? "flex-row-reverse ml-auto" : "mr-auto"}`}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarImage src={message.senderProfile?.avatar_url} />
        <AvatarFallback className="text-xs bg-brand-charcoal">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-3 py-2 ${message.message_type === "workout" ? "" : bubbleBase}`}
        >
          {renderContent()}
        </div>
        <div
          className={`flex items-center gap-2 mt-1 text-[10px] text-brand-gray ${isOwn ? "flex-row-reverse" : ""}`}
        >
          <span>{name}</span>
          <span>{time}</span>
        </div>
        {!isOwn &&
          isTrainerView &&
          (message.message_type === "text" ||
            message.message_type === "film_feedback") && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] mt-0.5 text-brand-lightGray px-1"
              onClick={() => onGiveFeedback?.(message)}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Give Feedback
            </Button>
          )}
      </div>
    </div>
  );
}
