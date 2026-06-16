import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

export default function UnreadMessagesBadge() {
  const { user, isAthlete } = useAuth();
  const { count } = useUnreadMessageCount(isAthlete() ? user?.id : null);

  if (!isAthlete() || !user || count === 0) return null;

  return (
    <Card className="bg-brand-blue/10 border-brand-blue/40">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <MessageCircle className="w-8 h-8 text-brand-blue shrink-0" />
          <p className="text-brand-white text-sm">
            You have {count} unread message{count === 1 ? "" : "s"} from your
            trainer
          </p>
        </div>
        <Link to="/messages">
          <Button size="sm" className="bg-brand-blue text-white shrink-0">
            View Messages
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
