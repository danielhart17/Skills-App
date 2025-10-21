import Layout from "./Layout.jsx";

import Home from "./Home";

import Learn from "./Learn";

import LearningPath from "./LearningPath";

import LessonDetail from "./LessonDetail";

import QuestionPage from "./QuestionPage";

import Challenges from "./Challenges";

import ChallengeDetail from "./ChallengeDetail";

import ShootingSession from "./ShootingSession";

import Trainers from "./Trainers";

import Profile from "./Profile";

import TrainerProfile from "./TrainerProfile";

import Booking from "./Booking";

import AdminDashboard from "./AdminDashboard";

import TrainerDashboard from "./TrainerDashboard";

import Events from "./Events";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// Role-based redirect component
function RoleBasedRedirect() {
  const { isAdmin, isTrainer, loading, profile, user } = useAuth();

  // Wait for auth to load before redirecting
  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  // If user is not authenticated, redirect to home
  if (!user) {
    return <Navigate to="/Home" replace />;
  }

  // If profile is not loaded yet, show loading
  if (!profile) {
    return <div className="p-6 text-center">Loading profile...</div>;
  }

  if (isAdmin()) {
    return <Navigate to="/AdminDashboard" replace />;
  } else if (isTrainer()) {
    return <Navigate to="/TrainerDashboard" replace />;
  } else {
    return <Navigate to="/Home" replace />;
  }
}

// Create a wrapper component that renders the Layout with all routes
function PagesContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RoleBasedRedirect />} />

        <Route path="/Home" element={<Home />} />

        <Route path="/Learn" element={<Learn />} />

        <Route path="/LearningPath/:chapter" element={<LearningPath />} />

        <Route path="/lesson/:lessonId" element={<LessonDetail />} />

        <Route path="/lesson/:lessonId/questions" element={<QuestionPage />} />

        <Route path="/Challenges" element={<Challenges />} />

        <Route path="/challenges/:challengeId" element={<ChallengeDetail />} />

        <Route path="/ShootingSession" element={<ShootingSession />} />

        <Route path="/Trainers" element={<Trainers />} />

        <Route path="/Profile" element={<Profile />} />

        <Route path="/TrainerProfile" element={<TrainerProfile />} />

        <Route path="/Booking" element={<Booking />} />

        <Route path="/AdminDashboard" element={<AdminDashboard />} />

        <Route path="/TrainerDashboard" element={<TrainerDashboard />} />

        <Route path="/Events" element={<Events />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
