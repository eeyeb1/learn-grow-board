import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PublicProfileSettings } from "@/hooks/useSeekerDashboard";
import { recommend, hasAnyPreference, Feedback, RecJob, RecPrefs, ENOUGH_RESULTS } from "@/lib/recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Compass, EyeOff, MapPin, Settings2, ShieldCheck, ThumbsDown, ThumbsUp, Undo2 } from "lucide-react";

const WORK_LABEL: Record<string, string> = { remote: "Remote", in_person: "In person", hybrid: "Hybrid", any: "Open to any" };

export default function Recommendations({ profile, appliedJobIds }: { profile: PublicProfileSettings | null; appliedJobIds: string[] }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<RecJob[] | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [error, setError] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const [j, f] = await Promise.all([
      supabase.from("jobs").select("id, title, description, industry, skills, location, location_type, duration, hours_per_week, status, expires_at, company:company_profiles(company_name)").eq("status", "active").limit(500),
      supabase.from("recommendation_feedback").select("job_id, feedback"),
    ]);
    if (j.error || f.error) { setError(true); setJobs([]); return; }
    setJobs((j.data ?? []).map((x) => ({ ...x, company_name: (x as { company?: { company_name: string } | null }).company?.company_name ?? null })) as RecJob[]);
    setFeedback(Object.fromEntries((f.data ?? []).map((r) => [r.job_id, r.feedback as Feedback])));
  }, []);
  useEffect(() => { load(); }, [load]);

  const prefs: RecPrefs | null = profile
    ? { career_interests: profile.career_interests ?? [], skills: profile.skills ?? [], preferred_industries: profile.preferred_industries ?? [], location: profile.location, work_preference: profile.work_preference, availability: profile.availability }
    : null;

  const recs = useMemo(() => (jobs && prefs ? recommend(prefs, jobs, { feedback, appliedJobIds }) : []), [jobs, prefs, feedback, appliedJobIds]);
  const hiddenJobs = useMemo(() => (jobs ?? []).filter((j) => feedback[j.id] === "hidden" || feedback[j.id] === "not_relevant"), [jobs, feedback]);

  const setFb = async (jobId: string, value: Feedback | null) => {
    if (!user) return;
    const prev = feedback[jobId];
    setFeedback((f) => { const n = { ...f }; if (value) n[jobId] = value; else delete n[jobId]; return n; });
    const res = value
      ? await supabase.from("recommendation_feedback").upsert({ user_id: user.id, job_id: jobId, feedback: value }, { onConflict: "user_id,job_id" })
      : await supabase.from("recommendation_feedback").delete().eq("job_id", jobId);
    if (res.error) {
      setFeedback((f) => { const n = { ...f }; if (prev) n[jobId] = prev; else delete n[jobId]; return n; });
      toast.error("Couldn't save that — please try again");
      return;
    }
    if (value === "hidden") toast("Suggestion hidden", { action: { label: "Undo", onClick: () => setFb(jobId, null) } });
    if (value === "not_relevant") toast("Thanks — we'll stop suggesting this one");
    if (value === "relevant") toast("Thanks — we'll suggest more like this");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Compass className="w-6 h-6 text-primary" /> Recommended for you</h1>
          <p className="text-muted-foreground mt-1">Open opportunities on the platform that match the preferences you've chosen.</p>
        </div>
        <Button asChild variant="outline"><Link to="/dashboard/profile"><Settings2 className="w-4 h-4" />Update preferences</Link></Button>
      </div>

      {prefs && hasAnyPreference(prefs) && (
        <Card>
          <CardContent className="py-4 flex flex-wrap gap-2 items-center text-sm">
            <span className="text-muted-foreground mr-1">Based on:</span>
            {[...prefs.career_interests, ...prefs.preferred_industries, ...prefs.skills.slice(0, 5)].map((t, i) => <Badge key={`${t}-${i}`} variant="soft" className="bg-accent text-accent-foreground">{t}</Badge>)}
            {prefs.location && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" />{prefs.location}</Badge>}
            {prefs.work_preference && <Badge variant="outline">{WORK_LABEL[prefs.work_preference] ?? prefs.work_preference}</Badge>}
            {prefs.availability && <Badge variant="outline">{prefs.availability}</Badge>}
          </CardContent>
        </Card>
      )}

      {error ? (
        <Card><CardContent className="py-10 text-center"><AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" /><p>We couldn't load recommendations.</p><Button variant="outline" className="mt-4" onClick={load}>Try again</Button></CardContent></Card>
      ) : jobs === null ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : !hasAnyPreference(prefs) ? (
        <Card><CardContent className="py-12 text-center">
          <p className="font-medium text-foreground">Tell us what you're looking for</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Add your interests, skills, preferred industries, general location, availability or remote preference and we'll suggest matching opportunities.</p>
          <div className="mt-4 flex justify-center gap-2 flex-wrap">
            <Button asChild><Link to="/dashboard/profile">Set my preferences</Link></Button>
            <Button asChild variant="outline"><Link to="/jobs">Browse all opportunities</Link></Button>
          </div>
        </CardContent></Card>
      ) : (
        <>
          {recs.map(({ job, reasons }) => (
            <Card key={job.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg"><Link to={`/jobs/${job.id}`} className="hover:text-primary">{job.title}</Link></CardTitle>
                    <p className="text-sm text-muted-foreground">{job.company_name ?? "—"} · {job.location_type === "remote" ? "Remote" : job.location ?? job.location_type}{job.industry ? ` · ${job.industry}` : ""}</p>
                  </div>
                  {feedback[job.id] === "relevant" && <Badge variant="soft" className="bg-primary/10 text-primary">Marked relevant</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1">
                  {reasons.map((r) => <li key={r} className="text-sm text-foreground flex gap-2"><span className="text-primary">✓</span>{r}</li>)}
                </ul>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button asChild size="sm"><Link to={`/jobs/${job.id}`}>View opportunity <ArrowRight className="w-4 h-4" /></Link></Button>
                  <span className="text-xs text-muted-foreground ml-auto mr-1">Is this relevant?</span>
                  <Button size="sm" variant={feedback[job.id] === "relevant" ? "secondary" : "ghost"} aria-label="Relevant" onClick={() => setFb(job.id, feedback[job.id] === "relevant" ? null : "relevant")}><ThumbsUp className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label="Not relevant" onClick={() => setFb(job.id, "not_relevant")}><ThumbsDown className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setFb(job.id, "hidden")}><EyeOff className="w-4 h-4" />Hide</Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {recs.length < ENOUGH_RESULTS && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="font-medium text-foreground">{recs.length === 0 ? "No strong matches right now" : "That's all the strong matches for now"}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">There aren't many open opportunities that fit your preferences yet. New listings are added regularly — try broadening your preferences or browse everything that's open.</p>
                <div className="mt-4 flex justify-center gap-2 flex-wrap">
                  <Button asChild variant="outline"><Link to="/dashboard/profile">Broaden my preferences</Link></Button>
                  <Button asChild><Link to="/jobs">Browse all opportunities</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}

          {hiddenJobs.length > 0 && (
            <div>
              <Button variant="ghost" size="sm" onClick={() => setShowHidden((s) => !s)}>{showHidden ? "Hide" : "Show"} hidden suggestions ({hiddenJobs.length})</Button>
              {showHidden && (
                <div className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {hiddenJobs.map((j) => (
                    <div key={j.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <span className="truncate">{j.title} <span className="text-muted-foreground">· {feedback[j.id] === "hidden" ? "Hidden" : "Not relevant"}</span></span>
                      <Button size="sm" variant="ghost" onClick={() => setFb(j.id, null)}><Undo2 className="w-4 h-4" />Restore</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
        <span>Suggestions only use the preferences you choose above and your feedback. We never use your age, background, education, contact details or other personal information to rank opportunities, and we only show real, open listings.</span>
      </div>
    </div>
  );
}
