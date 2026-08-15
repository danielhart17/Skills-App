import WorkoutLibrary from "./WorkoutLibrary";
import AIWorkoutBuilder from "./AIWorkoutBuilder";
import Layout from "./Layout.jsx";

import Home from "./Home";

import Learn from "./Learn";

import LearningPath from "./LearningPath";

import LessonDetail from "./LessonDetail";

import QuestionPage from "./QuestionPage";

import Challenges from "./Challenges";

import ChallengeDetail from "./ChallengeDetail";
import DrillDetail from "./DrillDetail";

import ShootingSession from "./ShootingSession";
import SessionVideoReviewPage from "./SessionVideoReviewPage";
import RunTracker from "./RunTracker";

import Trainers from "./Trainers";

import Profile from "./Profile";

import TrainerProfile from "./TrainerProfile";

import Booking from "./Booking";

import AdminDashboard from "./AdminDashboard";

import TrainerDashboard from "./TrainerDashboard";

import ParentDashboard from "./ParentDashboard";

import WorkoutSession from "./WorkoutSession";

import Events from "./Events";

import SchedulePage from "./SchedulePage";

import TrainerMessagesPage from "./TrainerMessagesPage";
import AthleteMessagesPage from "./AthleteMessagesPage";
import TrainerAthletesPage from "./TrainerAthletesPage";
import RoleRoute from "@/components/RoleRoute";

import { Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Role-based redirect component
function RoleBasedRedirect() {
  const { loading, profile, user, role } = useAuth();

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/home" replace />;
  }

  const effectiveRole =
    profile?.role || user?.user_metadata?.role || role || "user";

  if (effectiveRole === "admin") {
    return <Navigate to="/admindashboard" replace />;
  }
  if (effectiveRole === "trainer") {
    return <Navigate to="/trainerdashboard" replace />;
  }
  if (effectiveRole === "parent") {
    return <Navigate to="/parentdashboard" replace />;
  }

  return <Navigate to="/home" replace />;
}

// Create a wrapper component that renders the Layout with all routes
function PagesContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RoleBasedRedirect />} />

        <Route path="/home" element={<Home />} />

        <Route path="/learn" element={<Learn />} />

        <Route path="/learningpath/:chapter" element={<LearningPath />} />

        <Route path="/lesson/:lessonId" element={<LessonDetail />} />

        <Route path="/lesson/:lessonId/questions" element={<QuestionPage />} />

        <Route path="/workouts" element={<Challenges />} />
        <Route path="/challenges" element={<Navigate to="/workouts" replace />} />

        <Route path="/workouts/:challengeId" element={<ChallengeDetail />} />
        <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />
        <Route path="/drills/:drillId" element={<DrillDetail />} />

        <Route path="/shootingsession" element={<ShootingSession />} />
        <Route
          path="/shootingsession/review/:videoId"
          element={<SessionVideoReviewPage />}
        />
        <Route path="/run-tracker" element={<RunTracker />} />

        <Route path="/trainers" element={<Trainers />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/trainerprofile" element={<TrainerProfile />} />

        <Route path="/booking" element={<Booking />} />

        <Route path="/admindashboard" element={<AdminDashboard />} />

        <Route path="/trainerdashboard" element={<TrainerDashboard />} />

        <Route path="/parentdashboard" element={<ParentDashboard />} />

        <Route path="/workout-session/:assignmentId" element={<WorkoutSession />} />

        <Route path="/events" element={<Events />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route
          path="/messages"
          element={
            <RoleRoute allowedRoles={["athlete", "user"]}>
              <AthleteMessagesPage />
            </RoleRoute>
          }
        />
        <Route
          path="/trainer/messages"
          element={
            <RoleRoute allowedRoles={["trainer", "admin"]}>
              <TrainerMessagesPage />
            </RoleRoute>
          }
        />
        <Route
          path="/trainer/athletes"
          element={
            <RoleRoute allowedRoles={["trainer", "admin"]}>
              <TrainerAthletesPage />
            </RoleRoute>
          }
        />
        <Route path="/drill-library" element={<WorkoutLibrary />} />
<Route path="/ai-workout-builder" element={<AIWorkoutBuilder />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return <PagesContent />;
}
