// Shared helpers for admin write edge functions.
// All functions: validate JWT → confirm admin role → schema-validate → log → act.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const getServiceClient = (): SupabaseClient =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

export const getClientIp = (req: Request): string =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

export interface AuditEntry {
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  listing_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  success: boolean;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const audit = async (svc: SupabaseClient, entry: AuditEntry) => {
  try {
    await svc.from("admin_audit_log").insert(entry);
  } catch (e) {
    console.error("audit log failed", e);
  }
};

// Verify Bearer JWT → return user. Returns null if invalid.
export const requireAdmin = async (
  req: Request,
  svc: SupabaseClient,
): Promise<{ id: string; email: string } | null> => {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data: userRes, error: userErr } = await svc.auth.getUser(token);
  if (userErr || !userRes.user) return null;

  const { data: roles } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id);
  const isAdmin = roles?.some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) return null;

  return { id: userRes.user.id, email: userRes.user.email ?? "" };
};

// ---------- Sanitization (server-side, defense-in-depth) ----------

export const sanitizeText = (input: unknown, maxLen = 4000): string => {
  if (typeof input !== "string") return "";
  let s = input;
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = s.replace(/<\s*(script|iframe|style|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  s = s.replace(/\b(javascript|vbscript|data)\s*:/gi, "");
  s = s.replace(/\bon[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
};

export const sanitizeShort = (input: unknown, maxLen = 200): string =>
  sanitizeText(input, maxLen);

// ---------- Allowed enums ----------
export const STRUCTURE_CATEGORIES = ["Fully Detached", "Semi-detached", "Terrace"] as const;
export const BUILDING_CATEGORIES = ["Duplex", "Bungalow", "Apartment / Block of Flat"] as const;
export const PURCHASE_NATURES = ["Rent", "Purchase", "Mortgage"] as const;

// ---------- Listing payload schema (strict) ----------
const ALLOWED_LISTING_KEYS = new Set([
  "name", "state", "city", "lga", "estate_name", "area_of_land", "price",
  "structure_category", "building_category", "nature_of_purchase", "comment",
]);

export interface ListingPayload {
  name: string;
  state: string;
  city: string;
  lga: string;
  estate_name: string | null;
  area_of_land: string | null;
  price: number;
  structure_category: string;
  building_category: string;
  nature_of_purchase: string;
  comment: string | null;
}

export const validateListingPayload = (
  raw: unknown,
): { ok: true; data: ListingPayload } | { ok: false; error: string } => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Payload must be an object" };
  }
  const obj = raw as Record<string, unknown>;

  // Reject unexpected keys (strict schema)
  for (const k of Object.keys(obj)) {
    if (!ALLOWED_LISTING_KEYS.has(k)) {
      return { ok: false, error: `Unexpected field: ${k}` };
    }
  }

  const name = sanitizeShort(obj.name, 200);
  const state = sanitizeShort(obj.state, 60);
  const city = sanitizeShort(obj.city, 80);
  const lga = sanitizeShort(obj.lga, 80);
  const estate_name = obj.estate_name == null || obj.estate_name === ""
    ? null : sanitizeShort(obj.estate_name, 120);
  const area_of_land = obj.area_of_land == null || obj.area_of_land === ""
    ? null : sanitizeShort(obj.area_of_land, 60);
  const comment = obj.comment == null || obj.comment === ""
    ? null : sanitizeText(obj.comment, 4000);

  const priceRaw = obj.price;
  let price: number;
  if (typeof priceRaw === "number") price = priceRaw;
  else if (typeof priceRaw === "string") price = Number(priceRaw.replace(/[^\d.]/g, ""));
  else return { ok: false, error: "Invalid price" };
  if (!Number.isFinite(price) || price <= 0 || price > 1e15) {
    return { ok: false, error: "Invalid price" };
  }

  const structure_category = sanitizeShort(obj.structure_category, 60);
  const building_category = sanitizeShort(obj.building_category, 60);
  const nature_of_purchase = sanitizeShort(obj.nature_of_purchase, 60);

  if (!name || !state || !city || !lga) {
    return { ok: false, error: "name, state, city and lga are required" };
  }
  if (!(STRUCTURE_CATEGORIES as readonly string[]).includes(structure_category)) {
    return { ok: false, error: "Invalid structure_category" };
  }
  if (!(BUILDING_CATEGORIES as readonly string[]).includes(building_category)) {
    return { ok: false, error: "Invalid building_category" };
  }
  if (!(PURCHASE_NATURES as readonly string[]).includes(nature_of_purchase)) {
    return { ok: false, error: "Invalid nature_of_purchase" };
  }

  return {
    ok: true,
    data: {
      name, state, city, lga, estate_name, area_of_land, price,
      structure_category, building_category, nature_of_purchase, comment,
    },
  };
};

// ---------- Magic-byte file content validation ----------
// Reads the first bytes of an uploaded file and confirms it is a real
// JPEG / PNG / WebP / GIF / AVIF / MP4 / WebM / MOV. Rejects everything else.

const startsWith = (buf: Uint8Array, sig: number[], offset = 0): boolean => {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
};

export type DetectedKind = "jpg" | "png" | "webp" | "gif" | "avif" | "mp4" | "webm" | "mov" | null;

export const detectFileKind = (buf: Uint8Array): DetectedKind => {
  // Images
  if (startsWith(buf, [0xFF, 0xD8, 0xFF])) return "jpg";
  if (startsWith(buf, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return "png";
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return "gif";
  // RIFF....WEBP
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  // ftyp boxes (offset 4)
  if (startsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) {
    // brand at offset 8..12
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]);
    if (brand === "avif" || brand === "avis") return "avif";
    if (brand === "qt  ") return "mov";
    if (
      brand === "isom" || brand === "iso2" || brand === "mp41" || brand === "mp42" ||
      brand === "M4V " || brand === "M4A " || brand === "dash" || brand === "avc1"
    ) return "mp4";
  }
  // WebM / Matroska EBML header
  if (startsWith(buf, [0x1A, 0x45, 0xDF, 0xA3])) return "webm";
  return null;
};

export const isImageKind = (k: DetectedKind): boolean =>
  k === "jpg" || k === "png" || k === "webp" || k === "gif" || k === "avif";

export const isVideoKind = (k: DetectedKind): boolean =>
  k === "mp4" || k === "webm" || k === "mov";
