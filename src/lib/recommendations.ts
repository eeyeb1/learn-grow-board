// Rule-based, explainable recommendations. Only uses preferences the seeker chose
// (interests, skills, industries, broad location, work preference, availability).
// Never uses age, minor status, education, name or any other personal/sensitive data.

export interface RecPrefs {
  career_interests: string[];
  skills: string[];
  preferred_industries: string[];
  location: string | null;
  work_preference: string | null; // remote | in_person | hybrid | any
  availability: string | null;
}

export interface RecJob {
  id: string;
  title: string;
  description: string;
  industry: string | null;
  skills: string[] | null;
  location: string | null;
  location_type: string; // remote | on-site | hybrid
  duration: string | null;
  hours_per_week: string | null;
  status: string;
  expires_at: string | null;
  company_name?: string | null;
}

export type Feedback = "hidden" | "relevant" | "not_relevant";

export interface Recommendation { job: RecJob; score: number; reasons: string[] }

export const MIN_SCORE = 2;
export const ENOUGH_RESULTS = 3;

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();
const has = (hay: string, needle: string) => needle.length > 1 && hay.includes(needle);

const SCHEDULE_TERMS: { key: string; words: string[]; label: string }[] = [
  { key: "weekend", words: ["weekend", "saturday", "sunday"], label: "weekends" },
  { key: "evening", words: ["evening", "after school", "after work"], label: "evenings" },
  { key: "holiday", words: ["holiday", "summer", "half term", "half-term"], label: "holidays" },
  { key: "part", words: ["part-time", "part time", "flexible"], label: "part-time / flexible hours" },
];

export function isEligible(job: RecJob, now = new Date()) {
  if (job.status !== "active") return false;
  if (job.expires_at && new Date(job.expires_at) <= now) return false;
  return true;
}

export function recommend(
  prefs: RecPrefs,
  jobs: RecJob[],
  opts: { feedback?: Record<string, Feedback>; appliedJobIds?: string[]; now?: Date } = {},
): Recommendation[] {
  const feedback = opts.feedback ?? {};
  const applied = new Set(opts.appliedJobIds ?? []);
  const likedIndustries = new Set(
    jobs.filter((j) => feedback[j.id] === "relevant" && j.industry).map((j) => norm(j.industry)),
  );
  const pref = prefs.work_preference ?? "any";
  const loc = norm(prefs.location);
  const avail = norm(prefs.availability);

  const out: Recommendation[] = [];
  for (const job of jobs) {
    if (!isEligible(job, opts.now)) continue;
    if (applied.has(job.id)) continue;
    if (feedback[job.id] === "hidden" || feedback[job.id] === "not_relevant") continue;
    // Hard filter on the seeker's stated remote / in-person preference.
    if (pref === "remote" && job.location_type === "on-site") continue;
    if (pref === "in_person" && job.location_type === "remote") continue;

    const text = `${norm(job.title)} ${norm(job.description)} ${norm(job.industry)}`;
    const industry = norm(job.industry);
    const jobSkills = (job.skills ?? []).map(norm);
    const reasons: string[] = [];
    let score = 0;

    const ind = prefs.preferred_industries.find((i) => industry && (has(industry, norm(i)) || has(norm(i), industry)));
    if (ind) { score += 3; reasons.push(`In your preferred industry: ${ind}`); }

    const interest = prefs.career_interests.find((i) => has(text, norm(i)));
    if (interest) { score += 2; reasons.push(`Matches your interest in ${interest}`); }

    const skillHits = prefs.skills.filter((s) => jobSkills.some((js) => js === norm(s) || has(js, norm(s))) || has(text, norm(s)));
    if (skillHits.length) {
      score += Math.min(skillHits.length, 3);
      reasons.push(`Uses your skills: ${skillHits.slice(0, 3).join(", ")}`);
    }

    if (job.location_type === "remote" && (pref === "remote" || pref === "hybrid")) {
      score += 2; reasons.push("Remote, which fits your preference");
    } else if (job.location_type === "hybrid" && pref === "hybrid") {
      score += 2; reasons.push("Hybrid, which fits your preference");
    }
    if (job.location_type !== "remote" && loc && norm(job.location) && (has(norm(job.location), loc) || has(loc, norm(job.location)))) {
      score += 2; reasons.push(`Based near ${prefs.location}`);
    }

    if (avail) {
      const jobSchedule = `${norm(job.hours_per_week)} ${norm(job.duration)} ${norm(job.description)}`;
      const term = SCHEDULE_TERMS.find((t) => t.words.some((w) => avail.includes(w)) && t.words.some((w) => jobSchedule.includes(w)));
      if (term) { score += 1; reasons.push(`Suitable for your available ${term.label}`); }
    }

    if (industry && likedIndustries.has(industry)) {
      score += 1; reasons.push("Similar to opportunities you marked as relevant");
    }

    if (score >= MIN_SCORE && reasons.length) out.push({ job, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score || a.job.title.localeCompare(b.job.title));
}

export const hasAnyPreference = (p: RecPrefs | null) =>
  !!p && (p.career_interests.length > 0 || p.skills.length > 0 || p.preferred_industries.length > 0 || !!p.location || !!p.availability || (!!p.work_preference && p.work_preference !== "any"));
