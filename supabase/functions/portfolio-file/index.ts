// Serves portfolio files without ever exposing the private storage path.
// Public callers only get files from explicitly published items on published profiles.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const sniff = (b: Uint8Array): string | null => {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  return null;
};

const deny = (status: number, msg: string) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return deny(400, "Invalid id");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: item } = await admin.from("portfolio_items")
    .select("id, user_id, placement_id, file_path, file_mime, is_public, status").eq("id", id).maybeSingle();
  if (!item?.file_path) return deny(404, "Not found");

  let allowed = false;
  if (item.is_public && item.status === "active") {
    const { data: prof } = await admin.from("public_profiles").select("is_public, show_portfolio").eq("user_id", item.user_id).maybeSingle();
    allowed = !!prof?.is_public && !!prof?.show_portfolio;
  }
  if (!allowed) {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data: u } = await admin.auth.getUser(token);
      const uid = u?.user?.id;
      if (uid) {
        if (uid === item.user_id) allowed = true;
        else {
          const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
          allowed = !!isAdmin;
          if (!allowed && item.placement_id) {
            const { data: mg } = await admin.rpc("can_manage_placement", { _placement_id: item.placement_id, _uid: uid });
            allowed = !!mg;
          }
        }
      }
    }
  }
  if (!allowed) return deny(404, "Not found");

  const { data: blob, error } = await admin.storage.from("portfolio").download(item.file_path);
  if (error || !blob) return deny(404, "Not found");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const real = sniff(bytes);
  if (!real || real !== item.file_mime) return deny(415, "File failed validation");

  return new Response(bytes, {
    headers: {
      ...cors,
      "Content-Type": real,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "Cache-Control": "private, max-age=300",
    },
  });
});
