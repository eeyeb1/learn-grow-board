import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, ArrowRight, Trash2, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, NotificationRow } from "@/hooks/useNotifications";

const CATEGORIES: { key: Exclude<NotificationRow["category"], 'company'>; label: string; text: string }[] = [
  { key: "application", label: "Application updates", text: "When an employer changes the status of an application." },
  { key: "placement", label: "Placements", text: "When you're accepted or a placement starts, completes or is cancelled." },
  { key: "hours", label: "Hour reviews", text: "Approvals, rejections and correction requests from your supervisor." },
  { key: "feedback", label: "Feedback & references", text: "When an employer adds feedback or writes a reference." },
  { key: "deadline", label: "Placement deadlines", text: "Reminders before a placement starts or ends." },
];
type Prefs = Record<Exclude<NotificationRow["category"], 'company'>, boolean>;
const DEFAULT_PREFS: Prefs = { application: true, placement: true, hours: true, feedback: true, deadline: true };

const NotificationCentre = () => {
  const { user } = useAuth();
  const n = useNotifications();
  const [params, setParams] = useSearchParams();
  const openId = params.get("open");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setPrefs(data ? { application: data.application, placement: data.placement, hours: data.hours, feedback: data.feedback, deadline: data.deadline } : DEFAULT_PREFS);
    });
  }, [user]);

  const setPref = async (key: keyof Prefs, value: boolean) => {
    if (!user || !prefs) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() });
    if (error) { setPrefs(prefs); toast.error("Could not save your preference."); }
  };

  const list = filter === "unread" ? n.items.filter((x) => !x.read_at) : n.items;
  // Details only render for a notification found in the user's own list.
  const open = openId ? n.items.find((x) => x.id === openId) : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications {n.unread > 0 && <span className="text-sm font-normal text-muted-foreground">({n.unread} unread)</span>}</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={filter === "all" ? "secondary" : "ghost"} onClick={() => setFilter("all")}>All</Button>
            <Button size="sm" variant={filter === "unread" ? "secondary" : "ghost"} onClick={() => setFilter("unread")}>Unread</Button>
            {n.unread > 0 && <Button size="sm" variant="outline" onClick={() => n.markRead(n.items.filter((x) => !x.read_at).map((x) => x.id))}>Mark all read</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {n.loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : n.error ? (
            <div className="text-center py-8"><AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" /><p>{n.error}</p><Button variant="outline" className="mt-3" onClick={n.reload}>Try again</Button></div>
          ) : openId && !open ? (
            <div className="text-center py-8 text-muted-foreground">
              This notification isn't available.
              <div><Button variant="link" onClick={() => setParams({})}>Back to all notifications</Button></div>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-accent mx-auto flex items-center justify-center mb-3"><Bell className="w-6 h-6 text-accent-foreground" /></div>
              <p className="font-medium text-foreground">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
              <p className="text-sm text-muted-foreground mt-1">Updates about your applications, placements and hours will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((x) => {
                const isOpen = x.id === openId;
                return (
                  <li key={x.id} className={`py-3 ${isOpen ? "bg-accent/40 -mx-3 px-3 rounded-lg" : ""}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-2 w-2 h-2 rounded-full shrink-0 ${x.read_at ? "bg-transparent" : "bg-primary"}`} />
                      <button className="min-w-0 flex-1 text-left" onClick={() => { n.markRead([x.id]); setParams(isOpen ? {} : { open: x.id }); }}>
                        <p className={`text-sm ${x.read_at ? "text-foreground" : "font-semibold text-foreground"}`}>{x.title}</p>
                        <p className="text-sm text-muted-foreground">{isOpen ? x.body ?? x.preview : x.preview}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(x.created_at).toLocaleString()}</p>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {x.link && (
                          <Button asChild size="sm" variant="ghost" onClick={() => n.markRead([x.id])}>
                            <Link to={x.link}>Open <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
                          </Button>
                        )}
                        {x.read_at && <Button size="sm" variant="ghost" className="hidden sm:inline-flex" onClick={() => n.markUnread(x.id)}>Mark unread</Button>}
                        <Button size="icon" variant="ghost" aria-label="Delete notification" onClick={() => n.remove(x.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!prefs ? <Skeleton className="h-40" /> : CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={`pref-${c.key}`} className="text-foreground">{c.label}</Label>
                <p className="text-sm text-muted-foreground">{c.text}</p>
              </div>
              <Switch id={`pref-${c.key}`} checked={prefs[c.key]} onCheckedChange={(v) => setPref(c.key, v)} />
            </div>
          ))}
          <div className="flex gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            Email notifications aren't available yet. All notifications are shown here in the app.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCentre;
