import { useState } from "react";
import { Link, NavLink, Navigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSeekerDashboard, formatHours, profileUrl, shareProfile, DashApplication, HourEntry, Placement } from "@/hooks/useSeekerDashboard";
import { toast } from "sonner";
import SeekerProfileEditor from "@/components/SeekerProfileEditor";
import { PortfolioManager } from "@/components/portfolio";
import CvWriter from "@/components/CvWriter";
import {
  LayoutDashboard, Search, FileText, Award, Clock, Globe, Settings as SettingsIcon,
  CheckCircle2, FolderOpen, Briefcase, Share2, Hourglass, Heart, AlertCircle, ArrowRight, Trash2, Copy, Loader2, ExternalLink, Sparkles,
} from "lucide-react";

type Section = "overview" | "applications" | "experiences" | "hours" | "portfolio" | "cv" | "profile";
const SECTIONS: Section[] = ["overview", "applications", "experiences", "hours", "portfolio", "cv", "profile"];

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Find Experience", icon: Search },
  { to: "/dashboard/applications", label: "Applications", icon: FileText },
  { to: "/dashboard/experiences", label: "My Experiences", icon: Award },
  { to: "/dashboard/hours", label: "Hours & Verification", icon: Clock },
  { to: "/dashboard/portfolio", label: "Portfolio", icon: FolderOpen },
  { to: "/dashboard/cv", label: "CV Writer", icon: Sparkles },
  { to: "/dashboard/profile", label: "My Profile", icon: Globe },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const statusStyle: Record<string, string> = {
  submitted: "bg-muted text-muted-foreground",
  reviewed: "bg-accent text-accent-foreground",
  accepted: "bg-primary/10 text-primary",
  completed: "bg-primary text-primary-foreground",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  upcoming: "bg-accent text-accent-foreground",
  active: "bg-primary/10 text-primary",
  pending: "bg-accent text-accent-foreground",
  approved: "bg-primary/10 text-primary",
};

const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="soft" className={`capitalize ${statusStyle[status] ?? "bg-muted text-muted-foreground"}`}>{status}</Badge>
);

const Empty = ({ icon: Icon, title, text, action }: { icon: typeof Clock; title: string; text: string; action?: React.ReactNode }) => (
  <div className="text-center py-10 px-4">
    <div className="w-12 h-12 rounded-full bg-accent mx-auto flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-accent-foreground" />
    </div>
    <p className="font-medium text-foreground">{title}</p>
    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const AppRow = ({ app }: { app: DashApplication }) => (
  <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
    <div className="min-w-0">
      <p className="font-medium text-foreground truncate">{app.job?.title ?? "Opportunity no longer listed"}</p>
      <p className="text-xs text-muted-foreground truncate">
        {app.job?.company ?? "—"} · Applied {new Date(app.submitted_at).toLocaleDateString()}
      </p>
    </div>
    <StatusBadge status={app.status} />
  </div>
);

const Dashboard = () => {
  const { section = "overview" } = useParams();
  const { user, loading: authLoading, userType } = useAuth();
  const d = useSeekerDashboard();

  if (authLoading) return <PageShell><Skeleton className="h-64 w-full" /></PageShell>;
  if (!user) return <Navigate to="/" replace />;
  if (userType === "company") return <Navigate to="/archive" replace />;
  if (!SECTIONS.includes(section as Section)) return <Navigate to="/dashboard" replace />;

  const firstName = (d.profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "").split(" ")[0];

  return (
    <PageShell>
      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="lg:sticky lg:top-24 self-start">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-6">
          {d.error ? (
            <Card>
              <CardContent className="py-10 text-center">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-foreground">{d.error}</p>
                <Button variant="outline" className="mt-4" onClick={d.reload}>Try again</Button>
              </CardContent>
            </Card>
          ) : d.loading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              {section === "overview" && <Overview d={d} firstName={firstName} />}
              {section === "applications" && <Applications d={d} />}
              {section === "experiences" && <Experiences d={d} />}
              {section === "hours" && <Hours d={d} />}
              {section === "portfolio" && <PortfolioManager items={d.portfolio} requests={d.removalRequests} placements={d.placements} published={!!d.publicProfile?.is_public} onChange={d.reload} />}
              {section === "cv" && <CvWriter completed={d.completed} />}
              {section === "profile" && <SeekerProfileEditor d={d} />}
            </>
          )}
        </main>
      </div>
    </PageShell>
  );
};

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 pt-24 pb-16">{children}</div>
    <Footer />
  </div>
);

type D = ReturnType<typeof useSeekerDashboard>;

const Overview = ({ d, firstName }: { d: D; firstName: string }) => {
  const stats = [
    { label: "Verified hours", value: formatHours(d.summary.verified_minutes), icon: CheckCircle2 },
    { label: "Completed experiences", value: d.completed.length, icon: Award },
    { label: "Active placements", value: d.activePlacements.length, icon: Briefcase },
    { label: "Pending approvals", value: d.summary.pending_count, icon: Hourglass },
  ];
  return (
    <>
      <Card className="gradient-hero border-0">
        <CardContent className="p-6 md:p-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p className="text-primary-foreground/85 mt-1">Track your applications, log your hours and build a verified record of your experience.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <Icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Globe className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">Public profile · {d.publicProfile?.is_public ? "Published" : "Private"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {d.publicProfile?.is_public ? profileUrl(d.publicProfile.slug) : "Publish your profile to share your verified experience."}
              </p>
            </div>
          </div>
          {d.publicProfile?.is_public ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(profileUrl(d.publicProfile!.slug)); toast.success("Link copied"); }}><Copy className="w-4 h-4 mr-1" />Copy link</Button>
              <Button size="sm" onClick={() => shareProfile(d.publicProfile!.slug)}><Share2 className="w-4 h-4 mr-1" />Share profile</Button>
            </div>
          ) : (
            <Link to="/dashboard/profile"><Button size="sm" variant="outline">Set up & publish</Button></Link>
          )}
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Application status</CardTitle>
            <Link to="/dashboard/applications" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {d.applications.length === 0 ? (
              <Empty icon={FileText} title="No applications yet" text="When you apply for an opportunity, its progress will appear here."
                action={<Link to="/jobs"><Button size="sm">Find experience</Button></Link>} />
            ) : d.applications.slice(0, 5).map((a) => <AppRow key={a.id} app={a} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Profile completion</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Progress value={d.completion} className="flex-1" />
              <span className="text-sm font-medium text-foreground">{d.completion}%</span>
            </div>
            <ul className="space-y-1.5">
              {d.completionChecks.map((c) => (
                <li key={c.label} className={`flex items-center gap-2 text-sm ${c.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  <CheckCircle2 className={`w-4 h-4 ${c.done ? "text-primary" : "text-muted-foreground/40"}`} />{c.label}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <Link to="/dashboard/profile"><Button size="sm" variant="outline">Edit public profile</Button></Link>
              <Link to="/settings"><Button size="sm" variant="ghost">Account settings</Button></Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Pending hour approvals</CardTitle>
            <Link to="/dashboard/hours" className="text-sm text-primary hover:underline">Log hours</Link>
          </CardHeader>
          <CardContent>
            {d.hours.filter((h) => h.status === "pending").length === 0 ? (
              <Empty icon={Hourglass} title="Nothing awaiting approval" text="Hours you log against an active placement wait here until your employer reviews them." />
            ) : d.hours.filter((h) => h.status === "pending").slice(0, 5).map((h) => <HourRow key={h.id} h={h} d={d} />)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Saved opportunities</CardTitle>
            <Link to="/archive" className="text-sm text-primary hover:underline">Manage</Link>
          </CardHeader>
          <CardContent>
            {d.saved.length === 0 ? (
              <Empty icon={Heart} title="No saved opportunities" text="Tap the heart on any opportunity to keep it here for later." />
            ) : d.saved.slice(0, 5).map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between py-3 border-b border-border last:border-0 group">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate group-hover:text-primary">{j.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{j.company ?? ""}{j.location ? ` · ${j.location}` : ""}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

const Applications = ({ d }: { d: D }) => (
  <Card>
    <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
    <CardContent>
      {d.applications.length === 0 ? (
        <Empty icon={FileText} title="No applications yet" text="Browse opportunities and apply — you'll be able to follow each one here."
          action={<Link to="/jobs"><Button size="sm">Find experience</Button></Link>} />
      ) : d.applications.map((a) => <AppRow key={a.id} app={a} />)}
    </CardContent>
  </Card>
);

const PLACEMENT_GROUPS: { status: Placement["status"]; title: string; empty: string }[] = [
  { status: "active", title: "Active", empty: "No active placements. Your employer activates a placement when it starts." },
  { status: "upcoming", title: "Accepted & upcoming", empty: "When an employer accepts your application, the placement appears here." },
  { status: "completed", title: "Completed", empty: "Your employer marks a placement completed when it ends." },
];

const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString() : null);

const Experiences = ({ d }: { d: D }) => (
  <>
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">My Experiences</h1>
      <p className="text-sm text-muted-foreground">Placements are created automatically when an employer accepts your application.</p>
    </div>
    {PLACEMENT_GROUPS.map((g) => {
      const list = d.placements.filter((p) => p.status === g.status);
      return (
        <Card key={g.status}>
          <CardHeader><CardTitle className="text-lg">{g.title} <span className="text-muted-foreground font-normal">({list.length})</span></CardTitle></CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{g.empty}</p>
            ) : list.map((p) => {
              const appHours = d.hours.filter((h) => h.application_id === p.application_id);
              const verified = appHours.filter((h) => h.status === "approved").reduce((s, h) => s + h.minutes, 0);
              const pending = appHours.filter((h) => h.status === "pending").reduce((s, h) => s + h.minutes, 0);
              const dates = [fmtDate(p.start_date), fmtDate(p.end_date)].filter(Boolean).join(" – ") || "Dates to be confirmed";
              return (
                <Link key={p.id} to={`/placements/${p.id}`} className="block py-3 border-b border-border last:border-0 group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary">{p.job?.title ?? "Role"}</p>
                      <p className="text-xs text-muted-foreground">{p.company?.company_name ?? "Company"} · {dates}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatHours(verified)} verified · {formatHours(pending)} pending</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={p.status} />
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      );
    })}
  </>
);

const HourRow = ({ h, d }: { h: HourEntry; d: D }) => {
  const app = d.applications.find((a) => a.id === h.application_id);
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-foreground">
          {formatHours(h.minutes)} · {new Date(h.work_date + "T00:00:00").toLocaleDateString()}
        </p>
        <p className="text-xs text-muted-foreground truncate">{app?.job?.title ?? "Placement"}</p>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{h.description}</p>
        {h.reviewer_note && <p className="text-xs text-foreground mt-1">Employer note: {h.reviewer_note}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <StatusBadge status={h.status} />
        {h.status === "pending" && (
          <Button size="icon" variant="ghost" aria-label="Delete entry" onClick={async () => {
            const { error } = await d.deleteHours(h.id);
            error ? toast.error(error) : toast.success("Entry removed");
          }}><Trash2 className="w-4 h-4" /></Button>
        )}
      </div>
    </div>
  );
};

const Hours = ({ d }: { d: D }) => {
  const eligible = d.activePlacements;
  const today = new Date().toISOString().slice(0, 10);
  const [appId, setAppId] = useState(eligible[0]?.application_id ?? "");
  const [date, setDate] = useState(today);
  const [hrs, setHrs] = useState("");
  const [mins, setMins] = useState("0");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = (parseInt(hrs || "0") * 60) + parseInt(mins || "0");
    if (!appId) return toast.error("Choose a placement");
    if (!date || date > today) return toast.error("Choose a date that isn't in the future");
    if (total <= 0 || total > 1440) return toast.error("Duration must be between 1 minute and 24 hours");
    if (desc.trim().length < 3) return toast.error("Describe the tasks you worked on");
    setBusy(true);
    const { error } = await d.logHours({ application_id: appId, work_date: date, minutes: total, description: desc.trim() });
    setBusy(false);
    if (error) return toast.error(error);
    toast.success("Hours submitted for employer approval");
    setHrs(""); setMins("0"); setDesc("");
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {[
          ["Verified", formatHours(d.summary.verified_minutes)],
          ["Pending", formatHours(d.summary.pending_minutes)],
          ["Rejected entries", String(d.summary.rejected_count)],
        ].map(([l, v]) => (
          <Card key={l}><CardContent className="p-4"><p className="text-xl font-bold text-foreground">{v}</p><p className="text-xs text-muted-foreground">{l}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log hours</CardTitle>
          <p className="text-sm text-muted-foreground">Entries stay pending until the employer for that placement approves them. Only approved hours count as verified.</p>
        </CardHeader>
        <CardContent>
          {eligible.length === 0 ? (
            <Empty icon={Briefcase} title="No active placement to log against" text="You can log hours once your employer has activated your placement." />
          ) : (
            <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Placement</Label>
                <Select value={appId} onValueChange={setAppId}>
                  <SelectTrigger><SelectValue placeholder="Choose a placement" /></SelectTrigger>
                  <SelectContent>
                    {eligible.map((p) => <SelectItem key={p.id} value={p.application_id}>{p.job?.title} — {p.company?.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="work-date">Date</Label>
                <Input id="work-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="hrs">Hours</Label>
                  <Input id="hrs" type="number" min={0} max={24} value={hrs} onChange={(e) => setHrs(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mins">Minutes</Label>
                  <Input id="mins" type="number" min={0} max={59} step={5} value={mins} onChange={(e) => setMins(e.target.value)} />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="desc">Tasks completed</Label>
                <Textarea id="desc" maxLength={2000} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you work on?" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Submit for approval</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your entries</CardTitle></CardHeader>
        <CardContent>
          {d.hours.length === 0 ? (
            <Empty icon={Clock} title="No hours logged yet" text="Entries you submit will appear here with their approval status." />
          ) : d.hours.map((h) => <HourRow key={h.id} h={h} d={d} />)}
        </CardContent>
      </Card>
    </>
  );
};

export { StatusBadge };
export default Dashboard;
