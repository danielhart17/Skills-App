import { supabase } from "@/api/supabaseClient";

const BUCKET = "message-media";
const MAX_FILE_BYTES = 100 * 1024 * 1024;

export function validateMediaFile(file) {
  if (!file) return { ok: false, error: "No file selected" };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File must be under 100MB" };
  }
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return { ok: false, error: "Only image and video files are allowed" };
  }
  return { ok: true, fileType: isImage ? "image" : "video" };
}

export function validateVideoFile(file) {
  if (!file) return { ok: false, error: "No file selected" };
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File must be under 100MB" };
  }
  if (!file.type.startsWith("video/")) {
    return { ok: false, error: "Only video files are allowed" };
  }
  return { ok: true, fileType: "video" };
}

export async function uploadMessageMedia(file, senderId, onProgress) {
  const validation = validateMediaFile(file);
  if (!validation.ok) throw new Error(validation.error);

  const ext = file.name.split(".").pop() || "bin";
  const path = `${senderId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  onProgress?.(10);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  onProgress?.(90);

  onProgress?.(100);

  return {
    file_url: path,
    file_type: validation.fileType,
    file_name: file.name,
    file_size_bytes: file.size,
    storage_path: path,
  };
}

export async function getOrCreateConversation(trainerId, athleteId) {
  const { data: existing, error: findErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: created, error: insertErr } = await supabase
    .from("conversations")
    .insert({ trainer_id: trainerId, athlete_id: athleteId })
    .select()
    .single();

  if (insertErr) throw insertErr;
  return created;
}

export async function fetchTrainerActiveConnections(trainerId) {
  const { data: connections, error } = await supabase
    .from("trainer_athlete_connections")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("status", "active");

  if (error) throw error;
  return enrichConnectionsWithProfiles(connections || [], "athlete_id");
}

export async function fetchAthleteActiveConnections(athleteId) {
  const { data: connections, error } = await supabase
    .from("trainer_athlete_connections")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("status", "active");

  if (error) throw error;
  return enrichConnectionsWithProfiles(connections || [], "trainer_id");
}

async function enrichConnectionsWithProfiles(connections, profileKey) {
  if (!connections.length) return [];

  const profileIds = [...new Set(connections.map((c) => c[profileKey]))];
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .in("id", profileIds);

  if (error) throw error;
  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  const convPromises = connections.map(async (conn) => {
    const trainerId = conn.trainer_id;
    const athleteId = conn.athlete_id;
    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("trainer_id", trainerId)
      .eq("athlete_id", athleteId)
      .maybeSingle();

    let lastMessage = null;
    let unreadCount = 0;

    if (conv) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, body, message_type, created_at, sender_id, receiver_id, read_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1);

      lastMessage = msgs?.[0] || null;

      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("receiver_id", profileKey === "athlete_id" ? trainerId : athleteId)
        .is("read_at", null);

      unreadCount = count ?? 0;
    }

    return {
      ...conn,
      profile: profileMap[conn[profileKey]],
      conversation: conv,
      lastMessage,
      unreadCount,
    };
  });

  return Promise.all(convPromises);
}

export async function fetchMessages(conversationId) {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!messages?.length) return [];

  const ids = messages.map((m) => m.id);
  const { data: attachments, error: attErr } = await supabase
    .from("message_attachments")
    .select("*")
    .in("message_id", ids);

  if (attErr) throw attErr;

  const attByMessage = (attachments || []).reduce((acc, a) => {
    if (!acc[a.message_id]) acc[a.message_id] = [];
    acc[a.message_id].push(a);
    return acc;
  }, {});

  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", senderIds);

  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  return messages.map((m) => ({
    ...m,
    attachments: attByMessage[m.id] || [],
    senderProfile: profileMap[m.sender_id],
  }));
}

export async function markConversationRead(conversationId, receiverId) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("receiver_id", receiverId)
    .is("read_at", null);

  if (error) throw error;
}

export async function sendMessage({
  conversationId,
  senderId,
  receiverId,
  body,
  messageType = "text",
  workoutPayload = null,
  attachments = [],
}) {
  const insertPayload = {
    conversation_id: conversationId,
    sender_id: senderId,
    receiver_id: receiverId,
    body: body || null,
    message_type: messageType,
    workout_payload: workoutPayload,
  };

  if (attachments.length && messageType === "text") {
    insertPayload.message_type = "media";
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;

  if (attachments.length) {
    const rows = attachments.map((a) => ({
      message_id: message.id,
      file_url: a.file_url,
      file_type: a.file_type,
      file_name: a.file_name,
      file_size_bytes: a.file_size_bytes,
    }));
    const { error: attError } = await supabase
      .from("message_attachments")
      .insert(rows);
    if (attError) throw attError;
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return message;
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) {
    // Messaging is optional in some local/dev databases. A missing table should
    // not crash the authenticated app shell.
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message?.toLowerCase().includes("messages")
    ) {
      return 0;
    }
    throw error;
  }
  return count ?? 0;
}

export function getMessagePreview(message) {
  if (!message) return "";
  if (message.message_type === "workout") return "🏀 Workout sent";
  if (message.message_type === "film_feedback") return "🎬 Film feedback";
  if (message.message_type === "media") return "📎 Media attachment";
  return (message.body || "").slice(0, 40);
}

export async function addWorkoutToCalendar(athleteId, workoutPayload) {
  const drillsText = (workoutPayload.drills || [])
    .map((d, i) => `${i + 1}. ${d.name} — ${d.sets}${d.notes ? ` (${d.notes})` : ""}`)
    .join("\n");

  const notes = [
    workoutPayload.trainer_notes,
    `Intensity: ${workoutPayload.intensity}`,
    "Drills:",
    drillsText,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await supabase.from("athlete_events").insert({
    athlete_id: athleteId,
    title: workoutPayload.title,
    event_type: "workout",
    event_date: workoutPayload.scheduled_date,
    start_time: workoutPayload.scheduled_time,
    notes,
  });

  if (error) throw error;
}

export function subscribeToConversation(conversationId, onInsert) {
  const channel = supabase
    .channel(`messages:${conversationId}:${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return channel;
}

export async function getSignedMediaUrl(storagePath) {
  if (!storagePath) return null;
  if (storagePath.startsWith("http")) return storagePath;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export function subscribeToIncomingMessages(userId, onInsert) {
  const channelName =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `inbox:${userId}:${crypto.randomUUID()}`
      : `inbox:${userId}:${Date.now()}:${Math.random()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new)
    )
    .subscribe();

  return channel;
}
