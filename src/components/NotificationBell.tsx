import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";

/** Bell with unread count. Shows only generic previews, never placement details. */
const NotificationBell = () => {
  const { items, unread, enabled, markRead } = useNotifications();
  const navigate = useNavigate();
  if (!enabled) return null;
  const recent = items.slice(0, 6);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="font-semibold text-sm text-foreground">Notifications</p>
          {unread > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={() => markRead(items.filter((n) => !n.read_at).map((n) => n.id))}>
              Mark all read
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6 text-center">You're all caught up.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {recent.map((n) => (
              <li key={n.id}>
                <button
                  className="w-full text-left px-4 py-3 hover:bg-accent/60 border-b border-border last:border-0 flex gap-2"
                  onClick={() => { markRead([n.id]); navigate(`/dashboard/notifications?open=${n.id}`); }}
                >
                  {!n.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />}
                  <span className="min-w-0">
                    <span className={`block text-sm ${n.read_at ? "text-muted-foreground" : "font-medium text-foreground"}`}>{n.title}</span>
                    <span className="block text-xs text-muted-foreground truncate">{n.preview}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/dashboard/notifications" className="block text-center text-sm text-primary py-2.5 border-t border-border hover:bg-accent/40">
          View all notifications
        </Link>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
