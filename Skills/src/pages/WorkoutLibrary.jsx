import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Drill Library was merged into the main Workouts page.
 * Keep this route as a redirect for old links/bookmarks.
 */
export default function WorkoutLibrary() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl("Workouts"), { replace: true });
  }, [navigate]);

  return null;
}
