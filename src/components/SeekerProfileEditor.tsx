import { useRef, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useSeekerDashboard, PublicProfileSettings } from "@/hooks/useSeekerDashboard";
import { toast } from "sonner";
import { Camera, Copy, ExternalLink, Loader2, Lock, Plus, Trash2, X, Lightbulb } from "lucide-react";

type D = ReturnType<typeof useSeekerDashboard>;
type Form = Omit<PublicProfileSettings, "user_id">;

const EDUCATION = ["Secondary school", "College / sixth form", "Apprenticeship", "Undergraduate degree", "Postgraduate degree", "Vocational qualification", "Self-taught", "Prefer not to say"];
const WORK_PREFS = [
  { value: "remote", label: "Remote" },
  { value: "in_person", label: "In person" },
  { value: "hybrid", label: "Hybrid" },
  { value: "any", label: "Open to any" },
];

const tag = z.string().trim().min(1).max(40);
const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/, "Profile link can use 3–40 lowercase letters, numbers and dashes"),
  display_name: z.string().trim().max(80, "Display name is too long"),
  headline: z.string().trim().max(120, "Headline must be 120 characters or fewer"),
  bio: z.string().trim().max(1000, "Bio must be 1000 characters or fewer"),
  location: z.string().trim().max(80, "Location is too long")
    .refine((v) => !/\d{1,5}\s+\w+\s+(street|st|road|rd|avenue|ave|lane|ln)\b/i.test(v), "Use a town or region, not a street address"),
  availability: z.string().trim().max(120, "Availability is too long"),
  education_level: z.string().max(80),
  skills: z.array(tag).max(30, "Up to 30 skills"),
  career_interests: z.array(tag).max(15, "Up to 15 career interests"),
  preferred_industries: z.array(tag).max(15, "Up to 15 industries"),
  links: z.array(z.object({
    label: z.string().trim().min(1, "Each link needs a label").max(40, "Link label is too long"),
    url: z.string().trim().url("Enter a valid URL").max(300).refine((u) => u.startsWith("https://"), "Links must start with https://"),
  })).max(6, "Up to 6 links"),
});

const TagInput = ({ id, label, values, onChange, placeholder, max }: { id: string; label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; max: number }) => {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim().slice(0, 40);
    if (!v) return;
    if (values.length >= max) return toast.error(`Up to ${max} items`);
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setText("");
  };
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input id={id} value={text} maxLength={40} placeholder={placeholder} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} />
        <Button type="button" variant="outline" size="icon" aria-label={`Add ${label}`} onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {values.map((v) => (
            <Badge key={v} variant="soft" className="gap-1 pr-1">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="rounded-full hover:bg-background/60 p-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const VisibilityRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-foreground">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
  </div>
);

const SeekerProfileEditor = ({ d }: { d: D }) => {
  const p = d.publicProfile;
  const { uploadAvatar, updateProfile, uploading } = useUserProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [initialSlug] = useState(() =>
    (d.profile?.full_name || "me").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) + "-" + Math.random().toString(36).slice(2, 6));
  const [form, setForm] = useState<Form>({
    slug: p?.slug ?? initialSlug,
    is_public: p?.is_public ?? false,
    display_name: p?.display_name ?? d.profile?.full_name ?? "",
    headline: p?.headline ?? "",
    bio: p?.bio ?? "",
    skills: p?.skills ?? [],
    show_avatar: p?.show_avatar ?? false,
    career_interests: p?.career_interests ?? [],
    education_level: p?.education_level ?? "",
    preferred_industries: p?.preferred_industries ?? [],
    location: p?.location ?? "",
    work_preference: p?.work_preference ?? "",
    availability: p?.availability ?? "",
    links: p?.links ?? [],
    show_location: p?.show_location ?? false,
    show_education: p?.show_education ?? false,
    show_availability: p?.show_availability ?? false,
    show_links: p?.show_links ?? true,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const url = `${window.location.origin}/p/${p?.slug ?? form.slug}`;
  const missing = d.completionChecks.filter((c) => !c.done);

  const save = async () => {
    const parsed = schema.safeParse({
      ...form,
      display_name: form.display_name ?? "", headline: form.headline ?? "", bio: form.bio ?? "",
      location: form.location ?? "", availability: form.availability ?? "", education_level: form.education_level ?? "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const v = parsed.data;
    setBusy(true);
    const { error } = await d.savePublicProfile({
      ...form,
      ...v,
      display_name: v.display_name || null,
      headline: v.headline || null,
      bio: v.bio || null,
      location: v.location || null,
      availability: v.availability || null,
      education_level: v.education_level || null,
      work_preference: form.work_preference || null,
      links: v.links as { label: string; url: string }[],
    });
    setBusy(false);
    error ? toast.error(error) : toast.success("Profile saved");
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use a JPG, PNG or WebP image");
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
    const { error } = await uploadAvatar(file);
    if (error) return toast.error("Couldn't upload photo");
    toast.success("Photo updated");
    d.reload();
  };

  const removePhoto = async () => {
    const { error } = await updateProfile({ avatar_url: "" });
    if (error) return toast.error("Couldn't remove photo");
    toast.success("Photo removed");
    d.reload();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Profile completion</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={d.completion} className="flex-1" />
            <span className="text-sm font-medium text-foreground">{d.completion}%</span>
          </div>
          {missing.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your profile is complete — nice work.</p>
          ) : (
            <div className="rounded-lg bg-accent/50 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground mb-1.5"><Lightbulb className="w-4 h-4 text-primary" />Suggestions</p>
              <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-0.5">
                {missing.slice(0, 5).map((m) => <li key={m.label}>{m.label}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <p className="text-sm text-muted-foreground flex items-start gap-2"><Lock className="w-4 h-4 mt-0.5 shrink-0" />Your email, phone number and account details stay private and are managed in Settings. They are never shown on your public profile.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {d.profile?.avatar_url ? (
              <img src={d.profile.avatar_url} alt="Your profile photo" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center"><Camera className="w-6 h-6 text-accent-foreground" /></div>
            )}
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{d.profile?.avatar_url ? "Change photo" : "Add photo (optional)"}
              </Button>
              {d.profile?.avatar_url && <Button type="button" size="sm" variant="ghost" onClick={removePhoto}><Trash2 className="w-4 h-4 mr-1" />Remove</Button>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dn">Display name</Label>
              <Input id="dn" maxLength={80} value={form.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hl">Headline</Label>
              <Input id="hl" maxLength={120} value={form.headline ?? ""} onChange={(e) => set("headline", e.target.value)} placeholder="e.g. Career changer exploring UX design" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea id="bio" maxLength={1000} rows={4} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
            <p className="text-xs text-muted-foreground text-right">{(form.bio ?? "").length}/1000</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interests & skills</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TagInput id="ci" label="Career interests" values={form.career_interests} onChange={(v) => set("career_interests", v)} placeholder="e.g. Marketing — press Enter" max={15} />
          <TagInput id="sk" label="Skills" values={form.skills} onChange={(v) => set("skills", v)} placeholder="e.g. Excel — press Enter" max={30} />
          <TagInput id="pi" label="Preferred industries" values={form.preferred_industries} onChange={(v) => set("preferred_industries", v)} placeholder="e.g. Healthcare — press Enter" max={15} />
          <div className="space-y-1.5">
            <Label>Education level</Label>
            <div className="flex gap-2">
              <Select value={form.education_level || undefined} onValueChange={(v) => set("education_level", v)}>
                <SelectTrigger><SelectValue placeholder="Choose (optional)" /></SelectTrigger>
                <SelectContent>{EDUCATION.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
              {form.education_level && <Button type="button" variant="ghost" size="icon" aria-label="Clear education" onClick={() => set("education_level", "")}><X className="w-4 h-4" /></Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Location & availability</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="loc">General location</Label>
            <Input id="loc" maxLength={80} value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Town or region, e.g. Manchester" />
          </div>
          <div className="space-y-1.5">
            <Label>Remote / in-person preference</Label>
            <div className="flex gap-2">
              <Select value={form.work_preference || undefined} onValueChange={(v) => set("work_preference", v)}>
                <SelectTrigger><SelectValue placeholder="Choose (optional)" /></SelectTrigger>
                <SelectContent>{WORK_PREFS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
              </Select>
              {form.work_preference && <Button type="button" variant="ghost" size="icon" aria-label="Clear preference" onClick={() => set("work_preference", "")}><X className="w-4 h-4" /></Button>}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="av">Availability</Label>
            <Input id="av" maxLength={120} value={form.availability ?? ""} onChange={(e) => set("availability", e.target.value)} placeholder="e.g. Weekends and school holidays" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Portfolio links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {form.links.length === 0 && <p className="text-sm text-muted-foreground">Add links to work you're proud of — a portfolio, LinkedIn or GitHub.</p>}
          {form.links.map((l, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2">
              <Input aria-label="Link label" className="sm:w-40" maxLength={40} placeholder="Label" value={l.label}
                onChange={(e) => set("links", form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label="Link URL" maxLength={300} placeholder="https://" value={l.url}
                onChange={(e) => set("links", form.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove link" onClick={() => set("links", form.links.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          {form.links.length < 6 && (
            <Button type="button" variant="outline" size="sm" onClick={() => set("links", [...form.links, { label: "", url: "https://" }])}><Plus className="w-4 h-4 mr-1" />Add link</Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public profile & visibility</CardTitle>
          <p className="text-sm text-muted-foreground">Your public page shows your display name, headline, bio, skills, interests, industries and work preference, plus verified hours and completed experiences. Choose what else to share.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium text-foreground">Make my profile public</p>
              <p className="text-xs text-muted-foreground">Off by default. Anyone with the link can view it when on.</p>
            </div>
            <Switch checked={form.is_public} onCheckedChange={(v) => set("is_public", v)} aria-label="Make my profile public" />
          </div>
          {p?.is_public && (
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Public profile link" />
              <Button variant="outline" size="icon" aria-label="Copy link" onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied"); }}><Copy className="w-4 h-4" /></Button>
              <a href={url} target="_blank" rel="noreferrer"><Button variant="outline" size="icon" aria-label="Open profile"><ExternalLink className="w-4 h-4" /></Button></a>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="slug">Profile link</Label>
            <Input id="slug" value={form.slug} maxLength={40} onChange={(e) => set("slug", e.target.value.toLowerCase())} />
          </div>
          <div className="divide-y divide-border">
            <VisibilityRow label="Show profile photo" checked={form.show_avatar} onChange={(v) => set("show_avatar", v)} />
            <VisibilityRow label="Show general location" checked={form.show_location} onChange={(v) => set("show_location", v)} />
            <VisibilityRow label="Show education level" checked={form.show_education} onChange={(v) => set("show_education", v)} />
            <VisibilityRow label="Show availability" checked={form.show_availability} onChange={(v) => set("show_availability", v)} />
            <VisibilityRow label="Show portfolio links" checked={form.show_links} onChange={(v) => set("show_links", v)} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={busy} className="shadow-elevated">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save profile</Button>
      </div>
    </div>
  );
};

export default SeekerProfileEditor;
