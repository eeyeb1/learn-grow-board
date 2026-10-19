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
import { useSeekerDashboard, PublicProfileSettings, profileUrl, shareProfile } from "@/hooks/useSeekerDashboard";
import PublicProfileView, { PublicData } from "@/components/PublicProfileView";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Camera, Copy, ExternalLink, Eye, EyeOff, Globe, Share2, ShieldCheck, Loader2, Lock, Plus, Trash2, X, Lightbulb } from "lucide-react";

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

const VisibilityRow = ({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
  <div className="flex items-center justify-between py-2">
    <span className={`text-sm ${disabled ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
    <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
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
    is_minor: p?.is_minor ?? false,
    guardian_acknowledged: p?.guardian_acknowledged ?? false,
    show_summary: p?.show_summary ?? true,
    show_self_skills: p?.show_self_skills ?? true,
    show_interests: p?.show_interests ?? true,
    show_experiences: p?.show_experiences ?? true,
    show_hours: p?.show_hours ?? true,
    show_verified_skills: p?.show_verified_skills ?? true,
    show_references: p?.show_references ?? false,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const url = profileUrl(p?.slug ?? form.slug);
  const published = !!p?.is_public;
  const missing = d.completionChecks.filter((c) => !c.done);

  const save = async (publish?: boolean) => {
    const isPublic = publish ?? published;
    if (isPublic && form.is_minor && !form.guardian_acknowledged) return toast.error("Please confirm the under-18 safeguard before publishing");
    if (publish && !form.display_name?.trim()) return toast.error("Add a display name before publishing");
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
      is_public: isPublic,
    });
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(publish === true ? "Profile published" : publish === false ? "Profile unpublished — it's private again" : "Profile saved");
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
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" />Age & safeguarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-foreground">
            <Checkbox checked={form.is_minor} onCheckedChange={(v) => {
              const minor = !!v;
              setForm((f) => ({ ...f, is_minor: minor, ...(minor ? { show_avatar: false, show_location: false, show_links: false, show_references: false } : { guardian_acknowledged: false }) }));
            }} />
            <span>I am under 18<span className="block text-xs text-muted-foreground">We use stronger privacy defaults: your photo and location are never shown publicly and portfolio links start hidden. We don't ask for your date of birth.</span></span>
          </label>
          {form.is_minor && (
            <label className="flex items-start gap-3 text-sm text-foreground rounded-lg bg-accent/50 p-3">
              <Checkbox checked={form.guardian_acknowledged} onCheckedChange={(v) => set("guardian_acknowledged", !!v)} />
              <span>A parent, guardian or teacher knows I'm sharing this profile, and I understand anyone with the link can see it.</span>
            </label>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Section privacy</CardTitle>
          <p className="text-sm text-muted-foreground">Choose what appears on your public profile. Contact details, date of birth, exact address, diary entries, pending hours and application history are never shown.</p>
        </CardHeader>
        <CardContent>
          <p className="text-xs font-medium text-primary uppercase tracking-wide mt-1">Employer verified</p>
          <div className="divide-y divide-border">
            <VisibilityRow label="Total verified hours" checked={form.show_hours} onChange={(v) => set("show_hours", v)} />
            <VisibilityRow label="Completed placements" checked={form.show_experiences} onChange={(v) => set("show_experiences", v)} />
            <VisibilityRow label="Employer-confirmed skills" checked={form.show_verified_skills} onChange={(v) => set("show_verified_skills", v)} />
            <VisibilityRow label="Approved references" checked={form.show_references} onChange={(v) => set("show_references", v)} />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-4">Self-reported</p>
          <div className="divide-y divide-border">
            <VisibilityRow label="Personal summary (bio)" checked={form.show_summary} onChange={(v) => set("show_summary", v)} />
            <VisibilityRow label="My skills" checked={form.show_self_skills} onChange={(v) => set("show_self_skills", v)} />
            <VisibilityRow label="Interests, industries & work preference" checked={form.show_interests} onChange={(v) => set("show_interests", v)} />
            <VisibilityRow label="Education level" checked={form.show_education} onChange={(v) => set("show_education", v)} />
            <VisibilityRow label="Availability" checked={form.show_availability} onChange={(v) => set("show_availability", v)} />
            <VisibilityRow label="Portfolio links" checked={form.show_links} onChange={(v) => set("show_links", v)} />
            <VisibilityRow label={form.is_minor ? "Profile photo (hidden for under-18s)" : "Profile photo"} checked={form.show_avatar && !form.is_minor} disabled={form.is_minor} onChange={(v) => set("show_avatar", v)} />
            <VisibilityRow label={form.is_minor ? "General location (hidden for under-18s)" : "General location"} checked={form.show_location && !form.is_minor} disabled={form.is_minor} onChange={(v) => set("show_location", v)} />
          </div>
        </CardContent>
      </Card>

      <ReferencesCard d={d} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" />Live preview</CardTitle>
          <Badge variant="soft">{published ? "Published" : "Private"}</Badge>
        </CardHeader>
        <CardContent className="bg-muted/40 rounded-b-lg pt-6">
          <PublicProfileView data={buildPreview(form, d)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publish</CardTitle>
          <p className="text-sm text-muted-foreground">Your profile stays private until you publish it. You can unpublish at any time.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="slug">Username</Label>
            <div className="flex items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">/profile/</span>
              <input id="slug" className="flex-1 bg-transparent py-2 text-foreground outline-none" value={form.slug} maxLength={40}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
            </div>
            {published && form.slug !== p?.slug && <p className="text-xs text-destructive">Changing your username will break links you've already shared.</p>}
          </div>
          {published && (
            <div className="flex flex-wrap gap-2">
              <Input readOnly value={url} aria-label="Public profile link" className="flex-1 min-w-[200px]" />
              <Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(url); toast.success("Link copied"); }}><Copy className="w-4 h-4 mr-1" />Copy link</Button>
              <Button variant="outline" onClick={async () => { await shareProfile(p!.slug); }}><Share2 className="w-4 h-4 mr-1" />Share</Button>
              <a href={url} target="_blank" rel="noreferrer"><Button variant="ghost" size="icon" aria-label="Open profile"><ExternalLink className="w-4 h-4" /></Button></a>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {published ? (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="outline" disabled={busy}><EyeOff className="w-4 h-4 mr-1" />Unpublish</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Unpublish your profile?</AlertDialogTitle>
                    <AlertDialogDescription>Your link will stop working straight away. Your details are kept so you can publish again later.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Keep published</AlertDialogCancel><AlertDialogAction onClick={() => save(false)}>Unpublish</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button disabled={busy}><Globe className="w-4 h-4 mr-1" />Publish profile</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Publish your profile?</AlertDialogTitle>
                    <AlertDialogDescription>Anyone with your link will be able to see exactly what's in the live preview. It won't be listed in search engines.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Not yet</AlertDialogCancel><AlertDialogAction onClick={() => save(true)}>Publish</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={() => save()} disabled={busy} className="shadow-elevated">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save changes</Button>
      </div>
    </div>
  );
};

const ReferencesCard = ({ d }: { d: D }) => {
  if (d.references.length === 0) {
    return (
      <Card><CardHeader><CardTitle>References</CardTitle>
        <p className="text-sm text-muted-foreground">Employers can write you a reference once a placement is completed. You choose which ones to show.</p>
      </CardHeader></Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle>References</CardTitle>
        <p className="text-sm text-muted-foreground">Only references you approve can appear on your public profile.</p></CardHeader>
      <CardContent className="space-y-3">
        {d.references.map((r) => {
          const company = d.placements.find((x) => x.id === r.placement_id)?.company?.company_name;
          return (
            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm text-foreground whitespace-pre-line">{r.content}</p>
              <p className="text-xs text-muted-foreground">— {r.author_name}{r.author_role ? `, ${r.author_role}` : ""}{company ? ` · ${company}` : ""}</p>
              <div className="flex items-center gap-2">
                <Switch checked={r.seeker_approved} aria-label="Approve reference for public profile" onCheckedChange={async (v) => {
                  const { error } = await d.setReferenceApproval(r.id, v);
                  if (error) toast.error("Couldn't update reference");
                }} />
                <span className="text-sm text-foreground">{r.seeker_approved ? "Approved to show" : "Not approved"}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

function buildPreview(f: Form, d: D): PublicData {
  const completed = d.placements.filter((x) => x.status === "completed");
  const minutesFor = (appId: string) => d.hours.filter((h) => h.application_id === appId && h.status === "approved").reduce((s, h) => s + h.minutes, 0);
  return {
    display_name: f.display_name || null,
    headline: f.headline || null,
    bio: f.show_summary ? f.bio || null : null,
    skills: f.show_self_skills ? f.skills : [],
    career_interests: f.show_interests ? f.career_interests : [],
    preferred_industries: f.show_interests ? f.preferred_industries : [],
    work_preference: f.show_interests ? f.work_preference || null : null,
    location: f.show_location && !f.is_minor ? f.location || null : null,
    education_level: f.show_education ? f.education_level || null : null,
    availability: f.show_availability ? f.availability || null : null,
    links: f.show_links ? f.links.filter((l) => l.url.startsWith("https://") && l.label) : [],
    avatar_url: f.show_avatar && !f.is_minor ? d.profile?.avatar_url ?? null : null,
    verified_minutes: f.show_hours ? d.summary.verified_minutes : null,
    verified_skills: f.show_verified_skills ? [...new Set(completed.flatMap((x) => x.confirmed_skills))].sort() : [],
    experiences: f.show_experiences ? completed.map((x) => ({
      title: x.job?.title ?? "Role", company: x.company?.company_name ?? "",
      start: x.start_date?.slice(0, 7) ?? null, end: x.end_date?.slice(0, 7) ?? null,
      verified_minutes: f.show_hours ? minutesFor(x.application_id) : null,
    })) : [],
    references: f.show_references ? d.references.filter((r) => r.seeker_approved).map((r) => ({
      author_name: r.author_name, author_role: r.author_role, content: r.content,
      company: d.placements.find((x) => x.id === r.placement_id)?.company?.company_name ?? "",
    })) : [],
  };
}

export default SeekerProfileEditor;
