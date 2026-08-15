import { supabase } from "@/api/supabaseClient";

/**
 * Resolve the auth user id for a trainers-row (connections use auth.users ids).
 */
export function getTrainerAuthUserId(trainer) {
  if (!trainer) return null;
  return trainer.user_id || trainer.userId || null;
}

export async function followTrainer(trainerUserId) {
  if (!trainerUserId) throw new Error("Trainer is required");

  const { data, error } = await supabase.rpc("follow_trainer", {
    p_trainer_user_id: trainerUserId,
  });

  if (error) {
    // Fallback if RPC not deployed yet
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error("Please sign in to follow trainers");

    const { data: upserted, error: upsertError } = await supabase
      .from("trainer_athlete_connections")
      .upsert(
        {
          trainer_id: trainerUserId,
          athlete_id: user.id,
          status: "active",
        },
        { onConflict: "trainer_id,athlete_id" }
      )
      .select()
      .single();

    if (upsertError) throw upsertError;
    return upserted;
  }

  return data;
}

export async function unfollowTrainer(trainerUserId) {
  if (!trainerUserId) throw new Error("Trainer is required");

  const { error } = await supabase.rpc("unfollow_trainer", {
    p_trainer_user_id: trainerUserId,
  });

  if (error) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.id) throw new Error("Please sign in");

    const { error: deleteError } = await supabase
      .from("trainer_athlete_connections")
      .delete()
      .eq("trainer_id", trainerUserId)
      .eq("athlete_id", user.id);

    if (deleteError) throw deleteError;
  }

  return true;
}

export async function fetchFollowedTrainerUserIds(athleteUserId) {
  if (!athleteUserId) return [];

  const { data, error } = await supabase
    .from("trainer_athlete_connections")
    .select("trainer_id")
    .eq("athlete_id", athleteUserId)
    .eq("status", "active");

  if (error) throw error;
  return (data || []).map((row) => row.trainer_id);
}

export async function isFollowingTrainer(athleteUserId, trainerUserId) {
  if (!athleteUserId || !trainerUserId) return false;

  const { data, error } = await supabase
    .from("trainer_athlete_connections")
    .select("id, status")
    .eq("athlete_id", athleteUserId)
    .eq("trainer_id", trainerUserId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

export async function notifyFollowersOfWorkout({
  workoutTitle,
  workoutId = null,
  link = null,
}) {
  if (!workoutTitle) return 0;

  const resolvedLink =
    link || (workoutId ? `/workouts/${workoutId}` : "/workouts");

  const { data, error } = await supabase.rpc("notify_followers_of_workout", {
    p_workout_title: workoutTitle,
    p_workout_id: workoutId,
    p_link: resolvedLink,
  });

  if (error) {
    console.warn("Could not notify followers of workout:", error);
    return 0;
  }

  return Number(data) || 0;
}

export async function fetchUnreadNotifications(userId, limit = 20) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (
      error.code === "42P01" ||
      error.message?.includes("notifications") ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function fetchRecentNotifications(userId, limit = 20) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (
      error.code === "42P01" ||
      error.message?.includes("notifications") ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    throw error;
  }

  return data || [];
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
}
