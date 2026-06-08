import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { sanitizeEmail } from "@/lib/sanitize";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Admin Login — Novique Properties";
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await supabase
          .from("user_roles").select("role").eq("user_id", user.id);
        if (roles?.some((r) => r.role === "admin")) {
          navigate("/upload", { replace: true });
        }
      }
    })();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeEmail(email);
    if (!clean || !password) {
      toast.error("Enter a valid email and password");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: clean, password,
      });
      if (error || !data.user) {
        toast.error("Invalid credentials");
        setBusy(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", data.user.id);
      if (!roles?.some((r) => r.role === "admin")) {
        toast.error("Not an admin account");
        await supabase.auth.signOut();
        setBusy(false);
        return;
      }
      toast.success("Welcome back");
      navigate("/upload", { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  };

  // generate fixed particles
  const particles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 12,
    size: 3 + Math.random() * 6,
  }));

  return (
    <div className="relative min-h-screen overflow-hidden bg-secondary flex items-center justify-center p-4">
      {/* gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary to-primary/30" />

      {/* particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full bg-primary-glow/40 animate-float"
            style={{
              left: `${p.left}%`,
              bottom: `-20px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* card */}
      <form
        onSubmit={submit}
        className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl p-8 md:p-10 border border-white/10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="grid place-items-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Lock size={24} />
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-secondary">
            Admin Login
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage Novique Properties
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email" autoComplete="email" maxLength={254}
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input
              type="password" autoComplete="current-password" maxLength={200}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full gradient-primary border-0 hover:opacity-90 text-base font-semibold">
            {busy ? <><Loader2 className="animate-spin mr-2" size={18} /> Signing in…</> : "Login"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Login;
