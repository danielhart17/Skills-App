import { supabase } from "@/api/supabaseClient";

/** Resolve a navigable detail URL for a scheduled athlete_event. */
export function getScheduleEventHref(event) {
  if (!event) return null;
  if (event.drill_id) return `/drills/${event.drill_id}`;
  if (event.challenge_id) return `/workouts/${event.challenge_id}`;
  return null;
}

export function isDrillLike(item) {
  if (!item) return false;
  if (item._sourceType === "drill") return true;
  if (item._sourceType === "challenge") return false;
  return Array.isArray(item.steps);
}

export function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match ? match[1] : null;
}

/**
 * Load drill/workout media for a scheduled event so Schedule can show the video.
 * Uses linked IDs first, then title match as a fallback for older events.
 */
export async function loadScheduleEventSource(event) {
  if (!event) return null;

  if (event.drill_id) {
    const { data, error } = await supabase
      .from("drills")
      .select("id, title, description, youtube_url, setup, steps, focus, duration_minutes, difficulty, category")
      .eq("id", event.drill_id)
      .maybeSingle();
    if (!error && data) {
      return { ...data, sourceType: "drill", href: `/drills/${data.id}` };
    }
  }

  if (event.challenge_id) {
    const { data, error } = await supabase
      .from("challenges")
      .select(
        "id, title, description, youtube_url, setup, instructions, focus, duration_minutes, difficulty, category"
      )
      .eq("id", event.challenge_id)
      .maybeSingle();
    if (!error && data) {
      return { ...data, sourceType: "challenge", href: `/workouts/${data.id}` };
    }
  }

  // Fallback for events scheduled before drill_id/challenge_id existed
  if (event.event_type === "workout" && event.title) {
    const title = event.title.trim();
    const [{ data: drill }, { data: challenge }] = await Promise.all([
      supabase
        .from("drills")
        .select("id, title, description, youtube_url, setup, steps, focus, duration_minutes, difficulty, category")
        .ilike("title", title)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("challenges")
        .select(
          "id, title, description, youtube_url, setup, instructions, focus, duration_minutes, difficulty, category"
        )
        .ilike("title", title)
        .limit(1)
        .maybeSingle(),
    ]);

    if (drill) {
      return { ...drill, sourceType: "drill", href: `/drills/${drill.id}` };
    }
    if (challenge) {
      return {
        ...challenge,
        sourceType: "challenge",
        href: `/workouts/${challenge.id}`,
      };
    }
  }

  return null;
}
