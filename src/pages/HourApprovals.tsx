import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatHours } from "@/hooks/useSeekerDashboard";
import { toast } from "sonner";
import { AlertCircle, Check, Hourglass, X } from "lucide-react";

interface Row {
  id: string;
  work_date: string;
  minutes: number;
  description: string;
  status: string;
  reviewer_note: string | null;
  application: { job_id: string; form_data: { fullName?: string } | null } | null;
}

const HourApprovals = () => {
  const { user, loading: authLoading, userType } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(false);
    const { data, error } = await supabase
      .from("hour_entries")
      .select("id, work_date, minutes, description, status, reviewer_note, user_id, application:applications(job_id, form_data)")
      .neq("user_id", user.id)
      .order("work_date", { ascending: false });
    if (error) { setError(true); setLoading(false); return; }
    const list = (data ?? []) as unknown as Row[];
    const ids = [...new Set(list.map((r) => r.application?.job_id).filter(Boolean) as string[])];
    if (ids.length) {
      const { data: jobs } = await supabase.from("jobs").select("id, title").in("id", ids);
      setTitles(Object.fromEntries((jobs ?? []).map((j) => [j.id, j.title])));
    }
    setRows(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (authLoading) return null;
  if (!user || userType !== "company") return <Navigate to="/" replace />;

  const review = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    const { error } = await supabase.from("hour_entries").update({ status, reviewer_note: notes[id]?.trim() || null }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Hours approved" : "Hours rejected");
    load();
  };

  const shown = rows.filter((r) => r.status === filter);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">Hour approvals</h1>
        <p className="text-muted-foreground mb-6">Review hours logged by people on your placements. Only approved hours count as verified.</p>
        <Tabs value={filter} onValueChange={setFilter} className="mb-4">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <Card>
          <CardHeader><CardTitle className="text-lg capitalize">{filter} entries</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : error ? (
              <div className="text-center py-10">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-foreground">Couldn't load hour entries.</p>
                <Button variant="outline" className="mt-3" onClick={load}>Try again</Button>
              </div>
            ) : shown.length === 0 ? (
              <div className="text-center py-10">
                <Hourglass className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No {filter} entries.</p>
              </div>
            ) : shown.map((r) => (
              <div key={r.id} className="py-4 border-b border-border last:border-0 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{r.application?.form_data?.fullName || "Applicant"} · {formatHours(r.minutes)}</p>
                    <p className="text-xs text-muted-foreground">
                      {titles[r.application?.job_id ?? ""] ?? "Placement"} · {new Date(r.work_date + "T00:00:00").toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="soft" className="capitalize">{r.status}</Badge>
                </div>
                <p className="text-sm text-foreground whitespace-pre-line">{r.description}</p>
                {r.status === "pending" ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input placeholder="Optional note to the applicant" maxLength={500} value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, "approved")}><Check className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => review(r.id, "rejected")}><X className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  </div>
                ) : r.reviewer_note && <p className="text-xs text-muted-foreground">Your note: {r.reviewer_note}</p>}
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
