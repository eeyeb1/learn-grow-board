import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CERT_DISCLAIMER, fmtDate, fmtMinutes } from "@/lib/certificatePdf";
import { BadgeCheck, Ban, Info, Lock, SearchX, ShieldCheck } from "lucide-react";

interface Result {
  status: "valid" | "revoked" | "private" | "not_found";
  code?: string; seeker_name?: string | null; company_name?: string; role_title?: string;
  start_date?: string | null; end_date?: string | null; issued_at?: string; revoked_at?: string;
  approved_minutes?: number | null; skills?: string[] | null;
}

const VerifyCertificate = () => {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code);
  const [res, setRes] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "robots"); document.head.appendChild(meta); }
    meta.setAttribute("content", "noindex");
    return () => meta?.remove();
  }, []);

  useEffect(() => {
    setInput(code);
    if (!code) { setRes(null); return; }
    setLoading(true);
    supabase.rpc("verify_certificate", { _code: code }).then(({ data, error }) => {
      setLoading(false);
      setRes(error ? { status: "not_found" } : (data as unknown as Result));
    });
  }, [code]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16 max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
          <h1 className="font-display text-3xl font-bold text-foreground">Verify a certificate</h1>
          <p className="text-muted-foreground">Enter the certificate ID printed on an ExpBoard work experience certificate.</p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = input.trim().toUpperCase(); if (c) navigate(`/verify/${encodeURIComponent(c)}`); }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="EXP-XXXX-XXXX-XXXX" maxLength={30} aria-label="Certificate ID" />
          <Button type="submit">Check</Button>
        </form>

        {loading && <Skeleton className="h-48" />}
        {!loading && res?.status === "valid" && (
          <Card className="border-2 border-primary/40"><CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold"><BadgeCheck className="w-5 h-5" />Valid certificate</div>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              {res.seeker_name && <Row k="Name" v={res.seeker_name} />}
              <Row k="Role" v={res.role_title ?? ""} />
              <Row k="Company" v={res.company_name ?? ""} />
              <Row k="Dates" v={`${fmtDate(res.start_date ?? null)} – ${fmtDate(res.end_date ?? null)}`} />
              {res.approved_minutes != null && <Row k="Employer-approved hours" v={fmtMinutes(res.approved_minutes)} />}
              <Row k="Issued" v={fmtDate(res.issued_at ?? null)} />
              <Row k="Certificate ID" v={res.code ?? ""} />
            </dl>
            {res.skills && res.skills.length > 0 && (
              <div><p className="text-xs text-muted-foreground mb-1">Employer-confirmed skills</p>
                <div className="flex flex-wrap gap-1">{res.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}</div></div>
            )}
            {!res.seeker_name && <p className="text-xs text-muted-foreground">The certificate holder has chosen not to show their name here.</p>}
          </CardContent></Card>
        )}
        {!loading && res?.status === "revoked" && (
          <Status icon={Ban} tone="text-destructive" title="This certificate has been revoked" body={`Certificate ${res.code} was revoked on ${fmtDate(res.revoked_at ?? null)} and should not be relied on.`} />
        )}
        {!loading && res?.status === "private" && (
          <Status icon={Lock} tone="text-muted-foreground" title="This certificate is private" body="The certificate exists, but its holder has turned off public verification. Ask them to share it directly." />
        )}
        {!loading && res?.status === "not_found" && (
          <Status icon={SearchX} tone="text-muted-foreground" title="No certificate found" body="Check the ID and try again. IDs look like EXP-ABCD-EFGH-JKLM." />
        )}

        <div className="flex gap-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" /><p>{CERT_DISCLAIMER}</p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Row = ({ k, v }: { k: string; v: string }) => (
  <div><dt className="text-xs text-muted-foreground">{k}</dt><dd className="text-foreground font-medium">{v}</dd></div>
);
const Status = ({ icon: Icon, tone, title, body }: { icon: typeof Ban; tone: string; title: string; body: string }) => (
  <Card><CardContent className="p-6 space-y-1">
    <p className={`flex items-center gap-2 font-semibold ${tone}`}><Icon className="w-5 h-5" />{title}</p>
    <p className="text-sm text-muted-foreground">{body}</p>
  </CardContent></Card>
);

export default VerifyCertificate;
