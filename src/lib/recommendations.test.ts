import { describe, expect, test } from "bun:test";
import { recommend, RecJob, RecPrefs } from "./recommendations";

const prefs: RecPrefs = { career_interests: ["marketing"], skills: [], preferred_industries: [], location: null, work_preference: "any", availability: "weekends" };
const job = (o: Partial<RecJob>): RecJob => ({
  id: "1", title: "Marketing assistant", description: "Help the marketing team", industry: "Media", skills: [], location: "Leeds",
  location_type: "on-site", duration: null, hours_per_week: "Saturdays only", status: "active", expires_at: null, ...o,
});

describe("recommendations", () => {
  test("explains interest and schedule matches", () => {
    const [r] = recommend(prefs, [job({})]);
    expect(r.reasons).toContain("Matches your interest in marketing");
    expect(r.reasons).toContain("Suitable for your available weekends");
  });
  test("excludes closed, expired, applied and hidden listings", () => {
    const jobs = [job({ id: "a", status: "closed" }), job({ id: "b", expires_at: "2000-01-01" }), job({ id: "c" }), job({ id: "d" })];
    const ids = recommend(prefs, jobs, { appliedJobIds: ["c"], feedback: { d: "hidden" } }).map((r) => r.job.id);
    expect(ids).toEqual([]);
  });
  test("remote preference excludes on-site roles", () => {
    expect(recommend({ ...prefs, work_preference: "remote" }, [job({})])).toHaveLength(0);
  });
  test("weak matches below the threshold are not recommended", () => {
    expect(recommend({ ...prefs, career_interests: ["law"], availability: null }, [job({})])).toHaveLength(0);
  });
});
