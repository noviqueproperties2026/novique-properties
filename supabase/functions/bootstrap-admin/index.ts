// Bootstraps the Novique admin user. Idempotent.
// SECURITY: The admin password is NEVER hardcoded. It is read from the
// `ADMIN_BOOTSTRAP_PASSWORD` secret. Supabase stores the password as a salted
// bcrypt hash in `auth.users` — we only set it once for initial provisioning
// and verify against that hash on every subsequent admin login.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "newtonagbonghae@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminPassword = Deno.env.get("ADMIN_BOOTSTRAP_PASSWORD");
    if (!adminPassword || adminPassword.length < 8) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "ADMIN_BOOTSTRAP_PASSWORD secret is not configured (must be ≥ 8 chars).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find existing user
    let userId: string | null = null;
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const existing = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: adminPassword,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      userId = created.user!.id;
    }

    // Ensure admin role
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (roleErr) throw roleErr;

    return new Response(
      JSON.stringify({ ok: true, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
