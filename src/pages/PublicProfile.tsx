import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatHours } from "@/hooks/useSeekerDashboard";
import { Award, CheckCircle2, UserX, AlertCircle } from "lucide-react";

interface PublicData {
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  avatar_url: string | null;
  verified_minutes: number;
  experiences: { title: string; company: string; industry: string | null; verified_minutes: number }[];
}

const PublicProfile = () => {
  const { slug = "" } = useParams();
  const [state, setState] = useState<"loading" | "error" | "missing" | "ok">("loading");
  const [data, setData] = useState<PublicData | null>(null);

  const load = async () => {
    setState("loading");
    const { data, error } = await supabase.rpc("get_public_profile", { _slug: slug });
    if (error) return setState("error");
    if (!data) return setState("missing");
    setData(data as unknown as PublicData);
    setState("ok");
  };

  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        {state === "loading" && <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-48" /></div>}
        {state === "error" && (
          <Card><CardContent className="py-12 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-foreground">We couldn't load this profile.</p>
            <Button variant="outline" className="mt-4" onClick={load}>Try again</Button>
          </CardContent></Card>
        )}
        {state === "missing" && (
          <Card><CardContent className="py-12 text-center">
            <UserX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium text-foreground">Profile not found</p>
            <p className="text-sm text-muted-foreground mt-1">This profile doesn't exist or isn't public.</p>
            <Link to="/"><Button className="mt-4" variant="outline">Go home</Button></Link>
          </CardContent></Card>
        )}
        {state === "ok" && data && (
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
                <div className="flex-1">
                  <h1 className="font-display text-2xl font-bold text-foreground">{data.display_name || "Experience seeker"}</h1>
                  {data.headline && <p className="text-muted-foreground">{data.headline}</p>}
                  <div className="inline-flex items-center gap-2 mt-3 rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> {formatHours(data.verified_minutes)} verified by employers
                  </div>
                  {data.bio && <p className="text-foreground mt-4 whitespace-pre-line">{data.bio}</p>}
                </div>
              </CardContent>
            </Card>

            {data.skills.length > 0 && (
              <Card><CardContent className="p-6">
                <h2 className="font-semibold text-foreground mb-3">Skills</h2>
                <div className="flex flex-wrap gap-2">{data.skills.map((s) => <Badge key={s} variant="soft">{s}</Badge>)}</div>
              </CardContent></Card>
            )}

            <Card><CardContent className="p-6">
              <h2 className="font-semibold text-foreground mb-3">Completed experiences</h2>
              {data.experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No completed experiences yet.</p>
              ) : data.experiences.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Award className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.company}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">{formatHours(e.verified_minutes)} verified</span>
                </div>
              ))}
            </CardContent></Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PublicProfile;
