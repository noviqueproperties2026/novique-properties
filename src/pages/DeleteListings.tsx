import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { AdminToolbar } from "@/components/AdminToolbar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  NIGERIA_STATES,
  STRUCTURE_CATEGORIES, BUILDING_CATEGORIES, PURCHASE_NATURES,
} from "@/data/nigeria-locations";
import { formatNaira, type Listing } from "@/types/listing";
import { Loader2, Search, Trash2, Pencil, X, Upload as UploadIcon, ArrowUpDown, Hash } from "lucide-react";
import {
  sanitizeShort, sanitizeText, sanitizeNumber, sanitizeEmail,
  whitelist, validateImageFile, validateVideoFile,
} from "@/lib/sanitize";
import { fileToPayload } from "@/lib/file-encode";

// Storage cleanup is now handled server-side by the edge functions.

const PAGE = 20;
const ANY = "any";
const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;
const MAX_PRICE = 50_000_000_000;

interface Filters {
  q: string; number: string; state: string; city: string; lga: string;
  structure: string; building: string;
  area: string; priceMax: number;
}

const empty: Filters = {
  q: "", number: "", state: ANY, city: "", lga: "",
  structure: ANY, building: ANY, area: "", priceMax: MAX_PRICE,
};

const matches = (l: Listing, f: Filters) => {
  const num = f.number.trim().toUpperCase();
  if (num && !l.listing_number.toUpperCase().includes(num)) return false;
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = `${l.name} ${l.estate_name ?? ""} ${l.comment ?? ""} ${l.city} ${l.lga} ${l.state} ${l.listing_number}`.toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.some((t) => hay.includes(t))) return false;
  }
  if (f.state !== ANY && l.state.toLowerCase() !== f.state.toLowerCase()) return false;
  if (f.city.trim() && !l.city.toLowerCase().includes(f.city.trim().toLowerCase())) return false;
  if (f.lga.trim() && !l.lga.toLowerCase().includes(f.lga.trim().toLowerCase())) return false;
  if (f.structure !== ANY && l.structure_category !== f.structure) return false;
  if (f.building !== ANY && l.building_category !== f.building) return false;
  if (f.area.trim() && !(l.area_of_land ?? "").toLowerCase().includes(f.area.trim().toLowerCase())) return false;
  if (l.price > f.priceMax) return false;
  return true;
};

interface EditForm {
  name: string; state: string; city: string; lga: string;
  estate_name: string; area_of_land: string; price: string;
  structure_category: string; building_category: string; nature_of_purchase: string;
  comment: string;
}

const toForm = (l: Listing): EditForm => ({
  name: l.name, state: l.state, city: l.city, lga: l.lga,
  estate_name: l.estate_name ?? "", area_of_land: l.area_of_land ?? "",
  price: String(l.price), structure_category: l.structure_category,
  building_category: l.building_category, nature_of_purchase: l.nature_of_purchase,
  comment: l.comment ?? "",
});

const DeleteListings = () => {
  useEffect(() => { document.title = "Manage Listings — Novique Properties"; }, []);

  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(empty);
  const [count, setCount] = useState(PAGE);

  // delete state
  const [target, setTarget] = useState<Listing | null>(null);
  const [delEmail, setDelEmail] = useState("");
  const [delPassword, setDelPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  // edit state
  const [editing, setEditing] = useState<Listing | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [keepImages, setKeepImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [keepVideo, setKeepVideo] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState<File | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  // rank state
  const [ranking, setRanking] = useState<Listing | null>(null);
  const [rankDirection, setRankDirection] = useState<"up" | "down">("up");
  const [rankPositions, setRankPositions] = useState("");
  const [rankEmail, setRankEmail] = useState("");
  const [rankPassword, setRankPassword] = useState("");
  const [rankBusy, setRankBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings").select("*").order("rank_order", { ascending: true });
    if (!error && data) setAll(data as Listing[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((p) => ({ ...p, [k]: v }));

  const filtered = useMemo(() => all.filter((l) => matches(l, filters)), [all, filters]);
  const visible = filtered.slice(0, count);

  const onApplySearch = () => setCount(PAGE);

  const performDelete = async () => {
    if (!target) return;
    const cleanEmail = sanitizeEmail(delEmail);
    if (!cleanEmail || !delPassword) {
      toast.error("Provide a valid email and password");
      return;
    }
    setDeleting(true);
    try {
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail, password: delPassword,
      });
      if (signErr || !signIn.user || !signIn.session) {
        toast.error("Incorrect security details provided");
        setDeleting(false);
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke("admin-delete-listing", {
        body: { id: target.id },
      });

      if (fnErr || (data && (data as { error?: string }).error)) {
        const msg = (data as { error?: string } | null)?.error || fnErr?.message || "Delete failed";
        toast.error(msg);
        await supabase.auth.signOut();
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      toast.success("Listing and associated files deleted");
      setTarget(null);
      setDelEmail(""); setDelPassword("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (l: Listing) => {
    setEditing(l);
    setForm(toForm(l));
    setKeepImages([...(l.image_urls ?? [])]);
    setNewImages([]);
    setKeepVideo(l.video_url);
    setNewVideo(null);
    setEditEmail(""); setEditPassword("");
  };

  const closeEdit = () => {
    setEditing(null); setForm(null);
    setKeepImages([]); setNewImages([]);
    setKeepVideo(null); setNewVideo(null);
    setEditEmail(""); setEditPassword("");
  };

  const setF = (k: keyof EditForm, v: string) =>
    setForm((p) => (p ? { ...p, [k]: v } : p));

  const onAddImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    for (const f of arr) {
      const err = validateImageFile(f, MAX_IMAGE_BYTES);
      if (err) { toast.error(err); return; }
    }
    if (keepImages.length + newImages.length + arr.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images total`);
      return;
    }
    setNewImages((p) => [...p, ...arr]);
  };

  const onPickVideo = (file: File | null) => {
    if (!file) { setNewVideo(null); return; }
    const verr = validateVideoFile(file);
    if (verr) { toast.error(verr); return; }
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.src = url;
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (el.duration > MAX_VIDEO_SECONDS) {
        toast.error("Video must be under 2 minutes");
        return;
      }
      setNewVideo(file);
      setKeepVideo(null);
    };
  };

  const performUpdate = async () => {
    if (!editing || !form) return;

    // Sanitize all text inputs
    const safe = {
      name: sanitizeShort(form.name, 200),
      state: whitelist(form.state, NIGERIA_STATES, "") || sanitizeShort(form.state, 60),
      city: sanitizeShort(form.city, 80),
      lga: sanitizeShort(form.lga, 80),
      estate_name: sanitizeShort(form.estate_name, 120),
      area_of_land: sanitizeShort(form.area_of_land, 60),
      structure_category: whitelist(form.structure_category, STRUCTURE_CATEGORIES, "") || sanitizeShort(form.structure_category, 60),
      building_category: whitelist(form.building_category, BUILDING_CATEGORIES, "") || sanitizeShort(form.building_category, 60),
      nature_of_purchase: whitelist(form.nature_of_purchase, PURCHASE_NATURES, "") || sanitizeShort(form.nature_of_purchase, 60),
      comment: sanitizeText(form.comment, 4000),
      price: sanitizeNumber(form.price, 1e15),
    };
    const cleanEmail = sanitizeEmail(editEmail);

    if (!safe.name || !safe.state || !safe.city || !safe.lga) {
      toast.error("Name, state, city and LGA are required");
      return;
    }
    if (!Number.isFinite(safe.price) || safe.price <= 0) {
      toast.error("Invalid price"); return;
    }
    if (!cleanEmail || !editPassword) {
      toast.error("Provide a valid admin email and password");
      return;
    }
    if (keepImages.length + newImages.length === 0) {
      toast.error("At least one image is required");
      return;
    }
    if (keepImages.length + newImages.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images total`);
      return;
    }

    setUpdating(true);
    try {
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail, password: editPassword,
      });
      if (signErr || !signIn.user || !signIn.session) {
        toast.error("Incorrect security details provided");
        setUpdating(false);
        return;
      }

      // Encode new media to base64
      const newImagesPayload = await Promise.all(newImages.map(fileToPayload));
      const newVideoPayload = newVideo ? await fileToPayload(newVideo) : null;

      const { data, error: fnErr } = await supabase.functions.invoke("admin-update-listing", {
        body: {
          id: editing.id,
          listing: {
            name: safe.name,
            state: safe.state,
            city: safe.city,
            lga: safe.lga,
            estate_name: safe.estate_name || null,
            area_of_land: safe.area_of_land || null,
            price: safe.price,
            structure_category: safe.structure_category,
            building_category: safe.building_category,
            nature_of_purchase: safe.nature_of_purchase,
            comment: safe.comment || null,
          },
          keep_image_urls: keepImages,
          new_images: newImagesPayload,
          keep_video_url: keepVideo,
          new_video: newVideoPayload,
        },
      });

      if (fnErr || (data && (data as { error?: string }).error)) {
        const msg = (data as { error?: string } | null)?.error || fnErr?.message || "Update failed";
        toast.error(msg);
        await supabase.auth.signOut();
        setUpdating(false);
        return;
      }

      await supabase.auth.signOut();
      toast.success("Listing updated");
      closeEdit();
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(false);
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
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-secondary">Manage listings</h1>
          <p className="mt-2 text-muted-foreground">Search, edit or remove existing properties. Admin credentials required.</p>
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

            <Input
              placeholder="City"
              value={filters.city}
              onChange={(e) => set("city", e.target.value)}
              className="md:col-span-2 h-11"
            />

            <Input
              placeholder="LGA / Area"
              value={filters.lga}
              onChange={(e) => set("lga", e.target.value)}
              className="md:col-span-2 h-11"
            />

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
                min={1_000_000} max={MAX_PRICE} step={1_000_000}
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
                  <Th className="text-right pr-6">Actions</Th>
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
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                            <Pencil size={14} className="mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setTarget(l)}>
                            <Trash2 size={14} className="mr-1" /> Delete
                          </Button>
                        </div>
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

      {/* Delete confirmation */}
      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setDelEmail(""); setDelPassword(""); } }}>
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
              <Input type="email" value={delEmail} onChange={(e) => setDelEmail(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin password</Label>
              <Input type="password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} autoComplete="off" />
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

      {/* Edit modal */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) closeEdit(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
            <DialogDescription>
              Update the property details below. All fields are editable as text. Admin credentials required to save.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-5 py-2">
              <EditField label="Name">
                <Input value={form.name} onChange={(e) => setF("name", e.target.value)} />
              </EditField>

              <div className="grid gap-4 md:grid-cols-3">
                <EditField label="State"><Input value={form.state} onChange={(e) => setF("state", e.target.value)} /></EditField>
                <EditField label="City"><Input value={form.city} onChange={(e) => setF("city", e.target.value)} /></EditField>
                <EditField label="LGA / Area"><Input value={form.lga} onChange={(e) => setF("lga", e.target.value)} /></EditField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <EditField label="Estate name"><Input value={form.estate_name} onChange={(e) => setF("estate_name", e.target.value)} /></EditField>
                <EditField label="Area of land"><Input value={form.area_of_land} onChange={(e) => setF("area_of_land", e.target.value)} /></EditField>
                <EditField label="Price (₦)"><Input type="number" value={form.price} onChange={(e) => setF("price", e.target.value)} /></EditField>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <EditField label="Structure category"><Input value={form.structure_category} onChange={(e) => setF("structure_category", e.target.value)} /></EditField>
                <EditField label="Building category"><Input value={form.building_category} onChange={(e) => setF("building_category", e.target.value)} /></EditField>
                <EditField label="Nature of purchase"><Input value={form.nature_of_purchase} onChange={(e) => setF("nature_of_purchase", e.target.value)} /></EditField>
              </div>

              <EditField label="Comments">
                <Textarea rows={4} value={form.comment} onChange={(e) => setF("comment", e.target.value)} />
              </EditField>

              {/* Images */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-secondary">Images ({keepImages.length + newImages.length} / {MAX_IMAGES})</Label>
                {(keepImages.length > 0 || newImages.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {keepImages.map((url, i) => (
                      <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setKeepImages((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 grid place-items-center h-6 w-6 rounded-full bg-secondary text-secondary-foreground">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {newImages.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted ring-2 ring-primary">
                        <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setNewImages((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 grid place-items-center h-6 w-6 rounded-full bg-secondary text-secondary-foreground">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-muted/30">
                  <UploadIcon className="mx-auto text-muted-foreground" size={20} />
                  <input id="edit-images" type="file" accept="image/*" multiple className="hidden" onChange={(e) => onAddImages(e.target.files)} />
                  <label htmlFor="edit-images" className="mt-2 inline-block cursor-pointer text-sm text-primary font-semibold">
                    Add more images
                  </label>
                </div>
              </div>

              {/* Video */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-secondary">Video (optional, under 2 minutes)</Label>
                {keepVideo && !newVideo && (
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                    <video src={keepVideo} className="h-16 w-24 object-cover rounded" />
                    <span className="text-xs text-muted-foreground flex-1 truncate">Existing video</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setKeepVideo(null)}>
                      <X size={14} className="mr-1" /> Remove
                    </Button>
                  </div>
                )}
                {newVideo && (
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                    <span className="text-xs text-muted-foreground flex-1 truncate">New: {newVideo.name}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setNewVideo(null)}>
                      <X size={14} className="mr-1" /> Remove
                    </Button>
                  </div>
                )}
                <Input type="file" accept="video/*" onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)} />
                <p className="text-xs text-muted-foreground">Selecting a new video will replace any existing one.</p>
              </div>

              {/* Auth */}
              <div className="border-t border-border pt-5">
                <h3 className="font-display font-bold text-secondary mb-3">Admin authentication</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <EditField label="Admin email"><Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} autoComplete="off" /></EditField>
                  <EditField label="Admin password"><Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} autoComplete="off" /></EditField>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeEdit} disabled={updating}>Cancel</Button>
            <Button onClick={performUpdate} disabled={updating} className="gradient-primary border-0 hover:opacity-90">
              {updating ? <><Loader2 className="animate-spin mr-2" size={16} /> Updating…</> : "Update"}
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
const EditField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-secondary">{label}</Label>
    {children}
  </div>
);

export default DeleteListings;
