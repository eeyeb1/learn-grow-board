import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatHours, HourEntry, Placement, PLACEMENT_SELECT } from "@/hooks/useSeekerDashboard";
import { StatusBadge } from "@/pages/Dashboard";
import PlacementSkillsPanel from "@/components/PlacementSkillsPanel";
import { EmployerReferencePanel } from "@/components/references";
import CertificatePanel from "@/components/CertificatePanel";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Award, BookOpen, Calendar, Clock, History, Loader2, MessageSquare, Target, Trash2, UserCheck, Wrench } from "lucide-react";

interface DiaryEntry { id: string; entry_date: string; content: string }
interface PlacementEvent { id: string; actor_role: string; action: string; from_status: string | null; to_status: string | null; note: string | null; created_at: string }

const fmt = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "To be confirmed");
const ACTION_LABEL: Record<string, string> = {
  created: "Placement created", reinstated: "Placement reinstated", activate: "Placement activated",
  complete: "Placement marked completed", cancel: "Placement cancelled", cancelled: "Placement cancelled", details_updated: "Placement details updated", skill_verified: "Skill confirmed", reference_submitted: "Reference submitted", reference_edited: "Reference edited", reference_withdrawn: "Reference withdrawn", reference_approved: "Reference approved for public profile", reference_unapproved: "Reference removed from public profile", reference_reported: "Reference reported", reference_hidden: "Reference hidden by moderator", reference_report_dismissed: "Reference report dismissed", reference_restored: "Reference restored by moderator", certificate_issued: "Certificate issued", certificate_revoked: "Certificate revoked", certificate_reissued: "Certificate reissued", skill_revoked: "Skill confirmation removed",
};

const detailsSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  objectives: z.array(z.string().trim().min(1).max(200)).max(20, "Up to 20 objectives"),
  skills: z.array(z.string().trim().min(1).max(40)).max(30, "Up to 30 skills"),
  supervisor_name: z.string().trim().max(100),
  supervisor_contact: z.string().trim().max(200),
  feedback: z.string().trim().max(3000, "Feedback must be 3000 characters or fewer"),
}).refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, "End date must be on or after the start date");

const PlacementDetail = () => {
  const { id = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [hours, setHours] = useState<HourEntry[]>([]);
  const [totals, setTotals] = useState({ verified_minutes: 0, pending_minutes: 0 });
  const [diary, setDiary] = useState<DiaryEntry[]>([]);
  const [events, setEvents] = useState<PlacementEvent[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [state, setState] = useState<"loading" | "error" | "missing" | "ok">("loading");

  const load = useCallback(async () => {
    if (!user) return;
    setState((s) => (s === "ok" ? s : "loading"));
    const { data, error } = await supabase.from("placements").select(PLACEMENT_SELECT).eq("id", id).maybeSingle();
    if (error) return setState("error");
    if (!data) return setState("missing");
    const p = data as unknown as Placement;
    const [hrs, tot, dia, ev, mg] = await Promise.all([
      supabase.from("hour_entries").select("*").eq("application_id", p.application_id).order("work_date", { ascending: false }),
      supabase.rpc("get_placement_hours", { _placement_id: id }),
      supabase.from("placement_diary").select("id, entry_date, content").eq("placement_id", id).order("entry_date", { ascending: false }),
      supabase.from("placement_events").select("*").eq("placement_id", id).order("created_at", { ascending: false }),
      supabase.rpc("can_manage_placement", { _placement_id: id, _uid: user.id }),
    ]);
    if (hrs.error || tot.error || ev.error) return setState("error");
    setPlacement(p);
    setHours((hrs.data ?? []) as HourEntry[]);
    if (tot.data) setTotals(tot.data as unknown as typeof totals);
    setDiary((dia.data ?? []) as DiaryEntry[]);
    setEvents((ev.data ?? []) as PlacementEvent[]);
    setCanManage(!!mg.data);
    setState("ok");
  }, [id, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/" replace />;
  const isSeeker = placement?.user_id === user.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden"><Navbar /></div>
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-5xl print:pt-0">
        <Link to={canManage && !isSeeker ? "/archive" : "/dashboard/experiences"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 print:hidden">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {state === "loading" && <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-72" /></div>}
        {state === "error" && (
          <Card><CardContent className="py-12 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-foreground">We couldn't load this placement.</p>
            <Button variant="outline" className="mt-4" onClick={load}>Try again</Button>
          </CardContent></Card>
        )}
        {state === "missing" && (
          <Card><CardContent className="py-12 text-center">
            <p className="font-medium text-foreground">Placement not found</p>
            <p className="text-sm text-muted-foreground mt-1">It doesn't exist or you don't have access to it.</p>
          </CardContent></Card>
        )}

        {state === "ok" && placement && (
          <div className="space-y-6">
            <Card className="print:hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">{placement.job?.title ?? "Role"}</h1>
                    <p className="text-muted-foreground">{placement.company?.company_name ?? "Company"}{placement.job?.location ? ` · ${placement.job.location}` : ""}</p>
                  </div>
                  <StatusBadge status={placement.status} />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <Info icon={Calendar} label="Start" value={fmt(placement.start_date)} />
                  <Info icon={Calendar} label="End" value={fmt(placement.end_date)} />
                  <Info icon={Award} label="Verified hours" value={formatHours(totals.verified_minutes)} />
                  <Info icon={Clock} label="Pending hours" value={formatHours(totals.pending_minutes)} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="flex items-center gap-2 font-medium text-foreground mb-2"><Target className="w-4 h-4 text-primary" />Agreed learning objectives</p>
                    {placement.learning_objectives.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Your employer hasn't added learning objectives yet.</p>
                    ) : <ul className="list-disc pl-5 text-sm text-foreground space-y-1">{placement.learning_objectives.map((o) => <li key={o}>{o}</li>)}</ul>}
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="flex items-center gap-2 font-medium text-foreground mb-2"><UserCheck className="w-4 h-4 text-primary" />Supervisor</p>
                    {placement.supervisor_name || placement.supervisor_contact ? (
                      <div className="text-sm space-y-1">
                        {placement.supervisor_name && <p className="text-foreground">{placement.supervisor_name}</p>}
                        {placement.supervisor_contact && (placement.status === "upcoming" || placement.status === "active" || !isSeeker) && (
                          <p className="text-muted-foreground">Contact: {placement.supervisor_contact}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Shared by your employer for placement-related questions only.</p>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">Supervisor details haven't been shared yet.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {canManage && !isSeeker && <ManagePanel placement={placement} onChange={load} />}

            <Tabs defaultValue="hours">
              <TabsList className="flex-wrap h-auto print:hidden">
                <TabsTrigger value="hours"><Clock className="w-4 h-4 mr-1" />Hours Log</TabsTrigger>
                <TabsTrigger value="skills"><Wrench className="w-4 h-4 mr-1" />Skills</TabsTrigger>
                {isSeeker && <TabsTrigger value="diary"><BookOpen className="w-4 h-4 mr-1" />Diary</TabsTrigger>}
                <TabsTrigger value="feedback"><MessageSquare className="w-4 h-4 mr-1" />Feedback</TabsTrigger>
                <TabsTrigger value="certificate"><Award className="w-4 h-4 mr-1" />Certificate</TabsTrigger>
                <TabsTrigger value="history"><History className="w-4 h-4 mr-1" />History</TabsTrigger>
              </TabsList>

              <TabsContent value="hours">
                <Card><CardContent className="p-6">
                  {isSeeker && placement.status === "active" && (
                    <Link to="/dashboard/hours"><Button size="sm" className="mb-4">Log hours</Button></Link>
                  )}
                  {hours.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{placement.status === "active" ? "No hours logged yet." : placement.status === "upcoming" ? "Hours can be logged once your employer activates this placement." : "No hours were logged for this placement."}</p>
                  ) : hours.map((h) => (
                    <div key={h.id} className="flex items-start justify-between gap-3 py-3 border-b border-border last:border-0">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{formatHours(h.minutes)} · {fmt(h.work_date)}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{h.description}</p>
                        {h.reviewer_note && <p className="text-xs text-foreground mt-1">Note: {h.reviewer_note}</p>}
                      </div>
                      <StatusBadge status={h.status} />
                    </div>
                  ))}
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="skills">
                <PlacementSkillsPanel placementId={placement.id} status={placement.status} canManage={canManage} isSeeker={isSeeker} listedSkills={placement.job?.skills ?? []} />
              </TabsContent>

              {isSeeker && (
                <TabsContent value="diary">
                  <DiaryPanel placementId={placement.id} userId={user.id} entries={diary} onChange={load} canWrite={placement.status !== "cancelled"} />
                </TabsContent>
              )}

              <TabsContent value="feedback">
                <Card><CardContent className="p-6">
                  {placement.employer_feedback ? (
                    <p className="text-foreground whitespace-pre-line">{placement.employer_feedback}</p>
                  ) : <p className="text-sm text-muted-foreground">No feedback from the employer yet.</p>}
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="certificate">
                <CertificatePanel placementId={placement.id} status={placement.status} isSeeker={isSeeker} canManage={canManage} onChange={load} />
              </TabsContent>

              <TabsContent value="history">
                <Card><CardContent className="p-6">
                  {events.map((e) => (
                    <div key={e.id} className="py-2 border-b border-border last:border-0 text-sm">
                      <p className="text-foreground">{ACTION_LABEL[e.action] ?? e.action}{e.to_status && e.from_status ? ` (${e.from_status} → ${e.to_status})` : ""}</p>
                      <p className="text-xs text-muted-foreground">By {e.actor_role} · {new Date(e.created_at).toLocaleString()}</p>
                      {e.note && <p className="text-xs text-muted-foreground mt-0.5">“{e.note}”</p>}
                    </div>
                  ))}
                </CardContent></Card>
              </TabsContent>
            </Tabs>

          </div>
        )}
      </div>
      <div className="print:hidden"><Footer /></div>
    </div>
  );
};

const Info = ({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <Icon className="w-4 h-4 text-primary mt-0.5" />
    <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-foreground font-medium">{value}</p></div>
  </div>
);

const DiaryPanel = ({ placementId, userId, entries, onChange, canWrite }: { placementId: string; userId: string; entries: DiaryEntry[]; onChange: () => void; canWrite: boolean }) => {
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const t = content.trim();
    if (t.length < 3 || t.length > 3000) return toast.error("Diary entries must be 3–3000 characters");
    setBusy(true);
    const { error } = await supabase.from("placement_diary").insert({ placement_id: placementId, user_id: userId, entry_date: date, content: t });
    setBusy(false);
    if (error) return toast.error("Couldn't save entry");
    setContent(""); toast.success("Diary entry saved"); onChange();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("placement_diary").delete().eq("id", id);
    if (error) return toast.error("Couldn't delete entry");
    onChange();
  };
  return (
    <Card><CardContent className="p-6 space-y-4">
      <p className="text-xs text-muted-foreground">Your diary is private to you — employers can't see it.</p>
      {canWrite && (
        <div className="space-y-2">
          <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Entry date" />
          <Textarea rows={3} maxLength={3000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What did you learn or reflect on today?" />
          <Button size="sm" onClick={add} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Add entry</Button>
        </div>
      )}
      {entries.length === 0 ? <p className="text-sm text-muted-foreground">No diary entries yet.</p> : entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-3 py-3 border-t border-border">
          <div><p className="text-xs text-muted-foreground">{fmt(e.entry_date)}</p><p className="text-sm text-foreground whitespace-pre-line">{e.content}</p></div>
          <Button size="icon" variant="ghost" aria-label="Delete entry" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
    </CardContent></Card>
  );
};

const ManagePanel = ({ placement, onChange }: { placement: Placement; onChange: () => void }) => {
  const [f, setF] = useState({
    start_date: placement.start_date ?? "",
    end_date: placement.end_date ?? "",
    objectives: placement.learning_objectives.join("\n"),
    skills: placement.confirmed_skills.join(", "),
    supervisor_name: placement.supervisor_name ?? "",
    supervisor_contact: placement.supervisor_contact ?? "",
    feedback: placement.employer_feedback ?? "",
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const saveDetails = async () => {
    const parsed = detailsSchema.safeParse({
      ...f,
      objectives: f.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
      skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const v = parsed.data;
    setBusy(true);
    const { error } = await supabase.rpc("update_placement_details", {
      _placement_id: placement.id,
      _start_date: v.start_date || null, _end_date: v.end_date || null,
      _learning_objectives: v.objectives, _supervisor_name: v.supervisor_name, _supervisor_contact: v.supervisor_contact,
      _confirmed_skills: v.skills, _employer_feedback: v.feedback,
    } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Placement details saved"); onChange();
  };

  const act = async (action: "activate" | "complete" | "cancel") => {
    setBusy(true);
    const { error } = await supabase.rpc("placement_action", { _placement_id: placement.id, _action: action, _note: note.trim() || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNote(""); toast.success("Placement updated"); onChange();
  };

  const ActionButton = ({ action, label, desc, variant = "default" }: { action: "activate" | "complete" | "cancel"; label: string; desc: string; variant?: "default" | "outline" }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button size="sm" variant={variant} disabled={busy}>{label}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{label}?</AlertDialogTitle><AlertDialogDescription>{desc} This action is recorded in the placement history.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => act(action)}>Confirm</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <Card className="print:hidden border-primary/30">
      <CardHeader><CardTitle className="text-lg">Manage placement (employer)</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {placement.status !== "completed" && placement.status !== "cancelled" && (
          <div className="space-y-2">
            <Input placeholder="Optional note for the history log" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {placement.status === "upcoming" && <ActionButton action="activate" label="Activate placement" desc="The seeker will be able to log hours. The start date defaults to today if not set." />}
              {placement.status === "active" && <ActionButton action="complete" label="Mark completed" desc="Hour logging closes and a certificate is issued using approved hours only. The end date defaults to today if not set." />}
              <ActionButton action="cancel" label="Cancel placement" variant="outline" desc="The placement will be cancelled and hours can no longer be logged." />
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label htmlFor="sd">Start date</Label><Input id="sd" type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ed">End date</Label><Input id="ed" type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sn">Supervisor name</Label><Input id="sn" maxLength={100} value={f.supervisor_name} onChange={(e) => setF({ ...f, supervisor_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="sc">Supervisor work contact</Label><Input id="sc" maxLength={200} placeholder="Work email or office line — not personal" value={f.supervisor_contact} onChange={(e) => setF({ ...f, supervisor_contact: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label htmlFor="lo">Learning objectives (one per line)</Label><Textarea id="lo" rows={3} value={f.objectives} onChange={(e) => setF({ ...f, objectives: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="fb">Feedback for the seeker</Label><Textarea id="fb" rows={3} maxLength={3000} value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} /></div>
        <Button onClick={saveDetails} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save details</Button>
        {placement.status === "completed" && <EmployerReferencePanel placementId={placement.id} companyName={placement.company?.company_name} />}
      </CardContent>
    </Card>
  );
};

export default PlacementDetail;
