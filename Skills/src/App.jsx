import { useEffect } from "react";
import "./App.css";
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "@/pages/Auth";
import EntryExam from "@/pages/EntryExam";
import DailyCheckin from "@/components/DailyCheckin";
import { BrowserRouter } from "react-router-dom";
import { requestNotificationPermission } from "@/utils/notificationScheduler";
import { GAMIFICATION_UPDATED_EVENT } from "@/utils/accountabilityUtils";

function AppContent() {
  const { user, loading, profile, profileLoaded } = useAuth();

  useEffect(() => {
    if (user) {
      requestNotificationPermission();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏀</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Check if user needs to complete entry exam (only for regular users)
  // Only show if profile was successfully loaded (not on timeout/error)
  // Admins and trainers skip the entry exam
  if (
    profileLoaded &&
    profile &&
    !profile.entry_exam_completed &&
    profile.role === "user"
  ) {
    return <EntryExam />;
  }

  return (
    <>
      <DailyCheckin
        athleteId={user?.id}
        onGamificationUpdate={() =>
          window.dispatchEvent(new CustomEvent(GAMIFICATION_UPDATED_EVENT))
        }
      />
      <Pages />
      <Toaster />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
