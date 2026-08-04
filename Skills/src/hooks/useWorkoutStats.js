import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/api/supabaseClient";

/**
 * Lifetime workout completion stats for the authenticated athlete.
 * Counts rows in challenge_progress where is_completed = true.
 */
export function useWorkoutStats(userId) {
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setWorkoutsCompleted(0);
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("challenge_progress")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_completed", true);

      if (error) throw error;
      setWorkoutsCompleted(count ?? 0);
    } catch (e) {
      console.error("Workout stats:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { workoutsCompleted, loading, refresh };
}
