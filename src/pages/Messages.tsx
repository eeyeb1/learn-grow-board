import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KIND_LABELS, MESSAGE_MAX, REPORT_REASONS, RETENTION_MONTHS, messageProblem, type MessageKind } from "@/lib/messaging";
import { ArrowLeft, Flag, Loader2, Lock, MessageSquare, ShieldAlert, ShieldCheck, Ban } from "lucide-react";

interface ConvSummary { id: string; application_id: string; job_title: string; company_name: string; seeker_name: string; my_role: string; last_message_at: string; closed: boolean; last_preview: string | null }
interface Msg { id: string; mine: boolean; sender_role: string; sender_name: string; sender_detail: string | null; kind: MessageKind; created_at: string; hidden: boolean; body: string | null }
interface Thread { application_id: string; conversation_id: string | null; my_role: "seeker" | "company" | "guardian"; job_title: string | null; company_name: string | null; seeker_name: string | null; listed: boolean; closed: boolean; retention_until: string | null; safeguarded: boolean; guardian_approved: boolean; blocked_by_me: boolean; blocked_by_other: boolean; messages: Msg[] }
interface Guardian { id: string; seeker_id: string; guardian_user_id: string; guardian_name: string; relationship: string; status: string; review_note: string | null; created_at: string }

const Messages = () => {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const appId = params.get("application");
  const view = params.get("view");
  const [list, setList] = useState<ConvSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isMod, setIsMod] = useState(false);

  const loadList = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_my_conversations");
    if (error) setListError(error.message); else { setListError(null); setList((data as unknown as ConvSummary[]) ?? []); }
  }, []);
  useEffect(() => {
    if (!user) return;
    void loadList();
    void Promise.all([supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }), supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" })])
      .then(([a, m]) => setIsMod(!!a.data || !!m.data));
  }, [user, loadList]);

  if (!loading && !user) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 pt-24 pb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2"><MessageSquare className="h-7 w-7 text-primary" />Messages</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Secure messages about real applications and placements. Emails and phone numbers are never shared automatically. Messages are deleted {RETENTION_MONTHS} months after the application or placement ends.</p>
          </div>
          {isMod && <Button variant={view === "moderation" ? "default" : "outline"} onClick={() => setParams(view === "moderation" ? {} : { view: "moderation" })}><ShieldCheck className="mr-2 h-4 w-4" />Moderation</Button>}
        </div>
        {view === "moderation" && isMod ? <Moderation /> : <>
          <GuardianPanel />
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <aside aria-label="Conversations" className={`rounded-xl border border-border bg-card ${appId ? "hidden md:block" : ""}`}>
              {listError ? <p className="p-4 text-sm text-destructive">{listError}</p> : list === null ? <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                : list.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No conversations yet. Start one from an application or placement.</p>
                : <ul>{list.map(c => <li key={c.id}><button onClick={() => setParams({ application: c.application_id })} className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted ${c.application_id === appId ? "bg-muted" : ""}`}>
                    <p className="font-medium truncate">{c.my_role === "company" ? c.seeker_name : c.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.job_title}{c.closed ? " · Closed" : ""}{c.my_role === "guardian" ? " · Guardian copy" : ""}</p>
                    {c.last_preview && <p className="text-xs text-muted-foreground truncate mt-1">{c.last_preview}</p>}
                  </button></li>)}</ul>}
            </aside>
            <section className="rounded-xl border border-border bg-card min-h-[420px]">
              {appId ? <ThreadView key={appId} applicationId={appId} onBack={() => setParams({})} onSent={() => void loadList()} /> : <div className="p-8 text-center text-muted-foreground">Choose a conversation.<p className="mt-2 text-sm">Seekers can message from <Link className="underline" to="/dashboard/applications">My applications</Link>; company staff from their Applications inbox.</p></div>}
            </section>
          </div>
        </>}
      </main>
      <Footer />
    </div>
  );
};

function ThreadView({ applicationId, onBack, onSent }: { applicationId: string; onBack: () => void; onSent: () => void }) {
  const [t, setT] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<MessageKind>("message");
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_conversation", { _application_id: applicationId });
    if (error) setError(error.message); else setT(data as unknown as Thread);
  }, [applicationId]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <div className="p-6"><p role="alert" className="text-destructive">{error}</p><Button variant="ghost" className="mt-3" onClick={onBack}>Back</Button></div>;
  if (!t) return <div className="p-6 space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-24" /></div>;
  const pausedForMinor = t.safeguarded && !t.guardian_approved;
  const send = async () => {
    const problem = messageProblem(body, t.safeguarded);
    if (problem) return toast.error(problem);
    setBusy(true);
    const { error } = await supabase.rpc("send_message", { _application_id: applicationId, _body: body.trim(), _kind: kind });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody(""); setKind("message"); void load(); onSent();
  };
  const toggleBlock = async () => {
    if (!t.blocked_by_me && !window.confirm("Block this conversation? The other side won't be able to send you messages until you unblock.")) return;
    const { error } = await supabase.rpc("set_conversation_block", { _application_id: applicationId, _blocked: !t.blocked_by_me });
    if (error) toast.error(error.message); else void load();
  };
  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button size="icon" variant="ghost" className="md:hidden" aria-label="Back to conversations" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0"><p className="font-semibold truncate">{t.my_role === "company" ? t.seeker_name : t.company_name}</p><p className="text-xs text-muted-foreground truncate">{t.job_title ?? "Opportunity"}</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.safeguarded && <Badge variant="outline"><ShieldAlert className="mr-1 h-3 w-3" />Under-18 · guardian copied</Badge>}
          {t.my_role === "guardian" && <Badge variant="outline">Read-only guardian copy</Badge>}
          {t.conversation_id && t.my_role !== "guardian" && <Button size="sm" variant="outline" onClick={() => void toggleBlock()}><Ban className="mr-1 h-4 w-4" />{t.blocked_by_me ? "Unblock" : "Block"}</Button>}
        </div>
      </header>
      <ol className="flex-1 space-y-3 overflow-y-auto p-4" aria-label="Messages">
        {t.messages.length === 0 && <li className="text-sm text-muted-foreground">No messages yet.</li>}
        {t.messages.map(m => <li key={m.id} className={`max-w-[85%] rounded-lg border border-border p-3 ${m.mine ? "ml-auto bg-primary/5" : "bg-background"}`}>
          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{m.mine ? "You" : m.sender_name}</span>{m.sender_detail ? ` · ${m.sender_detail}` : ""} · {new Date(m.created_at).toLocaleString()}</p>
          {m.kind !== "message" && <Badge variant="soft" className="mt-1">{KIND_LABELS[m.kind]}</Badge>}
          {m.hidden ? <p className="mt-1 text-sm italic text-muted-foreground">This message was removed by moderation.</p> : <p className="mt-1 whitespace-pre-wrap break-words text-sm">{m.body}</p>}
          {!m.mine && !m.hidden && <button className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive" onClick={() => setReporting(m.id)}><Flag className="h-3 w-3" />Report</button>}
          {reporting === m.id && <ReportForm messageId={m.id} onDone={() => setReporting(null)} />}
        </li>)}
      </ol>
      <footer className="border-t border-border p-4 space-y-2">
        {!t.listed ? <Notice text="Messaging is only available for opportunities listed by verified companies." />
          : t.closed ? <Notice text={`This conversation is closed because the application or placement has ended. It will be deleted on ${t.retention_until ? new Date(t.retention_until).toLocaleDateString() : "the retention date"}.`} />
          : pausedForMinor ? <Notice text={t.my_role === "seeker" ? "Because you're under 18, messaging opens once a parent or guardian is linked and approved by our safeguarding team. Add one above." : "This applicant is under 18. Messaging is paused until their parent or guardian has been approved by our safeguarding team."} />
          : t.blocked_by_other ? <Notice text="You can't send messages because this conversation has been blocked." />
          : t.my_role === "guardian" ? <Notice text="You receive a copy of these messages as an approved guardian. Use Report if anything concerns you." />
          : <>
            {t.my_role === "company" && <Select value={kind} onValueChange={v => setKind(v as MessageKind)}><SelectTrigger className="w-56" aria-label="Message type"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(KIND_LABELS) as MessageKind[]).map(k => <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>)}</SelectContent></Select>}
            <Label htmlFor="msg" className="sr-only">Message</Label>
            <Textarea id="msg" value={body} maxLength={MESSAGE_MAX} rows={3} onChange={e => setBody(e.target.value)} placeholder={t.safeguarded ? "Write a message. Don't include email addresses or phone numbers." : "Write a message"} />
            <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground"><Lock className="mr-1 inline h-3 w-3" />Your name and role are shown with each message.</p><Button disabled={busy || !body.trim()} onClick={() => void send()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send</Button></div>
          </>}
      </footer>
    </div>
  );
}

const Notice = ({ text }: { text: string }) => <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{text}</p>;

function ReportForm({ messageId, onDone }: { messageId: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const submit = async () => {
    if (!reason) return toast.error("Choose a reason");
    const { error } = await supabase.rpc("report_message", { _message_id: messageId, _reason: reason, _details: details });
    if (error) toast.error(error.message); else { toast.success("Reported. Our moderators will review it."); onDone(); }
  };
  return <div className="mt-2 space-y-2 border-t border-border pt-2">
    <Select value={reason} onValueChange={setReason}><SelectTrigger aria-label="Report reason"><SelectValue placeholder="Reason" /></SelectTrigger><SelectContent>{REPORT_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select>
    <Textarea value={details} maxLength={1000} onChange={e => setDetails(e.target.value)} placeholder="Details (optional)" />
    <div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => void submit()}>Submit report</Button><Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
  </div>;
}

function GuardianPanel() {
  const { user } = useAuth();
  const [mine, setMine] = useState<Guardian | null>(null);
  const [wards, setWards] = useState<Guardian[]>([]);
  const [isMinor, setIsMinor] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", relationship: "" });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    const [g, p] = await Promise.all([
      supabase.from("seeker_guardians").select("*").or(`seeker_id.eq.${user.id},guardian_user_id.eq.${user.id}`),
      supabase.from("public_profiles").select("is_minor").eq("user_id", user.id).maybeSingle(),
    ]);
    const rows = (g.data ?? []) as Guardian[];
    setMine(rows.find(r => r.seeker_id === user.id) ?? null);
    setWards(rows.filter(r => r.guardian_user_id === user.id && r.status === "approved"));
    setIsMinor(!!p.data?.is_minor);
  }, [user]);
  useEffect(() => { void load(); }, [load]);
  if (!isMinor && !mine && wards.length === 0) return null;
  const request = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("request_guardian", { _email: form.email, _name: form.name, _relationship: form.relationship });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Sent for safeguarding review"); void load(); }
  };
  return <div className="mb-6 rounded-xl border border-border bg-card p-5">
    <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Under-18 safeguarding</h2>
    {wards.length > 0 && <p className="mt-2 text-sm text-muted-foreground">You're an approved guardian for {wards.length} young {wards.length === 1 ? "person" : "people"}. Their conversations appear below as read-only copies.</p>}
    {(isMinor || mine) && <>
      <p className="mt-2 text-sm text-muted-foreground">Because you're under 18, every message with a company is copied to a parent or guardian, and contact details can't be shared. Messaging opens after our safeguarding team approves your guardian.</p>
      {mine && <p className="mt-3 text-sm">Guardian: <span className="font-medium">{mine.guardian_name}</span> ({mine.relationship}) · <Badge variant="outline" className="capitalize">{mine.status === "pending" ? "Awaiting safeguarding review" : mine.status}</Badge>{mine.review_note && mine.status !== "approved" && <span className="block mt-1 text-muted-foreground">Note: {mine.review_note}</span>}</p>}
      {(!mine || mine.status === "rejected" || mine.status === "revoked") && <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div><Label htmlFor="g-email">Guardian's account email</Label><Input id="g-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label htmlFor="g-name">Guardian's name</Label><Input id="g-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label htmlFor="g-rel">Relationship</Label><Input id="g-rel" placeholder="e.g. Parent" value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} /></div>
        <div className="sm:col-span-3"><p className="mb-2 text-xs text-muted-foreground">Your guardian needs their own confirmed account on this site first.</p><Button disabled={busy} onClick={() => void request()}>Send for review</Button></div>
      </div>}
    </>}
  </div>;
}

interface Report { id: string; reason: string; details: string | null; status: string; created_at: string; resolution_note: string | null; sender_name: string; sender_role: string; sender_detail: string | null; body: string; sent_at: string; safeguarded: boolean; job_title: string | null }
function Moderation() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [r, g] = await Promise.all([supabase.rpc("list_message_reports"), supabase.from("seeker_guardians").select("*").in("status", ["pending", "approved"]).order("created_at", { ascending: false })]);
    if (r.error || g.error) return setError((r.error ?? g.error)!.message);
    setReports((r.data as unknown as Report[]) ?? []); setGuardians((g.data ?? []) as Guardian[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const act = async (fn: "moderate_message_report" | "review_guardian", id: string, decision: string) => {
    const note = notes[id] ?? "";
    const { error } = fn === "moderate_message_report"
      ? await supabase.rpc(fn, { _report_id: id, _decision: decision, _note: note })
      : await supabase.rpc(fn, { _id: id, _decision: decision, _note: note });
    if (error) toast.error(error.message); else { toast.success("Decision recorded"); void load(); }
  };
  if (error) return <p role="alert" className="text-destructive">{error}</p>;
  if (!reports) return <Skeleton className="h-32" />;
  const NoteBox = ({ id }: { id: string }) => <Textarea aria-label="Moderator note" placeholder="Note (required, kept in the record)" value={notes[id] ?? ""} onChange={e => setNotes(n => ({ ...n, [id]: e.target.value }))} />;
  return <div className="space-y-8">
    <section><h2 className="font-semibold mb-3">Guardian links</h2>
      {guardians.length === 0 ? <p className="text-sm text-muted-foreground">No guardian links to review.</p> : guardians.map(g => <div key={g.id} className="mb-3 rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-sm"><span className="font-medium">{g.guardian_name}</span> ({g.relationship}) · <Badge variant="outline">{g.status}</Badge> · requested {new Date(g.created_at).toLocaleDateString()}</p>
        <p className="text-xs text-muted-foreground">Check the guardian's identity and relationship through your safeguarding procedure before approving.</p>
        <NoteBox id={g.id} />
        <div className="flex gap-2">{g.status === "pending" ? <><Button size="sm" onClick={() => void act("review_guardian", g.id, "approved")}>Approve</Button><Button size="sm" variant="outline" onClick={() => void act("review_guardian", g.id, "rejected")}>Reject</Button></> : <Button size="sm" variant="outline" onClick={() => void act("review_guardian", g.id, "revoked")}>Revoke</Button>}</div>
      </div>)}
    </section>
    <section><h2 className="font-semibold mb-3">Reported messages</h2>
      {reports.length === 0 ? <p className="text-sm text-muted-foreground">No reported messages.</p> : reports.map(r => <div key={r.id} className="mb-3 rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex flex-wrap gap-2"><Badge variant="outline">{REPORT_REASONS.find(x => x.value === r.reason)?.label ?? r.reason}</Badge><Badge variant="outline" className="capitalize">{r.status}</Badge>{r.safeguarded && <Badge variant="destructive">Under-18</Badge>}</div>
        <p className="text-xs text-muted-foreground">{r.sender_name} ({r.sender_role === "company" ? r.sender_detail ?? "Company" : "Applicant"}) · {new Date(r.sent_at).toLocaleString()} · {r.job_title}</p>
        <p className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{r.body}</p>
        {r.details && <p className="text-sm text-muted-foreground">Reporter: {r.details}</p>}
        {r.status === "open" ? <><NoteBox id={r.id} /><div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => void act("moderate_message_report", r.id, "hidden")}>Remove message</Button><Button size="sm" variant="outline" onClick={() => void act("moderate_message_report", r.id, "dismissed")}>Dismiss</Button></div></> : r.resolution_note && <p className="text-sm text-muted-foreground">Decision note: {r.resolution_note}</p>}
      </div>)}
    </section>
  </div>;
}

export default Messages;
