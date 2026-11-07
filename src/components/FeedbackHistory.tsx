import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { History } from "lucide-react";

export default function FeedbackHistory({ resourceId }: { resourceId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<{ id: string; action: string; created_at: string; before_state: unknown; after_state: unknown }[]>([]);
  const [state, setState] = useState("loading");
  const show = async () => {
    setOpen(true); setState("loading");
    const { data, error } = await supabase.from("placement_feedback_events").select("id,action,created_at,before_state,after_state").eq("resource_id", resourceId).order("created_at", { ascending: false });
    if (error) return setState("error");
    setRows(data ?? []); setState("ok");
  };
  const snapshot = (value: unknown) => {
    if (!value || typeof value !== "object") return null;
    const entries = Object.entries(value).filter(([k, v]) => ["skill", "example", "duties", "strengths", "skills_demonstrated", "improvement_areas", "status", "show_on_profile", "seeker_approved", "note"].includes(k) && v !== null);
    return entries.map(([k, v]) => <p key={k} className="text-sm whitespace-pre-wrap break-words"><span className="text-muted-foreground">{k.replaceAll("_", " ")}: </span>{String(v)}</p>);
  };
  return <><Button size="sm" variant="ghost" onClick={show}><History className="w-4 h-4 mr-1" />History</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Feedback history</DialogTitle></DialogHeader>{state === "loading" ? <p>Loading…</p> : state === "error" ? <p className="text-destructive">Couldn't load history.</p> : rows.length === 0 ? <p className="text-muted-foreground">No recorded revisions yet.</p> : rows.map(r => <div key={r.id} className="border-b border-border py-3 space-y-2"><p className="font-medium">{r.action.replaceAll("_", " ")} · {new Date(r.created_at).toLocaleString()}</p>{r.before_state ? <div><p className="text-xs font-medium">Before</p>{snapshot(r.before_state)}</div> : null}{r.after_state ? <div><p className="text-xs font-medium">After</p>{snapshot(r.after_state)}</div> : null}</div>)}</DialogContent></Dialog></>;
}