import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  NIGERIA_LOCATIONS, NIGERIA_STATES,
  STRUCTURE_CATEGORIES, BUILDING_CATEGORIES,
} from "@/data/nigeria-locations";
import { formatNaira, type Listing } from "@/types/listing";
import { Loader2, Search, Trash2, ChevronLeft } from "lucide-react";

const PAGE = 20;
const ANY = "any";

interface Filters {
  q: string; state: string; city: string; lga: string;
  structure: string; building: string;
  area: string; priceMax: number;
}

const empty: Filters = {
  q: "", state: ANY, city: ANY, lga: ANY,
  structure: ANY, building: ANY, area: "", priceMax: 1_000_000_000,
};

const matches = (l: Listing, f: Filters) => {
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = `${l.name} ${l.estate_name ?? ""} ${l.comment ?? ""} ${l.city} ${l.lga} ${l.state}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.state !== ANY && l.state.toLowerCase() !== f.state.toLowerCase()) return false;
  if (f.city !== ANY && l.city.toLowerCase() !== f.city.toLowerCase()) return false;
  if (f.lga !== ANY && l.lga.toLowerCase() !== f.lga.toLowerCase()) return false;
  if (f.structure !== ANY && l.structure_category !== f.structure) return false;
  if (f.building !== ANY && l.building_category !== f.building) return false;
  if (f.area.trim() && !(l.area_of_land ?? "").toLowerCase().includes(f.area.trim().toLowerCase())) return false;
  if (l.price > f.priceMax) return false;
  return true;
};

const DeleteListings = () => {
  useEffect(() => { document.title = "Delete Listings — Novique Properties"; }, []);

  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(empty);
  const [count, setCount] = useState(PAGE);
  const [target, setTarget] = useState<Listing | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings").select("*").order("created_at", { ascending: false });
    if (!error && data) setAll(data as Listing[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const cities = useMemo(
    () => (filters.state !== ANY ? Object.keys(NIGERIA_LOCATIONS[filters.state] ?? {}) : []),
    [filters.state],
  );
  const lgas = useMemo(
    () => (filters.state !== ANY && filters.city !== ANY ? NIGERIA_LOCATIONS[filters.state]?.[filters.city] ?? [] : []),
    [filters.state, filters.city],
  );

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((p) => {
      const n = { ...p, [k]: v };
      if (k === "state") { n.city = ANY; n.lga = ANY; }
      if (k === "city") n.lga = ANY;
      return n;
    });

  const filtered = useMemo(() => all.filter((l) => matches(l, filters)), [all, filters]);
  const visible = filtered.slice(0, count);

  const onApplySearch = () => setCount(PAGE);

  const performDelete = async () => {
    if (!target) return;
    if (!email.trim() || !password) {
      toast.error("Provide both email and password");
      return;
    }
    setDeleting(true);
    try {
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (signErr || !signIn.user) {
        toast.error("Incorrect security details provided");
        setDeleting(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", signIn.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("Incorrect security details provided");
        setDeleting(false);
        return;
      }

      const { error: delErr } = await supabase
        .from("listings").delete().eq("id", target.id);
      if (delErr) throw delErr;

      await supabase.auth.signOut();
      toast.success("Listing deleted");
      setTarget(null);
      setEmail(""); setPassword("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="container py-12 max-w-6xl">
        <Link to="/upload" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth">
          <ChevronLeft size={16} /> Back to Upload
        </Link>

        <div className="mt-4 mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Admin only</span>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-secondary">Delete listings</h1>
          <p className="mt-2 text-muted-foreground">Search and remove existing properties. Admin credentials required.</p>
        </div>

        {/* Search */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 md:p-6 shadow-card mb-8">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-5 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, estate, keyword..."
                value={filters.q}
                onChange={(e) => set("q", e.target.value)}
                className="pl-9 h-11"
              />
            </div>

            <Select value={filters.state} onValueChange={(v) => set("state", v)}>
              <SelectTrigger className="md:col-span-3 h-11"><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All states</SelectItem>
                {NIGERIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.city} onValueChange={(v) => set("city", v)} disabled={filters.state === ANY}>
              <SelectTrigger className="md:col-span-2 h-11"><SelectValue placeholder="City" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All cities</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.lga} onValueChange={(v) => set("lga", v)} disabled={filters.city === ANY}>
              <SelectTrigger className="md:col-span-2 h-11"><SelectValue placeholder="LGA / Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All LGAs</SelectItem>
                {lgas.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.structure} onValueChange={(v) => set("structure", v)}>
              <SelectTrigger className="md:col-span-3 h-11"><SelectValue placeholder="Structure" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any structure</SelectItem>
                {STRUCTURE_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.building} onValueChange={(v) => set("building", v)}>
              <SelectTrigger className="md:col-span-3 h-11"><SelectValue placeholder="Building" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any building</SelectItem>
                {BUILDING_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input
              placeholder="Land area (e.g. 600 sqm)"
              value={filters.area}
              onChange={(e) => set("area", e.target.value)}
              className="md:col-span-3 h-11"
            />

            <div className="md:col-span-3 flex flex-col justify-center px-1">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
                <span>Max price</span>
                <span className="text-secondary font-semibold">₦{filters.priceMax.toLocaleString()}</span>
              </div>
              <Slider
                value={[filters.priceMax]}
                onValueChange={(v) => set("priceMax", v[0])}
                min={1_000_000} max={1_000_000_000} step={1_000_000}
              />
            </div>

            <div className="md:col-span-12 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setFilters(empty); setCount(PAGE); }}>Reset</Button>
              <Button onClick={onApplySearch} className="gradient-primary border-0 hover:opacity-90"><Search size={16} className="mr-2" /> Apply</Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-secondary">
                <tr>
                  <Th>Name</Th>
                  <Th>State</Th>
                  <Th>Building</Th>
                  <Th>Area of land</Th>
                  <Th>Price</Th>
                  <Th className="text-right pr-6">Action</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-16 text-center text-muted-foreground"><Loader2 className="inline animate-spin" /></td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">No listings match your filters.</td></tr>
                ) : (
                  visible.map((l) => (
                    <tr key={l.id} className="border-t border-border/60 hover:bg-muted/30 transition-smooth">
                      <Td><div className="font-semibold text-secondary line-clamp-1">{l.name}</div><div className="text-xs text-muted-foreground">{l.lga}, {l.city}</div></Td>
                      <Td>{l.state}</Td>
                      <Td>{l.building_category}</Td>
                      <Td>{l.area_of_land || "—"}</Td>
                      <Td className="font-bold text-primary">{formatNaira(l.price)}</Td>
                      <Td className="text-right pr-6">
                        <Button
                          size="sm" variant="destructive"
                          onClick={() => setTarget(l)}
                        >
                          <Trash2 size={14} className="mr-1" /> Delete
                        </Button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && count < filtered.length && (
            <div className="p-5 border-t border-border/60 text-center">
              <Button variant="outline" onClick={() => setCount((c) => c + PAGE)}>
                See more ({filtered.length - count} remaining)
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Showing {visible.length} of {filtered.length} matching listing{filtered.length === 1 ? "" : "s"}.
        </p>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setEmail(""); setPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              You're about to permanently delete <strong className="text-secondary">{target?.name}</strong>. This action cannot be undone. Enter admin credentials to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Admin email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={performDelete} disabled={deleting}>
              {deleting ? <><Loader2 className="animate-spin mr-2" size={16} /> Deleting…</> : <>Delete listing</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 ${className}`}>{children}</th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
);

export default DeleteListings;
