import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  NIGERIA_STATES,
  STRUCTURE_CATEGORIES, BUILDING_CATEGORIES, PURCHASE_NATURES,
} from "@/data/nigeria-locations";
import { Loader2, Upload as UploadIcon, X, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  sanitizeShort, sanitizeText, sanitizeNumber, sanitizeEmail,
  whitelist, validateImageFile, validateVideoFile,
} from "@/lib/sanitize";
import { fileToPayload } from "@/lib/file-encode";

const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 120;

const Upload = () => {
  useEffect(() => { document.title = "Upload Property — Novique Properties"; }, []);

  const [form, setForm] = useState({
    name: "", state: "", city: "", lga: "",
    estate_name: "", area_of_land: "", price: "",
    structure: "", building: "", purchase: "",
    comment: "", email: "", password: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const onImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    for (const f of arr) {
      const err = validateImageFile(f, MAX_IMAGE_BYTES);
      if (err) { toast.error(err); return; }
    }
    if (images.length + arr.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images`);
      return;
    }
    setImages((p) => [...p, ...arr]);
  };

  const onVideo = (file: File | null) => {
    if (!file) { setVideo(null); return; }
    const err = validateVideoFile(file);
    if (err) { toast.error(err); return; }
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
      setVideo(file);
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitize all inputs up front
    const safe = {
      name: sanitizeShort(form.name, 200),
      state: whitelist(form.state, NIGERIA_STATES, "") as string,
      city: sanitizeShort(form.city, 80),
      lga: sanitizeShort(form.lga, 80),
      estate_name: sanitizeShort(form.estate_name, 120),
      area_of_land: sanitizeShort(form.area_of_land, 60),
      price: sanitizeNumber(form.price, 1e15),
      structure: whitelist(form.structure, STRUCTURE_CATEGORIES, "") as string,
      building: whitelist(form.building, BUILDING_CATEGORIES, "") as string,
      purchase: whitelist(form.purchase, PURCHASE_NATURES, "") as string,
      comment: sanitizeText(form.comment, 4000),
      email: sanitizeEmail(form.email),
      password: typeof form.password === "string" ? form.password : "",
    };

    const requiredText: [string, string][] = [
      ["name", safe.name], ["state", safe.state], ["city", safe.city], ["lga", safe.lga],
      ["structure", safe.structure], ["building", safe.building], ["nature of purchase", safe.purchase],
      ["comment", safe.comment], ["admin email", safe.email],
    ];
    for (const [label, val] of requiredText) {
      if (!val) { toast.error(`Please provide a valid: ${label}`); return; }
    }
    if (!Number.isFinite(safe.price) || safe.price <= 0) {
      toast.error("Please provide a valid price"); return;
    }
    if (!safe.password || safe.password.length < 6) {
      toast.error("Please provide your admin password"); return;
    }
    if (images.length === 0) { toast.error("Add at least one image"); return; }

    setSubmitting(true);
    try {
      // 1) Authenticate as admin (acquires JWT)
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: safe.email,
        password: safe.password,
      });
      if (signErr || !signIn.user || !signIn.session) {
        toast.error("Incorrect security details provided");
        setSubmitting(false);
        return;
      }

      // 2) Encode files to base64 for the edge function
      const imagesPayload = await Promise.all(images.map(fileToPayload));
      const videoPayload = video ? await fileToPayload(video) : null;

      // 3) Call the secure edge function (it re-validates admin role,
      //    schema, and file content via magic bytes server-side)
      const { data, error: fnErr } = await supabase.functions.invoke("admin-upload-listing", {
        body: {
          listing: {
            name: safe.name,
            state: safe.state,
            city: safe.city,
            lga: safe.lga,
            estate_name: safe.estate_name || null,
            area_of_land: safe.area_of_land || null,
            price: safe.price,
            structure_category: safe.structure,
            building_category: safe.building,
            nature_of_purchase: safe.purchase,
            comment: safe.comment,
          },
          images: imagesPayload,
          video: videoPayload,
        },
      });

      if (fnErr || (data && (data as { error?: string }).error)) {
        const msg = (data as { error?: string } | null)?.error || fnErr?.message || "Upload failed";
        toast.error(msg);
        await supabase.auth.signOut();
        setSubmitting(false);
        return;
      }

      toast.success("Listing uploaded successfully");
      setForm({ name: "", state: "", city: "", lga: "", estate_name: "", area_of_land: "", price: "", structure: "", building: "", purchase: "", comment: "", email: "", password: "" });
      setImages([]);
      setVideo(null);
      await supabase.auth.signOut();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container py-12 max-w-4xl">
        <Link
          to="/delete-listings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-glow transition-smooth mb-6"
        >
          <Trash2 size={15} /> Go to Delete Listings Page →
        </Link>
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Admin only</span>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-secondary">Upload a property</h1>
          <p className="mt-2 text-muted-foreground">Add a new listing to the Novique platform. Admin credentials required.</p>
        </div>

        <form onSubmit={submit} className="bg-card border border-border/60 rounded-2xl p-6 md:p-8 space-y-6 shadow-card">
          <Field label="Listing name">
            <Input maxLength={200} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 4-Bed Smart Duplex with BQ" />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="State">
              <Select value={form.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {NIGERIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City">
              <Input maxLength={80} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Enter city" />
            </Field>
            <Field label="LGA / Area">
              <Input maxLength={80} value={form.lga} onChange={(e) => set("lga", e.target.value)} placeholder="Enter LGA / area" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Estate name (optional)"><Input maxLength={120} value={form.estate_name} onChange={(e) => set("estate_name", e.target.value)} /></Field>
            <Field label="Area of land (optional)"><Input maxLength={60} value={form.area_of_land} onChange={(e) => set("area_of_land", e.target.value)} placeholder="e.g. 600 sqm" /></Field>
            <Field label="Price (₦)"><Input type="number" min="0" max="1000000000000000" value={form.price} onChange={(e) => set("price", e.target.value)} /></Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Structure category">
              <Select value={form.structure} onValueChange={(v) => set("structure", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {STRUCTURE_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Building category">
              <Select value={form.building} onValueChange={(v) => set("building", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BUILDING_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nature of purchase">
              <Select value={form.purchase} onValueChange={(v) => set("purchase", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {PURCHASE_NATURES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label={`Images (max ${MAX_IMAGES}, 5MB each)`}>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-muted/30">
              <UploadIcon className="mx-auto text-muted-foreground" />
              <input
                id="images" type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => onImages(e.target.files)}
              />
              <label htmlFor="images" className="mt-3 inline-block cursor-pointer text-sm text-primary font-semibold">
                Click to add images
              </label>
              <p className="text-xs text-muted-foreground mt-1">{images.length} / {MAX_IMAGES} added</p>
            </div>
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {images.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 grid place-items-center h-6 w-6 rounded-full bg-secondary text-secondary-foreground">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          <Field label="Video (optional, max 1, under 2 minutes)">
            <Input type="file" accept="video/*" onChange={(e) => onVideo(e.target.files?.[0] ?? null)} />
            {video && <p className="mt-2 text-xs text-muted-foreground">{video.name}</p>}
          </Field>

          <Field label="Comment / description">
            <Textarea maxLength={4000} rows={4} value={form.comment} onChange={(e) => set("comment", e.target.value)} placeholder="Describe the property, features, surroundings…" />
          </Field>

          <div className="border-t border-border pt-6">
            <h3 className="font-display font-bold text-secondary mb-3">Admin authentication</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Admin email"><Input type="email" maxLength={254} autoComplete="off" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Admin password"><Input type="password" maxLength={200} autoComplete="off" value={form.password} onChange={(e) => set("password", e.target.value)} /></Field>
            </div>
          </div>

          <Button type="submit" disabled={submitting} size="lg" className="w-full gradient-primary border-0 hover:opacity-90 text-base font-semibold">
            {submitting ? <><Loader2 className="animate-spin mr-2" size={18} /> Uploading…</> : "Submit listing"}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-medium text-secondary">{label}</Label>
    {children}
  </div>
);

export default Upload;
