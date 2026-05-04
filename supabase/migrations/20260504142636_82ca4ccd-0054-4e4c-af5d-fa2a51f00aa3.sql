
-- 1) Audit log for admin write actions
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,           -- 'upload' | 'update' | 'delete' | 'login_failed' | 'auth_denied'
  listing_id uuid,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log; nobody can write from client (writes go through service role)
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log (action);
CREATE INDEX idx_admin_audit_log_user ON public.admin_audit_log (user_id);

-- 2) Tighten listings RLS: remove client-side admin write paths.
-- All writes (insert/update/delete) must now go through edge functions
-- using the service role (which bypasses RLS).
DROP POLICY IF EXISTS "Admins can insert listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can update listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can delete listings" ON public.listings;

-- Public read remains. No client can write — service role only.
-- (We deliberately do NOT create permissive write policies here.)
