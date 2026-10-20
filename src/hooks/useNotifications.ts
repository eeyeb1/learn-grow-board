import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationRow = {
  id: string;
  category: "application" | "placement" | "hours" | "feedback" | "deadline";
  title: string;
  preview: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

/** Only the user's own notifications are returned (row-level security). */
export function useNotifications() {
  const { user, userType } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enabled = !!user && userType !== "company";

  const load = useCallback(async () => {
    if (!enabled) { setItems([]); setLoading(false); return; }
    setError(null);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, category, title, preview, body, link, read_at, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setError("Could not load notifications.");
    else setItems((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, [enabled, user]);

  useEffect(() => {
    if (!enabled) { setItems([]); setLoading(false); return; }
    supabase.rpc("sync_my_deadline_notifications").then(() => load());
    const channel = supabase
      .channel(`notifications-${user!.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user!.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, user, load]);

  const markRead = async (ids: string[]) => {
    if (!ids.length || !user) return;
    const now = new Date().toISOString();
    setItems((xs) => xs.map((n) => (ids.includes(n.id) && !n.read_at ? { ...n, read_at: now } : n)));
    await supabase.from("notifications").update({ read_at: now }).in("id", ids).eq("user_id", user.id).is("read_at", null);
  };
  const markUnread = async (id: string) => {
    if (!user) return;
    setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read_at: null } : n)));
    await supabase.from("notifications").update({ read_at: null }).eq("id", id).eq("user_id", user.id);
  };
  const remove = async (id: string) => {
    if (!user) return;
    setItems((xs) => xs.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id).eq("user_id", user.id);
  };

  const unread = items.filter((n) => !n.read_at).length;
  return { items, unread, loading, error, enabled, reload: load, markRead, markUnread, remove };
}
