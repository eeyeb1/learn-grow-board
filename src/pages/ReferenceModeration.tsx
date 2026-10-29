import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { REFERENCE_SELECT, REPORT_REASONS, ReferenceBody, STATUS_LABEL, StructuredReference } from "@/components/references";
import { toast } from "sonner";
import { PortfolioRemovalQueue } from "@/components/portfolio";
import { ShieldCheck } from "lucide-react";

interface Report { id: string; reference_id: string; reason: string; details: string | null; status: string; created_at: string; resolution_note: string | null; resolved_at: string | null }

const ReferenceModeration = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [refs, setRefs] = useState<Record<string, StructuredReference>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [state, setState] = useState<"loading" | "error" | "ok">("loading");

  const load = useCallback(async () => {
    if (!user) return;
    const { data: admin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!admin);
    if (!admin) return;
    const { data, error } = await supabase.from("reference_reports").select("*").order("created_at", { ascending: false });
    if (error) return setState("error");
    const rs = (data ?? []) as Report[];
    const ids = [...new Set(rs.map((r) => r.reference_id))];
    if (ids.length) {
      const { data: rd } = await supabase.from("placement_references").select(REFERENCE_SELECT).in("id", ids);
      setRefs(Object.fromEntries(((rd ?? []) as StructuredReference[]).map((r) => [r.id, r])));
    }
    setReports(rs); setState("ok");
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, decision: "upheld" | "dismissed") => {
    const { error } = await supabase.rpc("moderate_reference_report", { _report_id: id, _decision: decision, _note: notes[id] ?? "" });
    if (error) return toast.error(error.message);
    toast.success(decision === "upheld" ? "Reference hidden" : "Report dismissed"); load();
  };
  const restore = async (refId: string) => {
    const { error } = await supabase.rpc("restore_reference", { _id: refId, _note: "Restored after review" });
    if (error) return toast.error(error.message);
    toast.success("Reference restored"); load();
  };

  if (!authLoading && !user) return <Navigate to="/" replace />;
  const reason = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
        <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-2"><ShieldCheck className="w-7 h-7 text-primary" />Reference reports</h1>
        {isAdmin && <Button asChild variant="outline"><Link to="/admin/companies">Company verification</Link></Button>}
        {isAdmin === false ? (
          <Card><CardContent className="p-6 text-muted-foreground">Only moderators can view this page.</CardContent></Card>
        ) : state === "loading" ? <Skeleton className="h-40" /> : state === "error" ? (
          <Card><CardContent className="p-6 text-destructive">Couldn't load reports. <button className="underline" onClick={load}>Try again</button></CardContent></Card>
        ) : reports.length === 0 ? (
          <Card><CardContent className="p-6 text-muted-foreground">No reports yet.</CardContent></Card>
        ) : reports.map((rp) => {
          const ref = refs[rp.reference_id];
          return (
            <Card key={rp.id}><CardContent className="p-6 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft">{reason(rp.reason)}</Badge>
                <Badge variant="soft">{rp.status === "open" ? "Open" : rp.status === "upheld" ? "Upheld" : "Dismissed"}</Badge>
                {ref && <Badge variant="soft">{STATUS_LABEL[ref.status]}</Badge>}
                <span className="text-xs text-muted-foreground">Reported {new Date(rp.created_at).toLocaleString()}</span>
              </div>
              {rp.details && <p className="text-sm text-foreground">“{rp.details}”</p>}
              {ref && <div className="rounded-lg border border-border p-3"><ReferenceBody r={ref} showPrivate /></div>}
              {rp.status === "open" ? (
                <div className="space-y-2">
                  <Textarea rows={2} maxLength={1000} placeholder="Moderator note (recorded in the audit trail)" value={notes[rp.id] ?? ""} onChange={(e) => setNotes({ ...notes, [rp.id]: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => decide(rp.id, "upheld")}>Uphold & hide</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(rp.id, "dismissed")}>Dismiss</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Resolved {rp.resolved_at && new Date(rp.resolved_at).toLocaleString()}{rp.resolution_note ? ` · ${rp.resolution_note}` : ""}</p>
                  {ref?.status === "hidden" && <Button size="sm" variant="outline" onClick={() => restore(ref.id)}>Restore</Button>}
                </div>
              )}
            </CardContent></Card>
          );
        })}
        {isAdmin && <PortfolioRemovalQueue />}
      </div>
      <Footer />
    </div>
  );
};

export default ReferenceModeration;
