import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import MessagingWorkspace from "@/components/messaging/MessagingWorkspace";
import { fetchAthleteActiveConnections } from "@/api/messagingService";

export default function AthleteMessagesPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchAthleteActiveConnections(user.id);
      setConnections(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold text-brand-white mb-4">Messages</h1>
      <MessagingWorkspace
        mode="athlete"
        userId={user?.id}
        connections={connections}
        loadingConnections={loading}
        onRefreshConnections={load}
      />
    </div>
  );
}
