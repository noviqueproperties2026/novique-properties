// admin-update-listing
// Updates an existing listing. Supports adding new images, removing existing
// images, and replacing the video. Removed media is deleted from storage.
import {
  corsHeaders, json, getServiceClient, getClientIp, requireAdmin, audit,
  validateListingPayload, detectFileKind, isImageKind, isVideoKind,
} from "../_shared/admin.ts";

const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

interface UploadFile { name: string; type: string; data: string }
interface Body {
  id: string;
  listing: unknown;
  keep_image_urls: string[];
  new_images: UploadFile[];
  keep_video_url: string | null;
  new_video: UploadFile | null;
}

const decodeBase64 = (b64: string): Uint8Array => {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const pathFromPublicUrl = (url: string, bucket: string): string | null => {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try { return decodeURIComponent(url.slice(idx + marker.length)); } catch { return null; }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let body: Body;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== "object") throw new Error();
    body = raw as Body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const allowed = new Set(["id", "listing", "keep_image_urls", "new_images", "keep_video_url", "new_video"]);
  for (const k of Object.keys(body as Record<string, unknown>)) {
    if (!allowed.has(k)) return json({ error: `Unexpected field: ${k}` }, 400);
  }

  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) {
    return json({ error: "Invalid listing id" }, 400);
  }
  if (!Array.isArray(body.keep_image_urls) || !Array.isArray(body.new_images)) {
    return json({ error: "Invalid image arrays" }, 400);
  }

  const validated = validateListingPayload(body.listing);
  if (!validated.ok) {
    await audit(svc, {
      user_id: admin.id, user_email: admin.email, action: "update",
      listing_id: body.id, success: false, ip_address: ip, user_agent: ua,
      error_message: validated.error,
    });
    return json({ error: validated.error }, 400);
  }

  // Fetch existing record (for media diff + cleanup)
  const { data: existing, error: fetchErr } = await svc
    .from("listings").select("image_urls, video_url").eq("id", body.id).maybeSingle();
  if (fetchErr || !existing) return json({ error: "Listing not found" }, 404);

  if (body.keep_image_urls.length + body.new_images.length === 0) {
    return json({ error: "At least one image required" }, 400);
  }
  if (body.keep_image_urls.length + body.new_images.length > MAX_IMAGES) {
    return json({ error: `Maximum ${MAX_IMAGES} images` }, 400);
  }

  // Validate that keep_image_urls are actually a subset of existing
  const originalImages: string[] = existing.image_urls ?? [];
  for (const u of body.keep_image_urls) {
    if (typeof u !== "string" || !originalImages.includes(u)) {
      return json({ error: "Invalid kept image url" }, 400);
    }
  }

  // ----- Upload new images -----
  const newImageUrls: string[] = [];
  for (const f of body.new_images) {
    if (!f || typeof f.data !== "string") return json({ error: "Bad image entry" }, 400);
    const bytes = decodeBase64(f.data);
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
      return json({ error: "Image exceeds size limit" }, 400);
    }
    const kind = detectFileKind(bytes);
    if (!isImageKind(kind)) {
      await audit(svc, {
        user_id: admin.id, user_email: admin.email, action: "update",
        listing_id: body.id, success: false, ip_address: ip, user_agent: ua,
        error_message: "Image content rejected by magic-byte check",
      });
      return json({ error: "One or more files are not valid images" }, 400);
    }
    const ext = kind === "jpg" ? "jpg" : kind!;
    const contentType = kind === "jpg" ? "image/jpeg" : `image/${kind}`;
    const path = `${admin.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await svc.storage.from("listing-images").upload(path, bytes, { contentType });
    if (upErr) return json({ error: `Image upload failed: ${upErr.message}` }, 500);
    const { data: pub } = svc.storage.from("listing-images").getPublicUrl(path);
    newImageUrls.push(pub.publicUrl);
  }
  const finalImageUrls = [...body.keep_image_urls, ...newImageUrls];

  // ----- Video handling -----
  let finalVideoUrl: string | null = body.keep_video_url ?? null;
  if (body.new_video) {
    const v = body.new_video;
    const bytes = decodeBase64(v.data);
    if (bytes.length === 0 || bytes.length > MAX_VIDEO_BYTES) {
      return json({ error: "Video exceeds size limit" }, 400);
    }
    const kind = detectFileKind(bytes);
    if (!isVideoKind(kind)) {
      return json({ error: "Video file is not a valid video" }, 400);
    }
    const ext = kind === "mp4" ? "mp4" : kind === "mov" ? "mov" : "webm";
    const contentType = kind === "mov" ? "video/quicktime" : `video/${ext}`;
    const path = `${admin.id}/${crypto.randomUUID()}.${ext}`;
    const { error: vErr } = await svc.storage.from("listing-videos").upload(path, bytes, { contentType });
    if (vErr) return json({ error: `Video upload failed: ${vErr.message}` }, 500);
    const { data: pub } = svc.storage.from("listing-videos").getPublicUrl(path);
    finalVideoUrl = pub.publicUrl;
  }

  // ----- Update row -----
  const listing = validated.data;
  const { error: updErr } = await svc.from("listings").update({
    ...listing,
    image_urls: finalImageUrls,
    video_url: finalVideoUrl,
  }).eq("id", body.id);
  if (updErr) {
    await audit(svc, {
      user_id: admin.id, user_email: admin.email, action: "update",
      listing_id: body.id, success: false, ip_address: ip, user_agent: ua,
      error_message: updErr.message,
    });
    return json({ error: updErr.message }, 500);
  }

  // ----- Cleanup orphaned files -----
  const removedImages = originalImages.filter((u) => !body.keep_image_urls.includes(u));
  if (removedImages.length) {
    const paths = removedImages.map((u) => pathFromPublicUrl(u, "listing-images")).filter((p): p is string => !!p);
    if (paths.length) await svc.storage.from("listing-images").remove(paths);
  }
  if (existing.video_url && existing.video_url !== finalVideoUrl) {
    const p = pathFromPublicUrl(existing.video_url, "listing-videos");
    if (p) await svc.storage.from("listing-videos").remove([p]);
  }

  await audit(svc, {
    user_id: admin.id, user_email: admin.email, action: "update",
    listing_id: body.id, success: true, ip_address: ip, user_agent: ua,
    metadata: { kept: body.keep_image_urls.length, added: newImageUrls.length, removed: removedImages.length },
  });

  return json({ ok: true });
});
