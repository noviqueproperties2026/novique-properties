import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
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
import { Loader2, Search, Trash2, ChevronLeft, Pencil, X, Upload as UploadIcon } from "lucide-react";
import {
  sanitizeShort, sanitizeText, sanitizeNumber, sanitizeEmail,
  whitelist, validateImageFile, validateVideoFile, safeImageExt, safeVideoExt,
} from "@/lib/sanitize";

// Extract the storage object path from a Supabase public URL.
// Public URL pattern: <base>/storage/v1/object/public/<bucket>/<path>
const pathFromPublicUrl = (url: string, bucket: string): string | null => {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return null;
  }
};

// Safely remove a list of files from a bucket. Logs but never throws.
const removeStorageFiles = async (bucket: string, urls: string[]) => {
  const paths = urls
    .map((u) => pathFromPublicUrl(u, bucket))
    .filter((p): p is string => !!p);
  if (paths.length === 0) return;
  try {
    await supabase.storage.from(bucket).remove(paths);
  } catch (err) {
    console.warn(`Storage cleanup failed for ${bucket}`, err);
  }
};

const PAGE = 20;
const ANY = "any";
const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;
const MAX_PRICE = 50_000_000_000;

interface Filters {
  q: string; state: string; city: string; lga: string;
  structure: string; building: string;
  area: string; priceMax: number;
}

const empty: Filters = {
  q: "", state: ANY, city: "", lga: "",
  structure: ANY, building: ANY, area: "", priceMax: MAX_PRICE,
};

const matches = (l: Listing, f: Filters) => {
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = `${l.name} ${l.estate_name ?? ""} ${l.comment ?? ""} ${l.city} ${l.lga} ${l.state}`.toLowerCase();
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

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings").select("*").order("created_at", { ascending: false });
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
    if (!delEmail.trim() || !delPassword) {
      toast.error("Provide both email and password");
      return;
    }
    setDeleting(true);
    try {
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: delEmail.trim(), password: delPassword,
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
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name} exceeds 5MB`);
        return;
      }
    }
    if (keepImages.length + newImages.length + arr.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images total`);
      return;
    }
    setNewImages((p) => [...p, ...arr]);
  };

  const onPickVideo = (file: File | null) => {
    if (!file) { setNewVideo(null); return; }
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
    if (!form.name.trim() || !form.state.trim() || !form.city.trim() || !form.lga.trim() || !form.price.trim()) {
      toast.error("Name, state, city, LGA and price are required");
      return;
    }
    if (!editEmail.trim() || !editPassword) {
      toast.error("Provide both admin email and password");
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
        email: editEmail.trim(), password: editPassword,
      });
      if (signErr || !signIn.user) {
        toast.error("Incorrect security details provided");
        setUpdating(false);
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", signIn.user.id);
      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast.error("Incorrect security details provided");
        setUpdating(false);
        return;
      }

      // Upload new images
      const uploadedImageUrls: string[] = [];
      for (const file of newImages) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${signIn.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("listing-images").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(path);
        uploadedImageUrls.push(pub.publicUrl);
      }
      const finalImageUrls = [...keepImages, ...uploadedImageUrls];

      // Handle video
      let finalVideoUrl: string | null = keepVideo;
      if (newVideo) {
        const ext = newVideo.name.split(".").pop() || "mp4";
        const path = `${signIn.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: vErr } = await supabase.storage.from("listing-videos").upload(path, newVideo, { contentType: newVideo.type });
        if (vErr) throw vErr;
        const { data: pub } = supabase.storage.from("listing-videos").getPublicUrl(path);
        finalVideoUrl = pub.publicUrl;
      }

      const priceNum = Number(form.price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        toast.error("Invalid price");
        setUpdating(false);
        await supabase.auth.signOut();
        return;
      }

      const { error: upErr } = await supabase.from("listings").update({
        name: form.name.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        lga: form.lga.trim(),
        estate_name: form.estate_name.trim() || null,
        area_of_land: form.area_of_land.trim() || null,
        price: priceNum,
        structure_category: form.structure_category.trim(),
        building_category: form.building_category.trim(),
        nature_of_purchase: form.nature_of_purchase.trim(),
        comment: form.comment.trim() || null,
        image_urls: finalImageUrls,
        video_url: finalVideoUrl,
      }).eq("id", editing.id);
      if (upErr) throw upErr;

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
