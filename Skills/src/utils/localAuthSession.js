const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function getAuthStorageKey() {
  try {
    const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

export function readLocalSession() {
  const key = getAuthStorageKey();
  if (!key) return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readLocalUser() {
  const session = readLocalSession();
  return session?.user ?? null;
}

export function readLocalAccessToken({ allowExpired = false } = {}) {
  const session = readLocalSession();
  const token = session?.access_token;
  if (!token) return null;

  if (!allowExpired) {
    const expiresAt = session?.expires_at;
    if (typeof expiresAt === "number") {
      const expiresMs = expiresAt > 1e12 ? expiresAt : expiresAt * 1000;
      if (Date.now() >= expiresMs - 30_000) {
        return null;
      }
    }
  }

  return token;
}

export function buildMetadataProfile(authUser, userId) {
  const metadataRole = authUser?.user_metadata?.role;
  const allowedRoles = ["user", "athlete", "parent", "trainer", "admin"];
  const safeRole = allowedRoles.includes(metadataRole) ? metadataRole : "user";

  return {
    id: userId,
    email: authUser?.email || null,
    full_name: authUser?.user_metadata?.full_name || "User",
    role: safeRole,
    current_level: 1,
    total_xp: 0,
    current_streak: 0,
    longest_streak: 0,
    entry_exam_completed: safeRole !== "user" && safeRole !== "athlete",
  };
}
