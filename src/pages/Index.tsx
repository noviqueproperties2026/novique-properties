import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/types/listing";
import { Layout } from "@/components/Layout";
import { SearchBar, emptyFilters, type SearchFilters } from "@/components/SearchBar";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { HIGH_END_AREAS } from "@/data/nigeria-locations";
import heroImg from "@/assets/hero-estate.jpg";
import { Loader2 } from "lucide-react";

const PAGE = 10;
const ANY = "any";
const HERO_MAX = 10;
const HERO_INTERVAL = 5000;

const matchesFilters = (l: Listing, f: SearchFilters) => {
  const q = f.q.trim().toLowerCase();
  if (q) {
    const hay = `${l.name} ${l.estate_name ?? ""} ${l.comment ?? ""} ${l.city} ${l.lga} ${l.state}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.state !== ANY && l.state.toLowerCase() !== f.state.toLowerCase()) return false;
  if (f.city.trim() && !l.city.toLowerCase().includes(f.city.trim().toLowerCase())) return false;
  if (f.lga.trim() && !l.lga.toLowerCase().includes(f.lga.trim().toLowerCase())) return false;
  if (f.structure !== ANY && l.structure_category !== f.structure) return false;
  if (f.building !== ANY && l.building_category !== f.building) return false;
  if (f.purchase !== ANY && l.nature_of_purchase !== f.purchase) return false;
  if (f.area.trim() && !(l.area_of_land ?? "").toLowerCase().includes(f.area.trim().toLowerCase())) return false;
  if (l.price > f.priceMax) return false;
  return true;
};

const Index = () => {
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [newCount, setNewCount] = useState(PAGE);
  const [hotCount, setHotCount] = useState(PAGE);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    document.title = "Novique Properties — Premium Homes in Nigeria";
    (async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setAll(data as Listing[]);
      setLoading(false);
    })();
  }, []);

  // Build a randomized pool of hero images per session (max 10)
  const heroImages = useMemo(() => {
    const pool: string[] = [];
    for (const l of all) {
      for (const url of l.image_urls ?? []) pool.push(url);
    }
    if (pool.length === 0) return [];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, HERO_MAX);
  }, [all]);

  useEffect(() => {
    if (heroImages.length < 2) return;
    const t = setInterval(() => setHeroIdx((p) => (p + 1) % heroImages.length), HERO_INTERVAL);
    return () => clearInterval(t);
  }, [heroImages.length]);

  const filtered = useMemo(() => all.filter((l) => matchesFilters(l, filters)), [all, filters]);

  const newest = filtered;

  const hottest = useMemo(() => {
    const score = (l: Listing) =>
      HIGH_END_AREAS.some((a) => l.lga.toLowerCase().includes(a.toLowerCase()) || l.city.toLowerCase().includes(a.toLowerCase())) ? 1 : 0;
    return [...filtered].sort((a, b) => score(b) - score(a) + (Math.random() - 0.5));
  }, [filtered]);

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(emptyFilters);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0">
          {heroImages.length === 0 ? (
            <img src={heroImg} alt="Luxury Nigerian estate" className="h-full w-full object-cover" />
          ) : (
            heroImages.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Featured property ${i + 1}`}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === heroIdx ? "opacity-100" : "opacity-0"}`}
              />
            ))
          )}
          <div className="absolute inset-0 gradient-hero" />
        </div>
        <div className="relative container py-20 md:py-32">
          <div className="max-w-2xl text-white">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-glow text-xs font-semibold uppercase tracking-wider border border-primary/30">
              Premium Listings
            </span>
            <h1 className="mt-5 font-display text-4xl md:text-6xl font-bold leading-[1.1]">
              Find a home you'll love<br />
              <span className="text-primary-glow">across Nigeria.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/80 max-w-xl">
              Curated duplexes, bungalows and apartments in Maitama, Asokoro, Lekki and beyond — verified and ready for you.
            </p>
          </div>

          <div className="mt-10 md:-mb-20 relative z-10">
            <SearchBar onSearch={(f) => { setFilters(f); setNewCount(PAGE); setHotCount(PAGE); }} />
          </div>
        </div>
      </section>

      <div className="md:h-20" />

      {/* New Listings */}
      <section className="container py-16">
        <SectionHeader
          eyebrow={isFiltered ? "Search results" : "Fresh on the market"}
          title={isFiltered ? `${filtered.length} matching ${filtered.length === 1 ? "property" : "properties"}` : "New listings"}
          subtitle={isFiltered ? "Refine your search to discover more options." : "The latest properties added to our portfolio."}
        />

        {loading ? (
          <LoadingGrid />
        ) : newest.length === 0 ? (
          <EmptyState
            title={isFiltered ? "No properties match your filters" : "No listings yet"}
            subtitle={isFiltered ? "Try widening your search or clearing some filters." : "Properties uploaded by the admin will appear here."}
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {newest.slice(0, newCount).map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
            {newCount < newest.length && (
              <div className="mt-10 text-center">
                <Button onClick={() => setNewCount((c) => c + PAGE)} variant="outline" size="lg">
                  See more
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Hottest */}
      {!loading && !isFiltered && hottest.length > 0 && (
        <section className="bg-muted/40 py-16 border-y border-border/60">
          <div className="container">
            <SectionHeader
              eyebrow="Trending now"
              title="Hottest listings"
              subtitle="Highly sought-after homes in Maitama, Asokoro, Lekki and other prime areas."
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {hottest.slice(0, hotCount).map((l) => <ListingCard key={l.id} listing={l} />)}
            </div>
            {hotCount < hottest.length && (
              <div className="mt-10 text-center">
                <Button onClick={() => setHotCount((c) => c + PAGE)} variant="outline" size="lg">
                  See more
                </Button>
              </div>
            )}
          </div>
        </section>
      )}
    </Layout>
  );
};

const SectionHeader = ({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) => (
  <div className="mb-10 max-w-2xl">
    <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</span>
    <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold text-secondary">{title}</h2>
    <p className="mt-2 text-muted-foreground">{subtitle}</p>
  </div>
);

const LoadingGrid = () => (
  <div className="py-20 grid place-items-center text-muted-foreground">
    <Loader2 className="animate-spin" size={32} />
  </div>
);

const EmptyState = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="py-16 text-center bg-muted/40 rounded-2xl border border-dashed border-border">
    <div className="font-display text-xl font-semibold text-secondary">{title}</div>
    <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{subtitle}</p>
  </div>
);

export default Index;
