import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home,
  Brain,
  Dumbbell,
  Trophy,
  Users,
  User,
  Menu,
  LogOut,
  Shield,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

const navigationItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
    icon: Home,
    description: "Dashboard & Progress",
  },
  {
    title: "IQ Mode",
    url: createPageUrl("IQMode"),
    icon: Brain,
    description: "Basketball Theory",
  },
  {
    title: "On Court",
    url: createPageUrl("OnCourt"),
    icon: Dumbbell,
    description: "Skills & Drills",
  },
  {
    title: "Challenges",
    url: createPageUrl("Challenges"),
    icon: Trophy,
    description: "Practice Library",
  },
  {
    title: "Trainers",
    url: createPageUrl("Trainers"),
    icon: Users,
    description: "Find Coaches",
  },
  {
    title: "Profile",
    url: createPageUrl("Profile"),
    icon: User,
    description: "Your Stats",
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { signOut, profile, role, isAdmin, isTrainer } = useAuth();

  // Build navigation items based on user role
  const getRoleSpecificNavItems = () => {
    const items = [...navigationItems];

    // Add admin dashboard for admins (at the top)
    if (isAdmin()) {
      items.unshift({
        title: "Admin Dashboard",
        url: createPageUrl("AdminDashboard"),
        icon: Shield,
        description: "Full Access",
      });
    }
    // Add trainer dashboard ONLY for trainers (not admins, since admins have their own dashboard)
    else if (isTrainer()) {
      items.unshift({
        title: "Trainer Dashboard",
        url: createPageUrl("TrainerDashboard"),
        icon: GraduationCap,
        description: "Manage Content",
      });
    }

    return items;
  };

  const currentNavItems = getRoleSpecificNavItems();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-orange-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/skills-logo-transparent.png"
              alt="Skills Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h2 className="font-bold text-xl text-gray-900">Skills</h2>
            <p className="text-sm text-gray-500">Basketball Mastery</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {currentNavItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              onClick={() => setMobileMenuOpen(false)}
              className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                location.pathname === item.url
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                  : "text-gray-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              <item.icon
                className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                  location.pathname === item.url ? "text-white" : ""
                }`}
              />
              <div className="flex-1">
                <div className="font-semibold">{item.title}</div>
                <div
                  className={`text-xs opacity-75 ${
                    location.pathname === item.url
                      ? "text-orange-100"
                      : "text-gray-500"
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-orange-100 space-y-3">
        {profile && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {profile.full_name}
                </div>
                <div className="text-xs text-gray-500">
                  Level {profile.current_level}
                </div>
              </div>
              {role !== "user" && (
                <Badge variant={role === "admin" ? "default" : "secondary"}>
                  {role}
                </Badge>
              )}
            </div>
          </div>
        )}
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex flex-col h-full bg-white border-r border-orange-100 shadow-xl">
          <NavContent />
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-orange-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img
                src="https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/skills-logo-transparent.png"
                alt="Skills Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="font-bold text-xl text-gray-900">Skills</h1>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-80">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
