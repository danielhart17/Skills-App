import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleRoute({ allowedRoles, children, redirectTo = "/home" }) {
  const { user, loading, role, profile } = useAuth();

  if (loading || !profile) {
    return (
      <div className="p-6 text-center text-brand-lightGray">Loading...</div>
    );
  }

  if (!user) {
    return <Navigate to="/home" replace />;
  }

  const normalized = allowedRoles.map((r) => r.toLowerCase());
  const userRole = (role || "user").toLowerCase();
  const athleteRoles = ["athlete", "user"];
  const allowed =
    normalized.includes(userRole) ||
    (normalized.includes("athlete") && athleteRoles.includes(userRole));

  if (!allowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
