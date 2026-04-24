import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  NIGERIA_LOCATIONS,
  NIGERIA_STATES,
  STRUCTURE_CATEGORIES,
  BUILDING_CATEGORIES,
  PURCHASE_NATURES,
} from "@/data/nigeria-locations";

export interface SearchFilters {
  q: string;
  state: string;
  city: string;
  lga: string;
  structure: string;
  building: string;
  purchase: string;
  area: string;
  priceMax: number;
}

const ANY = "any";

export const emptyFilters: SearchFilters = {
  q: "", state: ANY, city: ANY, lga: ANY,
  structure: ANY, building: ANY, purchase: ANY,
  area: "", priceMax: 1_000_000_000,
};

export const SearchBar = ({ onSearch }: { onSearch: (f: SearchFilters) => void }) => {
  const [f, setF] = useState<SearchFilters>(emptyFilters);

  const cities = useMemo(
    () => (f.state !== ANY ? Object.keys(NIGERIA_LOCATIONS[f.state] ?? {}) : []),
    [f.state],
  );
  const lgas = useMemo(
    () => (f.state !== ANY && f.city !== ANY ? NIGERIA_LOCATIONS[f.state]?.[f.city] ?? [] : []),
    [f.state, f.city],
  );

  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) =>
    setF((p) => {
      const next = { ...p, [k]: v };
      if (k === "state") { next.city = ANY; next.lga = ANY; }
      if (k === "city") next.lga = ANY;
      return next;
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(f);
  };

  return (
    <form
      onSubmit={submit}
      className="bg-card rounded-2xl shadow-elegant border border-border/60 p-5 md:p-6"
    >
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-5 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, estate, or keyword..."
            value={f.q}
            onChange={(e) => set("q", e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <Select value={f.state} onValueChange={(v) => set("state", v)}>
          <SelectTrigger className="md:col-span-3 h-11"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All states</SelectItem>
            {NIGERIA_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={f.city} onValueChange={(v) => set("city", v)} disabled={f.state === ANY}>
          <SelectTrigger className="md:col-span-2 h-11"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All cities</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={f.lga} onValueChange={(v) => set("lga", v)} disabled={f.city === ANY}>
          <SelectTrigger className="md:col-span-2 h-11"><SelectValue placeholder="LGA / Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All LGAs</SelectItem>
            {lgas.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={f.structure} onValueChange={(v) => set("structure", v)}>
          <SelectTrigger className="md:col-span-3 h-11"><SelectValue placeholder="Structure" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any structure</SelectItem>
            {STRUCTURE_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={f.building} onValueChange={(v) => set("building", v)}>
          <SelectTrigger className="md:col-span-3 h-11"><SelectValue placeholder="Building" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any building</SelectItem>
            {BUILDING_CATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={f.purchase} onValueChange={(v) => set("purchase", v)}>
          <SelectTrigger className="md:col-span-3 h-11"><SelectValue placeholder="Nature of purchase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any</SelectItem>
            {PURCHASE_NATURES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          placeholder="Land area (e.g. 600 sqm)"
          value={f.area}
          onChange={(e) => set("area", e.target.value)}
          className="md:col-span-3 h-11"
        />

        <div className="md:col-span-9 flex flex-col justify-center px-1">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>Max price</span>
            <span className="text-secondary font-semibold">
              ₦{f.priceMax.toLocaleString()}
            </span>
          </div>
          <Slider
            value={[f.priceMax]}
            onValueChange={(v) => set("priceMax", v[0])}
            min={1_000_000}
            max={1_000_000_000}
            step={1_000_000}
          />
        </div>

        <Button type="submit" className="md:col-span-3 h-11 text-base font-semibold gradient-primary border-0 hover:opacity-90">
          <Search size={18} className="mr-2" /> Search
        </Button>
      </div>
    </form>
  );
};
