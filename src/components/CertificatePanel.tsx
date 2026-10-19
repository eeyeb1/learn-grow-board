import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { buildCertificatePdf, CERT_DISCLAIMER, CertificateRecord, downloadBlob, fmtDate, fmtMinutes, verifyUrl } from "@/lib/certificatePdf";
import { toast } from "sonner";
import { Award, Ban, Copy, Download, ExternalLink, Info, Loader2, RefreshCw } from "lucide-react";

interface Props { placementId: string; status: string; isSeeker: boolean; canManage: boolean; onChange: () => void }

const CertificatePanel = ({ placementId, status, isSeeker, canManage, onChange }: Props) => {
  const [cert, setCert] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("certificates").select("*").eq("placement_id", placementId).maybeSingle();
    if (error) toast.error("Couldn't load the certificate");
    const c = (data as CertificateRecord | null) ?? null;
    setCert(c);
    setPdf(null);
    setLoading(false);
    if (c && !c.revoked_at) buildCertificatePdf(c).then(setPdf).catch(() => toast.error("Couldn't prepare the PDF"));
  }, [placementId]);

  useEffect(() => { load(); }, [load]);

  const issue = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("issue_certificate", { _placement_id: placementId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Certificate generated from approved records");
    await load(); onChange();
  };

  const revoke = async () => {
    if (!cert) return;
    const { error } = await supabase.rpc("revoke_certificate", { _id: cert.id, _reason: reason });
    if (error) return toast.error(error.message);
    toast.success("Certificate revoked");
    setReason(""); await load(); onChange();
  };

  const setPrivacy = async (patch: Partial<CertificateRecord>) => {
    if (!cert) return;
    const next = { ...cert, ...patch };
    setCert(next);
    const { error } = await supabase.rpc("set_certificate_privacy", {
      _id: cert.id, _verification_enabled: next.verification_enabled, _show_name: next.show_name,
      _show_hours: next.show_hours, _show_skills: next.show_skills,
    });
    if (error) { toast.error("Couldn't save privacy settings"); load(); }
  };

  if (loading) return <Skeleton className="h-48" />;

  if (status !== "completed") {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">A certificate becomes available once your employer marks this placement as completed and has approved your hours.</CardContent></Card>;
  }

  if (!cert) {
    return (
      <Card><CardContent className="p-6 space-y-3">
        <p className="text-foreground font-medium">No certificate generated yet</p>
        <p className="text-sm text-muted-foreground">The certificate is built from the records stored on ExpBoard: your display name, the company, role, dates, employer-approved hours and employer-confirmed skills. Nothing can be typed in or changed by hand.</p>
        {(isSeeker || canManage) && <Button onClick={issue} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Award className="w-4 h-4 mr-1" />}Generate certificate</Button>}
      </CardContent></Card>
    );
  }

  const url = verifyUrl(cert.code);

  return (
    <div className="space-y-4">
      {cert.revoked_at ? (
        <Card className="border-destructive/40"><CardContent className="p-6 space-y-2">
          <Badge variant="destructive">Revoked</Badge>
          <p className="text-foreground">This certificate was revoked on {fmtDate(cert.revoked_at)} and will show as revoked to anyone who checks it.</p>
          {cert.revocation_reason && <p className="text-sm text-muted-foreground">Reason: “{cert.revocation_reason}”</p>}
          {canManage && <Button variant="outline" size="sm" onClick={issue} disabled={busy}><RefreshCw className="w-4 h-4 mr-1" />Reissue with a new ID</Button>}
        </CardContent></Card>
      ) : (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-8 text-center space-y-2">
            <Award className="w-10 h-10 text-primary mx-auto" />
            <p className="uppercase tracking-widest text-xs text-muted-foreground">Certificate of Work Experience</p>
            <p className="font-display text-2xl font-bold text-foreground">{cert.seeker_name}</p>
            <p className="text-muted-foreground">{cert.role_title} at <span className="text-foreground font-medium">{cert.company_name}</span></p>
            <p className="text-sm text-muted-foreground">{fmtDate(cert.start_date)} – {fmtDate(cert.end_date)} · {fmtMinutes(cert.approved_minutes)} employer-approved</p>
            {cert.skills.length > 0 && <div className="flex flex-wrap justify-center gap-1 pt-1">{cert.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>}
            <p className="text-xs text-muted-foreground pt-2">ID {cert.code} · Issued {fmtDate(cert.issued_at)}</p>
            <div className="flex flex-wrap justify-center gap-2 pt-3">
              <Button size="sm" disabled={!pdf} onClick={() => pdf && downloadBlob(pdf, `ExpBoard-certificate-${cert.code}.pdf`)}>
                {pdf ? <Download className="w-4 h-4 mr-1" /> : <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Download PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Verification link copied"); }}><Copy className="w-4 h-4 mr-1" />Copy verification link</Button>
              <Link to={`/verify/${cert.code}`}><Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4 mr-1" />View verification page</Button></Link>
              {(isSeeker || canManage) && <Button size="sm" variant="ghost" onClick={issue} disabled={busy}><RefreshCw className="w-4 h-4 mr-1" />Refresh from records</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
        <p>{CERT_DISCLAIMER}</p>
      </div>

      {isSeeker && !cert.revoked_at && (
        <Card>
          <CardHeader><CardTitle className="text-base">What the verification page shows</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">The company, role and dates are always shown so the certificate can be checked. Choose what else people see.</p>
            {([
              ["verification_enabled", "Allow people to verify this certificate", "If off, the page only says the certificate is private."],
              ["show_name", "Show my display name", "Off by default for under-18s."],
              ["show_hours", "Show approved hours", ""],
              ["show_skills", "Show employer-confirmed skills", ""],
            ] as const).map(([key, label, hint]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div><Label htmlFor={key}>{label}</Label>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>
                <Switch id={key} checked={cert[key]} disabled={key !== "verification_enabled" && !cert.verification_enabled} onCheckedChange={(v) => setPrivacy({ [key]: v })} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canManage && !cert.revoked_at && (
        <Card><CardContent className="p-6 space-y-2">
          <p className="font-medium text-foreground">Revoke certificate</p>
          <p className="text-sm text-muted-foreground">Use this only if the certificate is wrong. Anyone checking it will see it is revoked. This is recorded in the placement history.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-destructive"><Ban className="w-4 h-4 mr-1" />Revoke</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke this certificate?</AlertDialogTitle>
                <AlertDialogDescription>Give a short reason. The seeker will see it.</AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="e.g. Hours were recorded incorrectly" />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={reason.trim().length < 5} onClick={revoke}>Revoke</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent></Card>
      )}
    </div>
  );
};

export default CertificatePanel;
