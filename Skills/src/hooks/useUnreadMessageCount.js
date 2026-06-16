import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";
import { getUnreadCount, subscribeToIncomingMessages } from "@/api/messagingService";

export function useUnreadMessageCount(userId) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      setLoading(false);
      return;
    }
    try {
      const n = await getUnreadCount(userId);
      setCount(n);
    } catch (e) {
      console.error("Unread count:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return undefined;

    let channel = null;
    try {
      channel = subscribeToIncomingMessages(userId, () => {
        refresh();
      });
    } catch (e) {
      console.warn("Unread realtime subscription disabled:", e);
      return undefined;
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId, refresh]);

  return { count, loading, refresh };
}
