export type HourStatus = "pending" | "approved" | "rejected" | "correction_requested";

export const hourStatusLabel = (s: string) =>
  ({ pending: "Pending", approved: "Approved", rejected: "Rejected", correction_requested: "Correction requested" } as Record<string, string>)[s] ?? s;

export const HOUR_FLAG_LABELS: Record<string, string> = {
  overlap: "Overlaps another entry",
  duplicate: "Possible duplicate",
  long_shift: "Over 12 hours",
  daily_total_over_12h: "Day total over 12 hours",
  no_break_long_shift: "No break on a long shift",
  outside_placement_dates: "Outside placement dates",
  logged_late: "Logged over 30 days later",
};

/** Mirrors the server: duration = (end - start) - break. Server value is authoritative. */
export const durationFromTimes = (start: string, end: string, breakMinutes: number): number | null => {
  const toMin = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
  if (!start || !end) return null;
  const span = toMin(end) - toMin(start);
  if (span <= 0 || breakMinutes < 0 || breakMinutes >= span) return null;
  return span - breakMinutes;
};

export const seekerCanEditHours = (s: string) => s === "pending" || s === "correction_requested";
