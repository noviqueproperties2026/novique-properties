// admin-rank-listing
// Moves a listing up or down in the global ranking. Re-numbers rank_order
// for all rows so display order stays consistent. Logs a listing event.
import {
  corsHeaders, json, getServiceClient, getClientIp, requireAdmin, audit,
} from "../_shared/admin.ts";

interface Body {
  id: string;
  direction: "up" | "down";
  positions: number;
}

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
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  if (!body || typeof body !== "object") return json({ error: "Invalid body" }, 400);
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return json({ error: "Invalid listing id" }, 400);
  if (body.direction !== "up" && body.direction !== "down") return json({ error: "Invalid direction" }, 400);
  const positions = Number(body.positions);
  if (!Number.isInteger(positions) || positions <= 0 || positions > 100000) {
    return json({ error: "Positions must be a positive integer" }, 400);
  }

  // Fetch ordered list
  const { data: rows, error: listErr } = await svc
    .from("listings")
    .select("id")
    .order("rank_order", { ascending: true });
  if (listErr || !rows) return json({ error: listErr?.message ?? "Failed to load listings" }, 500);

  const ids = rows.map((r) => r.id as string);
  const idx = ids.indexOf(body.id);
  if (idx === -1) return json({ error: "Listing not found" }, 404);

  let newIdx = body.direction === "up" ? idx - positions : idx + positions;
  if (newIdx < 0) newIdx = 0;
  if (newIdx > ids.length - 1) newIdx = ids.length - 1;

  if (newIdx === idx) {
    return json({ ok: true, unchanged: true });
  }

  // Reorder
  ids.splice(idx, 1);
  ids.splice(newIdx, 0, body.id);

  // Re-number all rows (1..N). Batch updates.
  // Use Promise.all in chunks of 50.
  const updates = ids.map((id, i) =>
    svc.from("listings").update({ rank_order: i + 1 }).eq("id", id),
  );
  const CHUNK = 50;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const res = await Promise.all(updates.slice(i, i + CHUNK));
    const firstErr = res.find((r) => r.error);
    if (firstErr?.error) {
      await audit(svc, {
        user_id: admin.id, user_email: admin.email, action: "rank",
        listing_id: body.id, success: false, ip_address: ip, user_agent: ua,
        error_message: firstErr.error.message,
      });
      return json({ error: firstErr.error.message }, 500);
    }
  }

  // Log event
  await svc.from("listing_events").insert({
    listing_id: body.id,
    event_type: "ranked",
    created_by: admin.id,
    created_by_email: admin.email,
    details: {
      direction: body.direction,
      positions,
      from_index: idx,
      to_index: newIdx,
      new_rank: newIdx + 1,
    },
  });

  await audit(svc, {
    user_id: admin.id, user_email: admin.email, action: "rank",
    listing_id: body.id, success: true, ip_address: ip, user_agent: ua,
    metadata: { direction: body.direction, positions, from_index: idx, to_index: newIdx },
  });

  return json({ ok: true, from: idx, to: newIdx });
});
