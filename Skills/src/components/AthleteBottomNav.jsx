import { Link, useLocation } from "react-router-dom";
import { Home, MessageCircle, CalendarDays, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { createPageUrl } from "@/utils";

const tabs = [
  { label: "Home", icon: Home, path: createPageUrl("Home") },
  { label: "Messages", icon: MessageCircle, path: "/messages" },
  { label: "Schedule", icon: CalendarDays, path: createPageUrl("Schedule") },
  { label: "Profile", icon: User, path: createPageUrl("Profile") },
];

export default function AthleteBottomNav() {
  const location = useLocation();
  const { user, isAthlete, isParent } = useAuth();
  const { count } = useUnreadMessageCount(
    isAthlete() && !isParent() ? user?.id : null
  );

  if (!isAthlete() || isParent()) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-black border-t border-brand-gray/30 safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;
          const showBadge = tab.path === "/messages" && count > 0;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                active ? "text-brand-orange" : "text-brand-gray"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
              {showBadge && (
                <span className="absolute top-2 right-1/4 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
