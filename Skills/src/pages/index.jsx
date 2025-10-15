import Layout from "./Layout.jsx";

import Home from "./Home";

import IQMode from "./IQMode";

import LearningPath from "./LearningPath";

import LessonDetail from "./LessonDetail";

import QuestionPage from "./QuestionPage";

import OnCourt from "./OnCourt";

import Challenges from "./Challenges";

import ShootingSession from "./ShootingSession";

import Trainers from "./Trainers";

import Profile from "./Profile";

import TrainerProfile from "./TrainerProfile";

import Booking from "./Booking";

import AdminDashboard from "./AdminDashboard";

import TrainerDashboard from "./TrainerDashboard";

import Drills from "./Drills";

import DrillDetail from "./DrillDetail";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

// Create a wrapper component that renders the Layout with all routes
function PagesContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/Home" element={<Home />} />

        <Route path="/IQMode" element={<IQMode />} />

        <Route path="/LearningPath/:chapter" element={<LearningPath />} />

        <Route path="/lesson/:lessonId" element={<LessonDetail />} />

        <Route path="/lesson/:lessonId/questions" element={<QuestionPage />} />

        <Route path="/OnCourt" element={<OnCourt />} />

        <Route path="/Challenges" element={<Challenges />} />

        <Route path="/ShootingSession" element={<ShootingSession />} />

        <Route path="/Trainers" element={<Trainers />} />

        <Route path="/Profile" element={<Profile />} />

        <Route path="/TrainerProfile" element={<TrainerProfile />} />

        <Route path="/Booking" element={<Booking />} />

        <Route path="/AdminDashboard" element={<AdminDashboard />} />

        <Route path="/TrainerDashboard" element={<TrainerDashboard />} />

        <Route path="/drills" element={<Drills />} />

        <Route path="/drills/:drillId" element={<DrillDetail />} />
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
