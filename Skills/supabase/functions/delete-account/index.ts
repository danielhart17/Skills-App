// Supabase Edge Function: account self-deletion
// User id is taken ONLY from the verified JWT — never from the request body.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AVATAR_BUCKET = "assets";
const AVATAR_FOLDER = "avatars";
const SESSION_VIDEO_BUCKET = "session-videos";

type AdminClient = ReturnType<typeof createClient>;

/** Recursively list object paths under a storage prefix. */
async function listStoragePaths(
  admin: AdminClient,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const paths: string[] = [];
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: 1000,
  });

  if (error) {
    console.warn(`Storage list failed for ${bucket}/${prefix}:`, error.message);
    return paths;
  }

  for (const item of data || []) {
    const childPath = prefix ? `${prefix}/${item.name}` : item.name;
    // Folders have no id in the Storage API listing.
    if (item.id === null) {
      const nested = await listStoragePaths(admin, bucket, childPath);
      paths.push(...nested);
    } else {
      paths.push(childPath);
    }
  }

  return paths;
}

async function deleteUserStorageFiles(
  admin: AdminClient,
  userId: string
): Promise<void> {
  // Session videos live at session-videos/{user_id}/...
  const sessionPaths = await listStoragePaths(
    admin,
    SESSION_VIDEO_BUCKET,
    userId
  );
  if (sessionPaths.length > 0) {
    const { error } = await admin.storage
      .from(SESSION_VIDEO_BUCKET)
      .remove(sessionPaths);
    if (error) {
      console.warn("Failed to remove session videos:", error.message);
    }
  }

  // Avatars live at assets/avatars/{user_id}-*
  const avatarListing = await admin.storage
    .from(AVATAR_BUCKET)
    .list(AVATAR_FOLDER, { limit: 1000 });
  if (avatarListing.error) {
    console.warn("Failed to list avatars:", avatarListing.error.message);
    return;
  }

  const avatarPaths = (avatarListing.data || [])
    .filter((f) => f.id !== null && f.name.startsWith(`${userId}-`))
    .map((f) => `${AVATAR_FOLDER}/${f.name}`);

  if (avatarPaths.length > 0) {
    const { error } = await admin.storage.from(AVATAR_BUCKET).remove(avatarPaths);
    if (error) {
      console.warn("Failed to remove avatars:", error.message);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing Supabase environment configuration");
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // 1) Verify JWT with the anon key — never trust a body user_id.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const jwt = authHeader.slice("Bearer ".length);
    const anonClient = createClient(supabaseUrl, anonKey);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(jwt);

    if (authError || !user?.id) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = user.id;

    // 2) Service-role client for privileged RPC / storage / auth admin.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 3) Anonymize PII (blocks on upcoming confirmed bookings).
    const { error: rpcError } = await admin.rpc("anonymize_user_for_deletion", {
      target_user_id: userId,
    });

    if (rpcError) {
      console.error("anonymize_user_for_deletion failed:", rpcError);
      return new Response(
        JSON.stringify({
          error: rpcError.message || "Account deletion blocked",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 409,
        }
      );
    }

    // 4) Remove user files from storage (best-effort; do not block delete).
    try {
      await deleteUserStorageFiles(admin, userId);
    } catch (storageErr) {
      console.warn("Storage cleanup error:", storageErr);
    }

    // 5) Delete the auth user.
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("auth.admin.deleteUser failed:", deleteAuthError);
      return new Response(
        JSON.stringify({
          error: deleteAuthError.message || "Failed to delete auth user",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // 6) Success
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error deleting account:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
