import Layout from "./Layout.jsx";

import Home from "./Home";

import IQMode from "./IQMode";

import OnCourt from "./OnCourt";

import Challenges from "./Challenges";

import ShootingSession from "./ShootingSession";

import Trainers from "./Trainers";

import Profile from "./Profile";

import TrainerProfile from "./TrainerProfile";

import Booking from "./Booking";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    IQMode: IQMode,
    
    OnCourt: OnCourt,
    
    Challenges: Challenges,
    
    ShootingSession: ShootingSession,
    
    Trainers: Trainers,
    
    Profile: Profile,
    
    TrainerProfile: TrainerProfile,
    
    Booking: Booking,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/IQMode" element={<IQMode />} />
                
                <Route path="/OnCourt" element={<OnCourt />} />
                
                <Route path="/Challenges" element={<Challenges />} />
                
                <Route path="/ShootingSession" element={<ShootingSession />} />
                
                <Route path="/Trainers" element={<Trainers />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/TrainerProfile" element={<TrainerProfile />} />
                
                <Route path="/Booking" element={<Booking />} />
                
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