/**
 * Messaging schema reference — apply via:
 * supabase/migrations/add_messaging_system.sql
 *
 * Tables: trainer_athlete_connections, conversations, messages, message_attachments
 * Storage bucket: message-media (private, signed URLs in app)
 *
 * Enable Realtime on `messages` in Supabase Dashboard → Database → Replication
 */

export const MESSAGING_TABLES = {
  connections: "trainer_athlete_connections",
  conversations: "conversations",
  messages: "messages",
  attachments: "message_attachments",
};

export const MESSAGE_MEDIA_BUCKET = "message-media";
