import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { jobDetails } from "@/data/jobDetails";

export interface DashJob {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  skills: string[];
  inDatabase: boolean;
}

export interface DashApplication {
  id: string;
  job_id: string;
  status: string;
  submitted_at: string;
  job: DashJob | null;
}

export interface HourEntry {
  id: string;
  application_id: string;
  work_date: string;
  minutes: number;
  description: string;
  status: "pending" | "approved" | "rejected";
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface HoursSummary {
  verified_minutes: number;
  pending_minutes: number;
  pending_count: number;
  rejected_count: number;
}

export interface PublicProfileSettings {
  user_id: string;
  slug: string;
  is_public: boolean;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  show_avatar: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const formatHours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

async function resolveJobs(ids: string[]): Promise<Record<string, DashJob>> {
  const map: Record<string, DashJob> = {};
  const dbIds = [...new Set(ids.filter((id) => UUID.test(id)))];
  if (dbIds.length) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, location, skills, company:company_profiles(company_name)")
      .in("id", dbIds);
    if (error) throw error;
    for (const j of data ?? []) {
      const company = (j as { company?: { company_name: string } | null }).company;
      map[j.id] = {
        id: j.id,
        title: j.title,
        location: j.location,
        skills: j.skills ?? [],
        company: company?.company_name ?? null,
        inDatabase: true,
      };
    }
  }
  for (const id of ids) {
    if (map[id]) continue;
    const d = jobDetails[id];
    if (d) map[id] = { id, title: d.title, company: d.company, location: d.location, skills: d.skills ?? [], inDatabase: false };
  }
  return map;
}

export const useSeekerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<DashApplication[]>([]);
  const [saved, setSaved] = useState<DashJob[]>([]);
  const [hours, setHours] = useState<HourEntry[]>([]);
  const [summary, setSummary] = useState<HoursSummary>({ verified_minutes: 0, pending_minutes: 0, pending_count: 0, rejected_count: 0 });
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileSettings | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [apps, favs, hrs, sum, prof, pub] = await Promise.all([
        supabase.from("applications").select("id, job_id, status, submitted_at").eq("user_id", user.id).order("submitted_at", { ascending: false }),
        supabase.from("favorites").select("job_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("hour_entries").select("*").eq("user_id", user.id).order("work_date", { ascending: false }),
        supabase.rpc("get_my_hours_summary"),
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("public_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const firstError = [apps, favs, hrs, sum, prof, pub].find((r) => r.error)?.error;
      if (firstError) throw firstError;

      const jobMap = await resolveJobs([...(apps.data ?? []).map((a) => a.job_id), ...(favs.data ?? []).map((f) => f.job_id)]);
      setApplications((apps.data ?? []).map((a) => ({ ...a, job: jobMap[a.job_id] ?? null })));
      setSaved((favs.data ?? []).map((f) => jobMap[f.job_id]).filter(Boolean) as DashJob[]);
      setHours((hrs.data ?? []) as HourEntry[]);
      if (sum.data) setSummary(sum.data as unknown as HoursSummary);
      setProfile(prof.data ?? null);
      setPublicProfile((pub.data as PublicProfileSettings) ?? null);
    } catch (e) {
      console.error("Dashboard load failed:", e);
      setError("We couldn't load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const logHours = async (input: { application_id: string; work_date: string; minutes: number; description: string }) => {
    if (!user) return { error: "Not signed in" };
    const { error } = await supabase.from("hour_entries").insert({ ...input, user_id: user.id });
    if (error) return { error: error.message };
    await load();
    return { error: null };
  };

  const deleteHours = async (id: string) => {
    const { error } = await supabase.from("hour_entries").delete().eq("id", id);
    if (error) return { error: error.message };
    await load();
    return { error: null };
  };

  const savePublicProfile = async (values: Omit<PublicProfileSettings, "user_id">) => {
    if (!user) return { error: "Not signed in" };
    const { error } = await supabase.from("public_profiles").upsert({ ...values, user_id: user.id, slug: values.slug.toLowerCase() });
    if (error) return { error: error.code === "23505" ? "That link is already taken — try another." : error.message };
    await load();
    return { error: null };
  };

  const activePlacements = applications.filter((a) => a.status === "accepted");
  const completed = applications.filter((a) => a.status === "completed");

  const completionChecks = [
    { label: "Add your name", done: !!profile?.full_name },
    { label: "Upload a profile photo", done: !!profile?.avatar_url },
    { label: "Write a headline", done: !!publicProfile?.headline },
    { label: "Add a short bio", done: !!publicProfile?.bio },
    { label: "List your skills", done: (publicProfile?.skills?.length ?? 0) > 0 },
    { label: "Apply for an opportunity", done: applications.length > 0 },
  ];
  const completion = Math.round((completionChecks.filter((c) => c.done).length / completionChecks.length) * 100);

  return {
    loading, error, reload: load,
    applications, activePlacements, completed, saved, hours, summary, profile, publicProfile,
    completionChecks, completion,
    logHours, deleteHours, savePublicProfile,
  };
};
