// admin-delete-listing
// Deletes a listing and its associated media files.
import {
  corsHeaders, json, getServiceClient, getClientIp, requireAdmin, audit,
} from "../_shared/admin.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pathFromPublicUrl = (url: string, bucket: string): string | null => {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try { return decodeURIComponent(url.slice(idx + marker.length)); } catch { return null; }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const svc = getServiceClient();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  const admin = await requireAdmin(req, svc);
  if (!admin) {
    await audit(svc, { action: "auth_denied", success: false, ip_address: ip, user_agent: ua });
    return json({ error: "Unauthorized" }, 401);
  }

  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Strict shape
  for (const k of Object.keys(body as Record<string, unknown>)) {
    if (k !== "id") return json({ error: `Unexpected field: ${k}` }, 400);
  }
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) {
    return json({ error: "Invalid listing id" }, 400);
  }
  const id = body.id;

  // Fetch media before delete (so we can clean storage)
  const { data: existing } = await svc
    .from("listings").select("image_urls, video_url").eq("id", id).maybeSingle();

  const { error: delErr } = await svc.from("listings").delete().eq("id", id);
  if (delErr) {
    await audit(svc, {
      user_id: admin.id, user_email: admin.email, action: "delete",
      listing_id: id, success: false, ip_address: ip, user_agent: ua, error_message: delErr.message,
    });
    return json({ error: delErr.message }, 500);
  }

  if (existing) {
    const imgPaths = (existing.image_urls ?? [])
      .map((u: string) => pathFromPublicUrl(u, "listing-images"))
      .filter((p: string | null): p is string => !!p);
    if (imgPaths.length) await svc.storage.from("listing-images").remove(imgPaths);
    if (existing.video_url) {
      const p = pathFromPublicUrl(existing.video_url, "listing-videos");
      if (p) await svc.storage.from("listing-videos").remove([p]);
    }
  }

  await audit(svc, {
    user_id: admin.id, user_email: admin.email, action: "delete",
    listing_id: id, success: true, ip_address: ip, user_agent: ua,
  });

  return json({ ok: true });
});
