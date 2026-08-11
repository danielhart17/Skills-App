import { useState, useEffect, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import MessageBubble from "./MessageBubble";
import MessageComposer from "./MessageComposer";
import {
  fetchMessages,
  markConversationRead,
  sendMessage,
  getOrCreateConversation,
  subscribeToConversation,
  getMessagePreview,
  uploadMessageMedia,
} from "@/api/messagingService";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import {
  notifyAthleteNewMessage,
  notifyAthleteNewWorkout,
  notifyTrainerAthleteReply,
} from "@/utils/notificationScheduler";

export default function MessagingWorkspace({
  mode,
  userId,
  connections,
  loadingConnections,
  initialContactId,
  initialComposeMode,
  onRefreshConnections,
}) {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyPrefix, setReplyPrefix] = useState("");
  const [composeMode, setComposeMode] = useState(null);
  const threadRef = useRef(null);
  const isTrainer = mode === "trainer";

  const contactKey = isTrainer ? "athlete_id" : "trainer_id";

  const filtered = connections.filter((c) =>
    (c.profile?.full_name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!initialContactId || !connections.length) return;
    const match = connections.find((c) => c[contactKey] === initialContactId);
    if (match) {
      setSelected(match);
      if (initialComposeMode === "workout") setComposeMode("workout");
    }
  }, [initialContactId, connections, contactKey, initialComposeMode]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const data = await fetchMessages(conversationId);
      setMessages(data);
      await markConversationRead(conversationId, userId);
      onRefreshConnections?.();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  }, [userId, onRefreshConnections]);

  useEffect(() => {
    if (!selected?.conversation?.id && selected) {
      (async () => {
        const conv = await getOrCreateConversation(
          selected.trainer_id,
          selected.athlete_id
        );
        setSelected((prev) => ({ ...prev, conversation: conv }));
        await loadMessages(conv.id);
      })();
      return;
    }
    if (selected?.conversation?.id) {
      loadMessages(selected.conversation.id);
    } else {
      setMessages([]);
    }
  }, [selected?.conversation?.id, selected?.trainer_id, selected?.athlete_id, loadMessages]);

  useEffect(() => {
    const convId = selected?.conversation?.id;
    if (!convId) return undefined;

    const channel = subscribeToConversation(convId, async (newRow) => {
      const full = await fetchMessages(convId);
      setMessages(full);
      if (newRow.receiver_id === userId) {
        await markConversationRead(convId, userId);
        onRefreshConnections?.();
      }
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selected?.conversation?.id, userId, onRefreshConnections]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  const contactName = selected?.profile?.full_name || "Contact";
  const otherUserId = selected?.[contactKey];
  const trainerId = selected?.trainer_id;
  const athleteId = selected?.athlete_id;

  const handleSend = async (payload) => {
    if (!selected || !otherUserId) return;

    let conv = selected.conversation;
    if (!conv) {
      conv = await getOrCreateConversation(trainerId, athleteId);
    }

    const {
      body,
      messageType,
      workoutPayload,
      attachments,
      clipFile,
    } = payload;

    let uploaded = attachments || [];
    if (clipFile) {
      const up = await uploadMessageMedia(clipFile, userId);
      uploaded = [...uploaded, up];
    }

    await sendMessage({
      conversationId: conv.id,
      senderId: userId,
      receiverId: otherUserId,
      body,
      messageType: messageType || (uploaded.length ? "media" : "text"),
      workoutPayload,
      attachments: uploaded,
    });

    if (isTrainer) {
      if (messageType === "workout") {
        notifyAthleteNewWorkout(
          profile?.full_name || "Your trainer",
          workoutPayload?.title,
          workoutPayload?.scheduled_date
        );
      } else {
        notifyAthleteNewMessage(
          profile?.full_name || "Your trainer",
          body || "New message"
        );
      }
    } else {
      notifyTrainerAthleteReply(
        profile?.full_name || "Athlete",
        body || "New message"
      );
    }

    const full = await fetchMessages(conv.id);
    setMessages(full);
    setReplyPrefix("");
    setComposeMode(null);
    onRefreshConnections?.();
  };

  const handleGiveFeedback = (message) => {
    if (message.message_type === "film_feedback") {
      setReplyPrefix(`Re: film feedback — `);
    } else {
      setReplyPrefix(`Feedback on your message: `);
    }
    setComposeMode("text");
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)] max-h-[100dvh] bg-brand-charcoal rounded-xl border border-brand-gray/30 overflow-hidden">
      {/* Left panel */}
      <div
        className={`w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-brand-gray/30 flex flex-col bg-brand-black ${
          selected ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="p-3 border-b border-brand-gray/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gray" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-brand-charcoal border-brand-gray/30 text-brand-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConnections ? (
            <p className="p-4 text-sm text-brand-gray">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-brand-lightGray text-sm">
              <p className="font-medium mb-1">No {isTrainer ? "athletes" : "trainers"} yet</p>
              <p className="text-brand-gray text-xs">
                {isTrainer
                  ? "Connect with athletes to start messaging."
                  : "Ask your trainer to connect with you."}
              </p>
            </div>
          ) : (
            filtered.map((conn) => {
              const id = conn[contactKey];
              const active = selected?.[contactKey] === id;
              const preview = getMessagePreview(conn.lastMessage);
              const ts = conn.lastMessage?.created_at
                ? format(parseISO(conn.lastMessage.created_at), "MMM d")
                : "";

              return (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => {
                    setSelected(conn);
                    setComposeMode(null);
                    setReplyPrefix("");
                  }}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-brand-charcoal transition-colors ${
                    active ? "bg-brand-charcoal" : ""
                  }`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={conn.profile?.avatar_url} />
                    <AvatarFallback>
                      {(conn.profile?.full_name || "?").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-medium text-brand-white truncate text-sm">
                        {conn.profile?.full_name}
                      </span>
                      <span className="text-[10px] text-brand-gray shrink-0">
                        {ts}
                      </span>
                    </div>
                    <p className="text-xs text-brand-gray truncate">{preview}</p>
                  </div>
                  {conn.unreadCount > 0 && (
                    <Badge className="bg-red-500 text-white border-0 h-5 min-w-5 flex items-center justify-center text-[10px]">
                      {conn.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      <div
        className={`flex-1 flex flex-col min-h-0 min-w-0 ${
          selected ? "flex" : "hidden lg:flex"
        }`}
      >
        {selected ? (
          <>
            <div className="p-3 border-b border-brand-gray/30 bg-brand-black flex items-center gap-3 shrink-0">
              <button
                type="button"
                className="lg:hidden text-brand-lightGray text-sm"
                onClick={() => setSelected(null)}
              >
                ← Back
              </button>
              <Avatar className="w-9 h-9">
                <AvatarImage src={selected.profile?.avatar_url} />
                <AvatarFallback>{contactName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-brand-white">{contactName}</span>
            </div>

            <div
              ref={threadRef}
              className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0"
            >
              {loadingMessages ? (
                <p className="text-center text-brand-gray text-sm">Loading messages...</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-brand-gray text-sm py-8">
                  No messages yet. Say hello!
                </p>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isOwn={m.sender_id === userId}
                    athleteId={athleteId}
                    isTrainerView={isTrainer}
                    onReply={setReplyPrefix}
                    onGiveFeedback={handleGiveFeedback}
                  />
                ))
              )}
            </div>

            <MessageComposer
              mode={mode}
              userId={userId}
              contactName={contactName}
              replyPrefix={replyPrefix}
              onClearReply={() => setReplyPrefix("")}
              composeMode={composeMode}
              onComposeModeChange={setComposeMode}
              onSend={handleSend}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-brand-gray text-sm p-6 text-center">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
