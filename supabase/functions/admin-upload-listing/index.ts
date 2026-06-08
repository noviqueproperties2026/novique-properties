// admin-upload-listing
// Creates a new listing. All inputs validated server-side.
// Files are uploaded as base64 in JSON body, content-validated by magic bytes,
// renamed to a UUID, then written to storage via service role.
import {
  corsHeaders, json, getServiceClient, getClientIp, requireAdmin, audit,
  validateListingPayload, detectFileKind, isImageKind, isVideoKind,
} from "../_shared/admin.ts";

const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;        // 5MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;      // 200MB

interface UploadFile { name: string; type: string; data: string }  // data = base64
interface Body { listing: unknown; images: UploadFile[]; video: UploadFile | null }

const decodeBase64 = (b64: string): Uint8Array => {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const svc = getServiceClient();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  const admin = await requireAdmin(req, svc);
  if (!admin) {
    await audit(svc, { action: "auth_denied", success: false, ip_address: ip, user_agent: ua, error_message: "Not an admin" });
    return json({ error: "Unauthorized" }, 401);
  }

  let body: Body;
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== "object") throw new Error("Invalid body");
    body = raw as Body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Strict body shape check
  const allowed = new Set(["listing", "images", "video"]);
  for (const k of Object.keys(body as Record<string, unknown>)) {
    if (!allowed.has(k)) return json({ error: `Unexpected field: ${k}` }, 400);
  }

  const validated = validateListingPayload(body.listing);
  if (!validated.ok) {
    await audit(svc, {
      user_id: admin.id, user_email: admin.email, action: "upload",
      success: false, ip_address: ip, user_agent: ua, error_message: validated.error,
    });
    return json({ error: validated.error }, 400);
  }

  if (!Array.isArray(body.images) || body.images.length === 0) {
    return json({ error: "At least one image required" }, 400);
  }
  if (body.images.length > MAX_IMAGES) {
    return json({ error: `Maximum ${MAX_IMAGES} images` }, 400);
  }

  // ----- Upload images with magic-byte validation -----
  const imageUrls: string[] = [];
  for (const f of body.images) {
    if (!f || typeof f.data !== "string") return json({ error: "Bad image entry" }, 400);
    const bytes = decodeBase64(f.data);
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
      return json({ error: "Image exceeds size limit" }, 400);
    }
    const kind = detectFileKind(bytes);
    if (!isImageKind(kind)) {
      await audit(svc, {
        user_id: admin.id, user_email: admin.email, action: "upload",
        success: false, ip_address: ip, user_agent: ua,
        error_message: "Image content rejected by magic-byte check",
      });
      return json({ error: "One or more files are not valid images" }, 400);
    }
    const ext = kind === "jpg" ? "jpg" : kind!;
    const path = `${admin.id}/${crypto.randomUUID()}.${ext}`;
    const contentType = kind === "jpg" ? "image/jpeg" : `image/${kind}`;
    const { error: upErr } = await svc.storage.from("listing-images").upload(path, bytes, { contentType, upsert: false });
    if (upErr) return json({ error: `Image upload failed: ${upErr.message}` }, 500);
    const { data: pub } = svc.storage.from("listing-images").getPublicUrl(path);
    imageUrls.push(pub.publicUrl);
  }

  // ----- Optional video -----
  let videoUrl: string | null = null;
  if (body.video) {
    const v = body.video;
    if (typeof v.data !== "string") return json({ error: "Bad video entry" }, 400);
    const bytes = decodeBase64(v.data);
    if (bytes.length === 0 || bytes.length > MAX_VIDEO_BYTES) {
      return json({ error: "Video exceeds size limit" }, 400);
    }
    const kind = detectFileKind(bytes);
    if (!isVideoKind(kind)) {
      await audit(svc, {
        user_id: admin.id, user_email: admin.email, action: "upload",
        success: false, ip_address: ip, user_agent: ua,
        error_message: "Video content rejected by magic-byte check",
      });
      return json({ error: "Video file is not a valid video" }, 400);
    }
    const ext = kind === "mp4" ? "mp4" : kind === "mov" ? "mov" : "webm";
    const contentType = kind === "mov" ? "video/quicktime" : `video/${ext}`;
    const path = `${admin.id}/${crypto.randomUUID()}.${ext}`;
    const { error: vErr } = await svc.storage.from("listing-videos").upload(path, bytes, { contentType, upsert: false });
    if (vErr) return json({ error: `Video upload failed: ${vErr.message}` }, 500);
    const { data: pub } = svc.storage.from("listing-videos").getPublicUrl(path);
    videoUrl = pub.publicUrl;
  }

  const listing = validated.data;
  const { data: inserted, error: insErr } = await svc.from("listings").insert({
    ...listing,
    image_urls: imageUrls,
    video_url: videoUrl,
    created_by: admin.id,
  }).select("id").single();

  if (insErr) {
    await audit(svc, {
      user_id: admin.id, user_email: admin.email, action: "upload",
      success: false, ip_address: ip, user_agent: ua, error_message: insErr.message,
    });
    return json({ error: insErr.message }, 500);
  }

  // Log lifecycle event
  await svc.from("listing_events").insert({
    listing_id: inserted.id,
    event_type: "uploaded",
    created_by: admin.id,
    created_by_email: admin.email,
    details: { image_count: imageUrls.length, has_video: !!videoUrl },
  });

  await audit(svc, {
    user_id: admin.id, user_email: admin.email, action: "upload",
    listing_id: inserted.id, success: true, ip_address: ip, user_agent: ua,
    metadata: { image_count: imageUrls.length, has_video: !!videoUrl },
  });

  return json({ ok: true, id: inserted.id });
});
