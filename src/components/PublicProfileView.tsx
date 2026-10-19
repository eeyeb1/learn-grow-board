import { PublicVerifiedSkill, categoryLabel } from "@/lib/skills";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatHours } from "@/hooks/useSeekerDashboard";
import { Award, BadgeCheck, Quote, User } from "lucide-react";

export interface PublicData {
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  is_minor?: boolean;
  skills: string[];
  career_interests: string[];
  preferred_industries: string[];
  work_preference: string | null;
  location: string | null;
  education_level: string | null;
  availability: string | null;
  links: { label: string; url: string }[];
  avatar_url: string | null;
  verified_minutes: number | null;
  verified_skills: PublicVerifiedSkill[];
  experiences: { title: string; company: string; start: string | null; end: string | null; verified_minutes: number | null }[];
  references: { author_name: string; author_role: string | null; content: string; company: string }[];
}

const WORK_PREF: Record<string, string> = { remote: "Remote", in_person: "In person", hybrid: "Hybrid", any: "Open to any" };
const month = (ym: string | null) => (ym ? new Date(ym + "-01T00:00:00").toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null);

const Verified = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
    <BadgeCheck className="w-3.5 h-3.5" /> Employer Verified
  </span>
);
const SelfReported = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
    <User className="w-3.5 h-3.5" /> Self Reported
  </span>
);

const Section = ({ title, tag, children }: { title: string; tag: React.ReactNode; children: React.ReactNode }) => (
  <Card><CardContent className="p-6">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="font-semibold text-foreground">{title}</h2>{tag}
    </div>
    {children}
  </CardContent></Card>
);

const PublicProfileView = ({ data }: { data: PublicData }) => {
  const facts = [
    data.location && ["Location", data.location],
    data.work_preference && ["Work preference", WORK_PREF[data.work_preference] ?? data.work_preference],
    data.education_level && ["Education", data.education_level],
    data.availability && ["Availability", data.availability],
  ].filter(Boolean) as [string, string][];
  const safeLinks = data.links.filter((l) => l.url.startsWith("https://"));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full gradient-hero flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {(data.display_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-foreground">{data.display_name || "Experience seeker"}</h1>
            {data.headline && <p className="text-muted-foreground">{data.headline}</p>}
            {data.verified_minutes !== null && (
              <div className="inline-flex items-center gap-2 mt-3 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
                <BadgeCheck className="w-4 h-4" /> {formatHours(data.verified_minutes)} verified by employers
              </div>
            )}
            {data.bio && (
              <div className="mt-4">
                <p className="text-foreground whitespace-pre-line">{data.bio}</p>
                <p className="mt-1"><SelfReported /></p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {data.experiences.length > 0 && (
        <Section title="Completed placements" tag={<Verified />}>
          {data.experiences.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <Award className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.company}{e.start || e.end ? ` · ${[month(e.start), month(e.end)].filter(Boolean).join(" – ")}` : ""}</p>
                </div>
              </div>
              {e.verified_minutes !== null && <span className="text-sm text-muted-foreground shrink-0">{formatHours(e.verified_minutes)}</span>}
            </div>
          ))}
        </Section>
      )}

      {data.verified_skills.length > 0 && (
        <Section title="Employer-confirmed skills" tag={<Verified />}>
          <div className="space-y-3">{data.verified_skills.map((s, i) => (
            <div key={i}>
              <p className="text-foreground font-medium flex flex-wrap items-center gap-2"><BadgeCheck className="w-4 h-4 text-primary" />{s.skill}<Badge variant="soft">{categoryLabel(s.category)}</Badge></p>
              {s.example && <p className="text-sm text-muted-foreground mt-0.5">“{s.example}”</p>}
              <p className="text-xs text-muted-foreground">Confirmed by {s.company} · {new Date(s.verified_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</p>
            </div>
          ))}</div>
        </Section>
      )}

      {data.references.length > 0 && (
        <Section title="References" tag={<Verified />}>
          <div className="space-y-4">
            {data.references.map((r, i) => (
              <blockquote key={i} className="border-l-2 border-primary pl-4">
                <Quote className="w-4 h-4 text-primary mb-1" />
                <p className="text-foreground whitespace-pre-line">{r.content}</p>
                <footer className="text-xs text-muted-foreground mt-1">— {r.author_name}{r.author_role ? `, ${r.author_role}` : ""} · {r.company}</footer>
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {data.skills.length > 0 && (
        <Section title="Skills" tag={<SelfReported />}>
          <div className="flex flex-wrap gap-2">{data.skills.map((s) => <Badge key={s} variant="soft">{s}</Badge>)}</div>
        </Section>
      )}

      {(data.career_interests.length > 0 || data.preferred_industries.length > 0 || facts.length > 0) && (
        <Section title="About" tag={<SelfReported />}>
          <div className="space-y-4">
            {facts.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {facts.map(([l, v]) => <div key={l}><p className="text-muted-foreground">{l}</p><p className="text-foreground">{v}</p></div>)}
              </div>
            )}
            {data.career_interests.length > 0 && (
              <div><p className="text-sm text-muted-foreground mb-1.5">Career interests</p>
                <div className="flex flex-wrap gap-2">{data.career_interests.map((s) => <Badge key={s} variant="soft">{s}</Badge>)}</div></div>
            )}
            {data.preferred_industries.length > 0 && (
              <div><p className="text-sm text-muted-foreground mb-1.5">Preferred industries</p>
                <div className="flex flex-wrap gap-2">{data.preferred_industries.map((s) => <Badge key={s} variant="soft">{s}</Badge>)}</div></div>
            )}
          </div>
        </Section>
      )}

      {safeLinks.length > 0 && (
        <Section title="Portfolio" tag={<SelfReported />}>
          <ul className="space-y-1.5">{safeLinks.map((l) => (
            <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-primary hover:underline text-sm">{l.label}</a></li>
          ))}</ul>
        </Section>
      )}
    </div>
  );
};

export default PublicProfileView;
