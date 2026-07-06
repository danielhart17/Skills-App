// Supabase Edge Function: delete the currently authenticated user's account.
//
// Required by Apple Guideline 5.1.1(v): apps that support account creation
// must let users delete their account from within the app.
//
// The caller must send their JWT in the Authorization header. We verify it,
// then use the service role to clean up FK references that do not cascade,
// remove any trainer row the user owns, delete the profile (which cascades
// most user-owned rows), and finally delete the auth.users row.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing bearer token" }, 401);
    }
    const jwt = authHeader.slice("Bearer ".length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Server misconfigured" }, 500);
    }

    // Verify the caller's JWT by using the anon client with their token.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json({ error: "Invalid token" }, 401);
    }
    const userId = userData.user.id;

    // Admin client for the actual destructive work.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Null out non-cascading audit references to auth.users so the auth
    //    row can be removed at the end.
    await admin
      .from("challenge_progress")
      .update({ completed_for_user_id: null })
      .eq("completed_for_user_id", userId);
    await admin
      .from("challenge_progress")
      .update({ completed_by_user_id: null })
      .eq("completed_by_user_id", userId);

    // 2. Null out non-cascading references to profiles so the profile row
    //    can be removed.
    await admin
      .from("child_invite_codes")
      .update({ used_by_parent_id: null })
      .eq("used_by_parent_id", userId);
    await admin.from("challenges").update({ created_by: null }).eq("created_by", userId);
    await admin
      .from("training_events")
      .update({ created_by: null })
      .eq("created_by", userId);
    await admin.from("lessons").update({ created_by: null }).eq("created_by", userId);

    // 3. If the user is a trainer, remove their trainer row. Dependents
    //    (bookings, availability, gallery, etc.) mostly cascade from trainers.id.
    await admin.from("trainers").delete().eq("user_id", userId);

    // 4. Delete the profile. This cascades to all user-owned rows that use
    //    profiles(id) ON DELETE CASCADE.
    const { error: profileErr } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId);
    if (profileErr) {
      console.error("Profile delete failed:", profileErr);
      return json({ error: "Failed to delete profile", details: profileErr.message }, 500);
    }

    // 5. Delete the auth user itself. Because we cleared the references
    //    above, this should succeed.
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) {
      console.error("Auth user delete failed:", authErr);
      return json({ error: "Failed to delete auth user", details: authErr.message }, 500);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("Unhandled error in delete-user-account:", err);
    return json({ error: "Unhandled error", details: String(err) }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
