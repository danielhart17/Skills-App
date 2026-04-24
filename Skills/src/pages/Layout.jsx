import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Home,
  Brain,
  Trophy,
  Users,
  User,
  Menu,
  LogOut,
  Shield,
  GraduationCap,
  Target,
  Calendar,
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
    title: "Learn",
    url: createPageUrl("Learn"),
    icon: Brain,
    description: "IQ & On Court Training",
  },
  {
    title: "Workouts",
    url: createPageUrl("Workouts"),
    icon: Trophy,
    description: "Practice & Test Your Skills",
  },
  {
    title: "Trainers",
    url: createPageUrl("Trainers"),
    icon: Users,
    description: "Find Coaches",
  },
  {
    title: "Events",
    url: createPageUrl("Events"),
    icon: Calendar,
    description: "Training Events",
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
  const { signOut, profile, role, isAdmin, isTrainer, isParent } = useAuth();

  // Build navigation items based on user role
  const getRoleSpecificNavItems = () => {
    // For parents, show parent-specific navigation
    if (isParent()) {
      return [
        {
          title: "Parent Dashboard",
          url: createPageUrl("ParentDashboard"),
          icon: Users,
          description: "Track Children",
        },
        {
          title: "Learn",
          url: createPageUrl("Learn"),
          icon: Brain,
          description: "IQ Training",
        },
        {
          title: "Workouts",
          url: createPageUrl("Workouts"),
          icon: Trophy,
          description: "Browse Workouts",
        },
        {
          title: "Profile",
          url: createPageUrl("Profile"),
          icon: User,
          description: "Your Account",
        },
      ];
    }

    // For trainers, only show the Trainer Dashboard
    if (isTrainer() && !isAdmin()) {
      return [
        {
          title: "Trainer Dashboard",
          url: createPageUrl("TrainerDashboard"),
          icon: GraduationCap,
          description: "Manage Content",
        },
      ];
    }

    // For admins, show all items plus admin dashboard
    const items = [...navigationItems];
    if (isAdmin()) {
      items.unshift({
        title: "Admin Dashboard",
        url: createPageUrl("AdminDashboard"),
        icon: Shield,
        description: "Full Access",
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
      <div className="p-6 border-b border-brand-gray/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/skills-logo-transparent.png"
              alt="Skills Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h2 className="font-bold text-xl text-brand-white">Skills</h2>
            <p className="text-sm text-brand-lightGray">Basketball Mastery</p>
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
                  ? "bg-gradient-orange-blue text-white shadow-lg shadow-brand-orange/20"
                  : "text-brand-lightGray hover:bg-brand-charcoal hover:text-brand-orange"
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
                      ? "text-white/80"
                      : "text-brand-gray"
                  }`}
                >
                  {item.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-brand-gray/30 space-y-3">
        {profile && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-brand-white">
                  {profile.full_name}
                </div>
                {!isTrainer() && (
                  <div className="text-xs text-brand-lightGray">
                    Level {profile.current_level}
                  </div>
                )}
              </div>
              {role !== "user" && (
                <Badge
                  variant={role === "admin" ? "default" : "secondary"}
                  className="bg-brand-orange text-white border-0"
                >
                  {role}
                </Badge>
              )}
            </div>
          </div>
        )}
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full justify-start text-brand-lightGray border-brand-gray/30 hover:text-red-500 hover:bg-brand-charcoal hover:border-red-500/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-charcoal">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-80 lg:flex-col">
        <div className="flex flex-col h-full bg-brand-black border-r border-brand-gray/30 shadow-2xl">
          <NavContent />
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-brand-black border-b border-brand-gray/30 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <img
                src="https://dadyciqoypfdeotuspms.supabase.co/storage/v1/object/public/assets/skills-logo-transparent.png"
                alt="Skills Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h1 className="font-bold text-xl text-brand-white">Skills</h1>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-brand-white hover:bg-brand-charcoal"
              >
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-80 p-0 bg-brand-black border-brand-gray/30"
            >
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-80">
        <div className="min-h-screen bg-brand-charcoal">{children}</div>
      </main>
    </div>
  );
}
