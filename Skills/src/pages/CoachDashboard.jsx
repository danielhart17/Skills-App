import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/api/supabaseClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2 } from "lucide-react";

const BRAND_ORANGE = "#E85D04";

export default function CoachDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [coachRow, setCoachRow] = useState(null);
  const [cleared, setCleared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      const [
        { data: row, error: rowError },
        { data: isCleared, error: clearedError },
      ] = await Promise.all([
        supabase
          .from("coaches")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.rpc("is_coach_cleared", { p_user_id: user.id }),
      ]);
      if (cancelled) return;
      if (rowError || clearedError) {
        if (rowError) console.error(rowError);
        if (clearedError) console.error(clearedError);
        setLoadError(true);
        setLoading(false);
        return;
      }
      setCoachRow(row ?? null);
      setCleared(Boolean(isCleared));
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ClipboardList className="w-8 h-8" style={{ color: BRAND_ORANGE }} />
          Coach Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Set up your profile and wait for clearance to create a team.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : loadError ? (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your coach profile — refresh to try again
        </p>
      ) : (
        <div className="space-y-4">
          {!cleared && (
            <Card className="shadow-xl bg-card border border-amber-500/40">
              <CardContent className="pt-6">
                <p className="text-sm text-foreground">
                  Your background check is pending. You can set up your profile
                  now — creating a team unlocks once you&apos;re cleared.
                </p>
              </CardContent>
            </Card>
          )}

          {!coachRow ? (
            <Card className="shadow-xl bg-card border border-border">
              <CardHeader>
                <CardTitle>Set up your coach profile</CardTitle>
                <CardDescription>
                  Add your name and organization so families know who you are.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="text-white font-semibold shadow-md hover:opacity-95"
                  style={{ backgroundColor: BRAND_ORANGE }}
                  onClick={() => navigate("/coach/profile")}
                >
                  Set up profile
                </Button>
              </CardContent>
            </Card>
          ) : cleared ? (
            <Card className="shadow-xl bg-card border border-border">
              <CardHeader>
                <CardTitle>Welcome, {coachRow.display_name}</CardTitle>
                <CardDescription>Teams coming soon.</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
