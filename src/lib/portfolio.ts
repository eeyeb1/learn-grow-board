import { supabase } from "@/integrations/supabase/client";

export const PORTFOLIO_MAX_BYTES = 10 * 1024 * 1024;
export const PORTFOLIO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const REMOVAL_REASONS = [
  { value: "confidential", label: "Contains confidential company information" },
  { value: "unauthorised", label: "Shared without the company's permission" },
  { value: "personal_data", label: "Contains other people's personal data" },
  { value: "inaccurate", label: "Misrepresents the work or the company" },
  { value: "other", label: "Something else" },
] as const;
export const reasonLabel = (v: string) => REMOVAL_REASONS.find((r) => r.value === v)?.label ?? v;

export interface PortfolioItem {
  id: string;
  user_id: string;
  placement_id: string | null;
  title: string;
  description: string | null;
  task_summary: string | null;
  outcomes: string | null;
  skills: string[];
  start_date: string | null;
  end_date: string | null;
  link_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  is_public: boolean;
  permission_confirmed: boolean;
  status: "active" | "removal_requested" | "removed";
  created_at: string;
}

export interface RemovalRequest {
  id: string;
  item_id: string | null;
  item_title: string;
  owner_id: string;
  placement_id: string | null;
  requester_id: string;
  reason: string;
  details: string | null;
  status: "open" | "upheld" | "dismissed" | "item_deleted";
  resolution_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface PublicPortfolioItem {
  id: string;
  title: string;
  description: string | null;
  task_summary: string | null;
  outcomes: string | null;
  skills: string[];
  start: string | null;
  end: string | null;
  link_url: string | null;
  file_kind: "image" | "pdf" | null;
  company: string | null;
  role_title: string | null;
}

/** Checks the file's real content (magic bytes), not just its name or reported type. */
export async function validatePortfolioFile(file: File): Promise<string | null> {
  if (!PORTFOLIO_TYPES[file.type]) return "Only JPG, PNG, WebP images or PDF files are allowed";
  if (file.size > PORTFOLIO_MAX_BYTES) return "Files must be 10 MB or smaller";
  if (file.size === 0) return "This file is empty";
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const real =
    b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "image/jpeg"
    : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? "image/png"
    : b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 ? "image/webp"
    : b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 ? "application/pdf"
    : null;
  if (real !== file.type) return "This file's contents don't match its type. Please re-save it and try again.";
  return null;
}

const cache = new Map<string, Promise<string | null>>();

/** Fetches a file through the checked server function and returns a local object URL — the storage path is never exposed. */
export function loadPortfolioFile(itemId: string, version = ""): Promise<string | null> {
  const key = itemId + version;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const { data } = await supabase.auth.getSession();
      const headers: Record<string, string> = { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY };
      if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-file?id=${itemId}`, { headers });
      if (!res.ok) { cache.delete(key); return null; }
      return URL.createObjectURL(await res.blob());
    })());
  }
  return cache.get(key)!;
}
