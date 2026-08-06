import { createClient } from "@supabase/supabase-js";
import { readLocalAccessToken } from "@/utils/localAuthSession";

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables!");
  console.error("Please create a .env.local file with:");
  console.error("VITE_SUPABASE_URL=your_project_url");
  console.error("VITE_SUPABASE_ANON_KEY=your_anon_key");
}

// Avoid Navigator LockManager "lock was released because another request stole it"
// races (common on Vercel / multi-tab). Process-local lock is enough for SPA auth.
let authLockChain = Promise.resolve();
async function processAuthLock(_name, _acquireTimeout, fn) {
  const run = authLockChain.then(() => fn());
  // Keep the chain alive even if a lock holder rejects.
  authLockChain = run.catch(() => {});
  return run;
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: processAuthLock,
  },
  storage: {
    // Routes large uploads through storage.supabase.co (avoids buffering/hangs).
    useNewHostname: true,
  },
});

// Prefer the local persisted token so API calls don't contend on auth.getSession().
const originalGetAccessToken = supabaseClient._getAccessToken.bind(supabaseClient);
supabaseClient._getAccessToken = async () => {
  const localToken = readLocalAccessToken({ allowExpired: true });
  if (localToken) return localToken;

  try {
    return await Promise.race([
      originalGetAccessToken(),
      new Promise((_, reject) => {
        window.setTimeout(() => reject(new Error("Auth token timeout")), 2000);
      }),
    ]);
  } catch (error) {
    console.warn("Falling back to anon key for Supabase request:", error);
    return supabaseAnonKey;
  }
};

export const supabase = supabaseClient;

// Helper function to get current user
export const getCurrentUser = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to get current user's profile
export const getCurrentUserProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
};

// Auth helpers
export const signUp = async (email, password, fullName, selectedRole = "athlete") => {
  const allowedSignupRoles = ["athlete", "parent", "trainer"];
  const role = allowedSignupRoles.includes(selectedRole)
    ? selectedRole
    : "athlete";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
