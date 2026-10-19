import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import PublicProfileView, { PublicData } from "@/components/PublicProfileView";
import { UserX, AlertCircle } from "lucide-react";

const PublicProfile = () => {
  const { username = "" } = useParams();
  const [state, setState] = useState<"loading" | "error" | "missing" | "ok">("loading");
  const [data, setData] = useState<PublicData | null>(null);

  const load = async () => {
    setState("loading");
    const { data, error } = await supabase.rpc("get_public_profile", { _slug: username });
    if (error) return setState("error");
    if (!data) return setState("missing");
    setData(data as unknown as PublicData);
    setState("ok");
  };

  useEffect(() => { load(); }, [username]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep shared profiles out of search engines
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

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
            <p className="text-sm text-muted-foreground mt-1">This profile doesn't exist or isn't published.</p>
            <Link to="/"><Button className="mt-4" variant="outline">Go home</Button></Link>
          </CardContent></Card>
        )}
        {state === "ok" && data && (
          <>
            <PublicProfileView data={data} />
            <p className="text-xs text-muted-foreground text-center mt-6">
              Items marked "Employer verified" were confirmed by the employer on ExpBoard. "Self-reported" items were added by the profile owner.
            </p>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PublicProfile;
