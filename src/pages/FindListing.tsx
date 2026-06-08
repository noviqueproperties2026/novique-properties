import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { AdminToolbar } from "@/components/AdminToolbar";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageSlideshow } from "@/components/ImageSlideshow";
import { AttributePills } from "@/components/AttributePills";
import { Loader2, Search, MapPin, Hash, Calendar, History, Pencil, ArrowUpDown, Play } from "lucide-react";
import type { Listing } from "@/types/listing";
import { formatNaira } from "@/types/listing";
import { toast } from "sonner";

interface ListingEvent {
  id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  created_by_email: string | null;
}

const FindListing = () => {
  const [number, setNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [listing, setListing] = useState<Listing | null>(null);
  const [events, setEvents] = useState<ListingEvent[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => { document.title = "Find a Listing — Novique Properties"; }, []);

  const doSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = number.trim().toUpperCase();
    if (!num) { toast.error("Enter a listing number"); return; }
    setSearching(true);
    setSearched(true);
    setListing(null);
    setEvents([]);
    try {
      const { data: l, error } = await supabase
        .from("listings").select("*").eq("listing_number", num).maybeSingle();
      if (error) throw error;
      if (!l) {
        setSearching(false);
        return;
      }
      setListing(l as Listing);
      const { data: ev } = await supabase
        .from("listing_events").select("*")
        .eq("listing_id", (l as Listing).id)
        .order("created_at", { ascending: false });
      setEvents((ev as ListingEvent[]) ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Layout>
      <div className="container py-10 max-w-7xl">
        <AdminToolbar active="find" />

        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Admin lookup</span>
          <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold text-secondary">Find a Listing</h1>
          <p className="mt-2 text-muted-foreground">Look up a property by its listing number.</p>
        </div>

        <form onSubmit={doSearch} className="bg-card border border-border/60 rounded-2xl p-5 shadow-card mb-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="e.g. NQP-4827193"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="pl-9 h-11 font-mono uppercase"
              maxLength={20}
            />
          </div>
          <Button type="submit" disabled={searching} size="lg" className="gradient-primary border-0 hover:opacity-90">
            {searching ? <Loader2 className="animate-spin" size={18} /> : <><Search size={16} className="mr-2" /> Search</>}
          </Button>
        </form>

        {searching && (
          <div className="py-16 grid place-items-center text-muted-foreground"><Loader2 className="animate-spin" size={28} /></div>
        )}

        {!searching && searched && !listing && (
          <div className="py-20 text-center bg-muted/30 rounded-2xl border border-dashed border-border">
            <p className="text-lg font-semibold text-secondary">No listing found.</p>
            <p className="mt-1 text-sm text-muted-foreground">Double-check the listing number and try again.</p>
          </div>
        )}

        {!searching && listing && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* LEFT — public details */}
            <div className="min-w-0 space-y-6">
              <ImageSlideshow
                images={listing.image_urls}
                alt={listing.name}
                autoPlay
                fit="contain"
                className="aspect-[16/10] w-full"
                rounded="rounded-2xl"
              />
              {listing.video_url && (
                <div className="space-y-2">
                  <h2 className="font-display text-lg font-bold text-secondary flex items-center gap-2">
                    <Play size={16} className="text-primary" /> Video
                  </h2>
                  <video src={listing.video_url} controls className="w-full rounded-2xl bg-black aspect-video" />
                </div>
              )}

              <ListingNumberBadge number={listing.listing_number} />

              <div>
                <h2 className="font-display text-2xl font-bold text-secondary">{listing.name}</h2>
                <div className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
                  <MapPin size={14} /> {listing.lga}, {listing.city}, {listing.state}
                </div>
                <div className="mt-3 text-2xl font-bold text-primary">{formatNaira(listing.price)}</div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <Detail k="State" v={listing.state} />
                <Detail k="City" v={listing.city} />
                <Detail k="LGA" v={listing.lga} />
                <Detail k="Estate" v={listing.estate_name ?? "—"} />
                <Detail k="Structure" v={listing.structure_category} />
                <Detail k="Building" v={listing.building_category} />
                <Detail k="Purchase" v={listing.nature_of_purchase} />
                <Detail k="Land area" v={listing.area_of_land ?? "—"} />
              </div>

              {listing.comment && (
                <div className="bg-card border border-border/60 rounded-2xl p-5">
                  <h3 className="font-display text-lg font-bold text-secondary mb-3">Property attributes</h3>
                  <AttributePills text={listing.comment} />
                </div>
              )}
            </div>

            {/* RIGHT — admin intel panel */}
            <aside className="bg-card border border-border/60 rounded-2xl p-5 h-fit lg:sticky lg:top-24">
              <h3 className="font-display text-lg font-bold text-secondary mb-1">Admin intelligence</h3>
              <p className="text-xs text-muted-foreground mb-4">Internal lifecycle and edit trail.</p>

              <div className="space-y-3 text-sm">
                <IntelRow icon={<Calendar size={14} />} label="Date uploaded"
                  value={new Date(listing.created_at).toLocaleString()} />
                <IntelRow icon={<Calendar size={14} />} label="Last update"
                  value={new Date(listing.updated_at).toLocaleString()} />
                <IntelRow icon={<ArrowUpDown size={14} />} label="Current rank"
                  value={`#${listing.rank_order}`} />
              </div>

              <div className="mt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <History size={12} /> History
                </h4>
                <ol className="relative border-l-2 border-border ml-2 space-y-4">
                  {events.length === 0 && (
                    <li className="ml-4 text-sm text-muted-foreground">No recorded events.</li>
                  )}
                  {events.map((ev) => (
                    <li key={ev.id} className="ml-4">
                      <span className="absolute -left-[7px] grid place-items-center h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
                      <div className="text-xs text-muted-foreground">
                        {new Date(ev.created_at).toLocaleString()}
                      </div>
                      <div className="text-sm font-semibold text-secondary mt-0.5">
                        {formatEvent(ev)}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
};

const ListingNumberBadge = ({ number }: { number: string }) => (
  <div className="inline-flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg border border-white/20">
    <span className="grid place-items-center h-9 w-9 rounded-xl bg-white/20">
      <Hash size={18} />
    </span>
    <div className="leading-tight">
      <div className="text-[10px] font-medium uppercase tracking-wider text-white/80">Listing Number</div>
      <div className="font-mono text-lg font-bold">{number}</div>
    </div>
  </div>
);

const Detail = ({ k, v }: { k: string; v: string }) => (
  <div className="bg-muted/40 rounded-lg px-3 py-2">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{k}</div>
    <div className="text-secondary font-medium">{v}</div>
  </div>
);

const IntelRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <span className="grid place-items-center h-7 w-7 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-secondary font-semibold break-words">{value}</div>
    </div>
  </div>
);

const formatEvent = (ev: ListingEvent): string => {
  const d = (ev.details ?? {}) as Record<string, unknown>;
  switch (ev.event_type) {
    case "uploaded": return "Listing uploaded";
    case "edited": return "Listing details edited";
    case "images_updated": {
      const added = Number(d.added ?? 0);
      const removed = Number(d.removed ?? 0);
      const bits: string[] = [];
      if (added) bits.push(`+${added} image${added === 1 ? "" : "s"}`);
      if (removed) bits.push(`-${removed} image${removed === 1 ? "" : "s"}`);
      return `Images updated (${bits.join(", ") || "no change"})`;
    }
    case "video_updated": return d.removed ? "Video removed" : "Video updated";
    case "ranked": {
      const dir = String(d.direction ?? "");
      const pos = Number(d.positions ?? 0);
      return `Moved ${dir} ${pos} position${pos === 1 ? "" : "s"}`;
    }
    default: return ev.event_type;
  }
};

export default FindListing;
