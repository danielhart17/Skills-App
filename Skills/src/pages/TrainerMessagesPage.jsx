import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MessagingWorkspace from "@/components/messaging/MessagingWorkspace";
import { fetchTrainerActiveConnections } from "@/api/messagingService";

export default function TrainerMessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const athleteId = searchParams.get("athleteId");
  const compose = searchParams.get("compose");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchTrainerActiveConnections(user.id);
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
    <div className="p-4 lg:p-6 h-full">
      <h1 className="text-2xl font-bold text-brand-white mb-4">Messages</h1>
      <MessagingWorkspace
        mode="trainer"
        userId={user?.id}
        connections={connections}
        loadingConnections={loading}
        initialContactId={athleteId}
        initialComposeMode={compose}
        onRefreshConnections={load}
      />
    </div>
  );
}
