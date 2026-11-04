import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatHours } from "@/hooks/useSeekerDashboard";
import { HOUR_FLAG_LABELS, hourStatusLabel, type HourStatus } from "@/lib/hourVerification";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Check, History, Hourglass, PencilLine, X } from "lucide-react";

interface QueueEntry {
  id: string; placement_id: string; seeker_name: string; job_title: string; company_name: string;
  work_date: string; start_time: string | null; end_time: string | null; break_minutes: number; minutes: number;
  description: string; status: HourStatus; reviewer_note: string | null; reviewed_at: string | null; revision: number; flags: string[];
}
interface QueuePlacement { placement_id: string; job_title: string; seeker_name: string; status: string; approved_minutes: number; pending_minutes: number }
interface HistoryEvent { id: string; action: string; actor_role: string; from_status: string | null; to_status: string | null; note: string | null; created_at: string }

const t = (v: string | null) => (v ? v.slice(0, 5) : "");
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString();

const HourApprovals = () => {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [placements, setPlacements] = useState<QueuePlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<HourStatus>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEvent[]>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(false);
    const { data, error } = await supabase.rpc("list_hour_review_queue");
    if (error) { setError(true); setLoading(false); return; }
    const d = (data ?? {}) as { entries?: QueueEntry[]; placements?: QueuePlacement[] };
    setEntries(d.entries ?? []); setPlacements(d.placements ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/employer/sign-in" replace />;

  const review = async (id: string, decision: "approve" | "reject" | "request_correction") => {
    const note = notes[id]?.trim() ?? "";
    if (decision !== "approve" && note.length < 5) return toast.error("Please give a reason of at least 5 characters");
    setBusy(id);
    const { error } = await supabase.rpc("review_hour_entry", { _entry_id: id, _decision: decision, _note: note || null });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(decision === "approve" ? "Hours approved" : decision === "reject" ? "Hours rejected" : "Correction requested");
    setNotes({ ...notes, [id]: "" });
    load();
  };

  const toggleHistory = async (id: string) => {
    if (history[id]) { const { [id]: _, ...rest } = history; return setHistory(rest); }
    const { data, error } = await supabase.from("hour_entry_events").select("id, action, actor_role, from_status, to_status, note, created_at").eq("entry_id", id).order("created_at");
    if (error) return toast.error("Couldn't load history");
    setHistory({ ...history, [id]: data ?? [] });
  };

  const shown = entries.filter((r) => r.status === filter);
  const count = (s: HourStatus) => entries.filter((e) => e.status === s).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">Hours verification</h1>
        <p className="text-muted-foreground mb-6">Entries from placements where you are the assigned supervisor. Only approved hours count towards a participant's verified total.</p>

        {!loading && !error && placements.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {placements.map((p) => (
              <Card key={p.placement_id}><CardContent className="p-4">
                <p className="font-medium text-foreground">{p.seeker_name}</p>
                <p className="text-xs text-muted-foreground mb-2">{p.job_title}</p>
                <div className="flex gap-4 text-sm">
                  <span><strong className="text-foreground">{formatHours(p.approved_minutes)}</strong> <span className="text-muted-foreground">approved</span></span>
                  <span><strong className="text-foreground">{formatHours(p.pending_minutes)}</strong> <span className="text-muted-foreground">pending</span></span>
                </div>
              </CardContent></Card>
            ))}
          </div>
        )}

        <Tabs value={filter} onValueChange={(v) => setFilter(v as HourStatus)} className="mb-4">
          <TabsList className="flex-wrap h-auto">
            {(["pending", "correction_requested", "approved", "rejected"] as HourStatus[]).map((s) => (
              <TabsTrigger key={s} value={s}>{hourStatusLabel(s)} ({count(s)})</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Card>
          <CardHeader><CardTitle className="text-lg">{hourStatusLabel(filter)}</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : error ? (
              <div className="text-center py-10">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-foreground">Couldn't load hour entries.</p>
                <Button variant="outline" className="mt-3" onClick={load}>Try again</Button>
              </div>
            ) : placements.length === 0 ? (
              <div className="text-center py-10">
                <Hourglass className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">You aren't the assigned supervisor for any placement, so there are no hours for you to verify.</p>
              </div>
            ) : shown.length === 0 ? (
              <div className="text-center py-10">
                <Hourglass className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No entries here.</p>
              </div>
            ) : shown.map((r) => (
              <div key={r.id} className="py-4 border-b border-border last:border-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{r.seeker_name} · {formatHours(r.minutes)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.job_title} · {fmtDate(r.work_date)}
                      {r.start_time && <> · {t(r.start_time)}–{t(r.end_time)}, break {r.break_minutes} min</>}
                      {r.revision > 1 && <> · revision {r.revision}</>}
                    </p>
                  </div>
                  <Badge variant="soft">{hourStatusLabel(r.status)}</Badge>
                </div>
                {r.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.flags.map((f) => (
                      <Badge key={f} variant="outline" className="border-destructive/40 text-destructive"><AlertTriangle className="w-3 h-3 mr-1" />{HOUR_FLAG_LABELS[f] ?? f}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-foreground whitespace-pre-line">{r.description}</p>
                {r.status === "pending" ? (
                  <div className="space-y-2">
                    <Textarea aria-label="Reason or note" rows={2} placeholder="Reason (required to reject or request a correction)" maxLength={500} value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, "approve")}><Check className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r.id, "request_correction")}><PencilLine className="w-4 h-4 mr-1" />Request correction</Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r.id, "reject")}><X className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  </div>
                ) : r.reviewer_note && <p className="text-xs text-muted-foreground">Note: {r.reviewer_note}</p>}
                <Button size="sm" variant="ghost" className="px-2" onClick={() => toggleHistory(r.id)}><History className="w-4 h-4 mr-1" />{history[r.id] ? "Hide history" : "History"}</Button>
                {history[r.id] && (
                  <ul className="text-xs text-muted-foreground space-y-1 pl-2 border-l border-border">
                    {history[r.id].map((h) => (
                      <li key={h.id}>{new Date(h.created_at).toLocaleString()} · {h.actor_role} · {h.action.replace(/_/g, " ")}{h.note ? ` — ${h.note}` : ""}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default HourApprovals;
