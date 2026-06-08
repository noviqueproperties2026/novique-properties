import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/types/listing";
import { formatNaira } from "@/types/listing";
import { Layout } from "@/components/Layout";
import { FloatingContact } from "@/components/FloatingContact";
import { AttributePills } from "@/components/AttributePills";
import { ImageSlideshow } from "@/components/ImageSlideshow";
import { SidebarListings } from "@/components/SidebarListings";
import { ChevronLeft, ChevronRight, MapPin, Home, Building2, Tag, Ruler, Loader2, Play, Hash } from "lucide-react";

const ListingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [vidIdx, setVidIdx] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  useEffect(() => {
    setLoading(true);
    setVidIdx(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    (async () => {
      const [one, list] = await Promise.all([
        supabase.from("listings").select("*").eq("id", id!).maybeSingle(),
        supabase.from("listings").select("*").order("rank_order", { ascending: true }).limit(50),
      ]);
      setListing((one.data as Listing) ?? null);
      setAll((list.data as Listing[]) ?? []);
      if (one.data) document.title = `${(one.data as Listing).name} — Novique Properties`;
      setLoading(false);
    })();
  }, [id]);

  const sidebarItems = useMemo(() => {
    void shuffleSeed;
    const others = all.filter((l) => l.id !== id);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
  }, [all, id, shuffleSeed]);

  // re-shuffle when user clicks one (id changes triggers refetch + reshuffle)
  useEffect(() => { setShuffleSeed((s) => s + 1); }, [id]);

  const videos = listing?.video_url ? [listing.video_url] : [];

  if (loading) {
    return (
      <Layout>
        <div className="container py-32 grid place-items-center text-muted-foreground">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout>
        <div className="container py-32 text-center">
          <h1 className="font-display text-3xl font-bold text-secondary">Listing not found</h1>
          <Link to="/" className="mt-4 inline-block text-primary font-semibold">← Back to home</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth">
          <ChevronLeft size={16} /> Back to listings
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-8">
            {/* Image slideshow with autoplay */}
            <ImageSlideshow
              images={listing.image_urls}
              alt={listing.name}
              autoPlay
              fit="contain"
              className="aspect-[16/10] w-full"
              rounded="rounded-2xl"
            />

            {/* Video */}
            {videos.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-display text-xl font-bold text-secondary flex items-center gap-2">
                  <Play size={18} className="text-primary" /> Property video
                </h2>
                <div className="relative bg-secondary rounded-2xl overflow-hidden aspect-video">
                  <video
                    key={videos[vidIdx]}
                    src={videos[vidIdx]}
                    controls
                    preload="metadata"
                    className="h-full w-full object-contain bg-black"
                  />
                  {videos.length > 1 && (
                    <>
                      <button onClick={() => setVidIdx((p) => (p - 1 + videos.length) % videos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-background/90 text-secondary"><ChevronLeft size={18} /></button>
                      <button onClick={() => setVidIdx((p) => (p + 1) % videos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-background/90 text-secondary"><ChevronRight size={18} /></button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Listing number badge */}
            <div className="inline-flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg border border-white/20">
              <span className="grid place-items-center h-10 w-10 rounded-xl bg-white/20">
                <Hash size={18} />
              </span>
              <div className="leading-tight">
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/80">Listing Number</div>
                <div className="font-mono text-lg font-bold">{listing.listing_number}</div>
              </div>
            </div>

            {/* Header */}
            <div>
              <div className="text-3xl md:text-4xl font-display font-bold text-secondary">{listing.name}</div>
              <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={16} /> {listing.lga}, {listing.city}, {listing.state}
              </div>
              <div className="mt-4 text-3xl font-bold text-primary">{formatNaira(listing.price)}</div>
            </div>

            {/* Specs */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Spec icon={<Home size={16} />} label="Structure" value={listing.structure_category} />
              <Spec icon={<Building2 size={16} />} label="Building" value={listing.building_category} />
              <Spec icon={<Tag size={16} />} label="Purpose" value={listing.nature_of_purchase} />
              {listing.area_of_land && <Spec icon={<Ruler size={16} />} label="Land area" value={listing.area_of_land} />}
              {listing.estate_name && <Spec icon={<Building2 size={16} />} label="Estate" value={listing.estate_name} />}
              <Spec icon={<MapPin size={16} />} label="State" value={listing.state} />
            </div>

            {/* Comments */}
            {listing.comment && (
              <div className="bg-card border border-border/60 rounded-2xl p-6">
                <h2 className="font-display text-xl font-bold text-secondary mb-4">About this property</h2>
                <AttributePills text={listing.comment} />
              </div>
            )}
          </div>

          <SidebarListings items={sidebarItems} />
        </div>
      </div>

      <FloatingContact />
    </Layout>
  );
};

const Spec = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card border border-border/60 rounded-xl px-4 py-3">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      <span className="text-primary">{icon}</span> {label}
    </div>
    <div className="mt-1 font-semibold text-secondary">{value}</div>
  </div>
);

export default ListingDetails;
