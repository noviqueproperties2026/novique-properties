import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  NIGERIA_STATES,
  STRUCTURE_CATEGORIES,
  BUILDING_CATEGORIES,
  PURCHASE_NATURES,
} from "@/data/nigeria-locations";
import { sanitizeShort, whitelist } from "@/lib/sanitize";

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
const MAX_PRICE = 50_000_000_000;

export const emptyFilters: SearchFilters = {
  q: "", state: ANY, city: "", lga: "",
  structure: ANY, building: ANY, purchase: ANY,
  area: "", priceMax: MAX_PRICE,
};

export const SearchBar = ({ onSearch }: { onSearch: (f: SearchFilters) => void }) => {
  const [f, setF] = useState<SearchFilters>(emptyFilters);

  const set = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    // Sanitize all text inputs before applying
    const cleaned: SearchFilters = {
      q: sanitizeShort(f.q, 100),
      state: whitelist(f.state, [ANY, ...NIGERIA_STATES] as const, ANY) || ANY,
      city: sanitizeShort(f.city, 80),
      lga: sanitizeShort(f.lga, 80),
      structure: whitelist(f.structure, [ANY, ...STRUCTURE_CATEGORIES] as const, ANY) || ANY,
      building: whitelist(f.building, [ANY, ...BUILDING_CATEGORIES] as const, ANY) || ANY,
      purchase: whitelist(f.purchase, [ANY, ...PURCHASE_NATURES] as const, ANY) || ANY,
      area: sanitizeShort(f.area, 60),
      priceMax: Number.isFinite(f.priceMax) && f.priceMax > 0 ? f.priceMax : MAX_PRICE,
    };

    if (!cleaned.q && cleaned.state === ANY) {
      toast.error("Enter a property name or pick a state to search");
      return;
    }

    onSearch(cleaned);
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
            maxLength={100}
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

        <Input
          placeholder="City (optional)"
          value={f.city}
          onChange={(e) => set("city", e.target.value)}
          maxLength={80}
          className="md:col-span-2 h-11"
        />

        <Input
          placeholder="LGA / Area (optional)"
          value={f.lga}
          onChange={(e) => set("lga", e.target.value)}
          maxLength={80}
          className="md:col-span-2 h-11"
        />

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
          maxLength={60}
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
            max={MAX_PRICE}
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
