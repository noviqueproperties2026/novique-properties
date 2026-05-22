import {
  Waves, Camera, Dumbbell, Home, Car, Wifi, Trees, Shield, Zap, Droplet,
  Sun, Trash2, ShieldCheck, ShoppingCart, Bed, Sparkles, Fence, Users,
  Wrench, Wind, UtensilsCrossed, Tv, Lock, Key, Building2, MapPin,
  Bath, ParkingCircle, Flame, Percent, Route, ToyBrick, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Array<[RegExp, LucideIcon]> = [
  [/\b(swim|pool)\b/i, Waves],
  [/\b(cctv|surveillance|camera)\b/i, Camera],
  [/\b(gym|fitness)\b/i, Dumbbell],
  [/\b(smart\s?home|automation|home\s?auto)\b/i, Wifi],
  [/\b(park|parking|garage)\b/i, Car],
  [/\b(wifi|internet|network)\b/i, Wifi],
  [/\b(garden|landscap|green|tree)\b/i, Trees],
  [/\b(police|guard|patrol)\b/i, ShieldCheck],
  [/\b(security|secure|alarm)\b/i, Shield],
  [/\b(power|electric|generator|24\s?hour)\b/i, Zap],
  [/\b(solar)\b/i, Sun],
  [/\b(water|borehole|portable)\b/i, Droplet],
  [/\b(waste|trash|garbage)\b/i, Trash2],
  [/\b(shop|mall|market)\b/i, ShoppingCart],
  [/\b(bed|room|bedroom)\b/i, Bed],
  [/\b(spa|sauna|jacuzzi)\b/i, Sparkles],
  [/\b(fenc|gate|perimeter)\b/i, Fence],
  [/\b(neighbor|community|residents)\b/i, Users],
  [/\b(maint|service|repair)\b/i, Wrench],
  [/\b(air|ac|condition|cooling)\b/i, Wind],
  [/\b(kitchen|dining|restaurant)\b/i, UtensilsCrossed],
  [/\b(tv|cable|entertain)\b/i, Tv],
  [/\b(lock|secure\s?door)\b/i, Lock],
  [/\b(key|access)\b/i, Key],
  [/\b(estate|building|tower)\b/i, Building2],
  [/\b(location|near|close|zone)\b/i, MapPin],
  [/\b(bath|shower|toilet)\b/i, Bath],
  [/\b(playground|play|kids|children)\b/i, ToyBrick],
  [/\b(fire|fireplace|bbq)\b/i, Flame],
  [/\b(deposit|payment|installment|month|%|percent|balance)\b/i, Percent],
  [/\b(road|tarred|access\s?road|street)\b/i, Route],
  [/\b(spacious|large|big)\b/i, ParkingCircle],
];

const pickIcon = (text: string): LucideIcon => {
  for (const [re, Icon] of ICON_MAP) if (re.test(text)) return Icon;
  return Check;
};

const splitAttributes = (raw: string): string[] =>
  raw
    .split(/\|\||\.|\n|;/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export const AttributePills = ({ text }: { text: string }) => {
  const items = splitAttributes(text);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((label, i) => {
        const Icon = pickIcon(label);
        return (
          <span
            key={i}
            className="group relative inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full text-sm font-semibold text-white
                       bg-gradient-to-b from-primary-glow to-primary
                       shadow-[0_6px_14px_-4px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.35),inset_0_-2px_4px_hsl(0_0%_0%/0.15)]
                       ring-1 ring-white/10
                       transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-6px_hsl(var(--primary)/0.65),inset_0_1px_0_hsl(0_0%_100%/0.4),inset_0_-2px_4px_hsl(0_0%_0%/0.18)]"
          >
            <span className="grid place-items-center h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/25 shadow-inner">
              <Icon size={13} className="text-white" strokeWidth={2.4} />
            </span>
            <span className="leading-none">{label}</span>
            <span aria-hidden className="pointer-events-none absolute inset-x-2 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/30 to-transparent opacity-70" />
          </span>
        );
      })}
    </div>
  );
};
