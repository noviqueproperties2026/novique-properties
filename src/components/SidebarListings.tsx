import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { ImageOff } from "lucide-react";
import type { Listing } from "@/types/listing";

export const SidebarListings = ({ items }: { items: Listing[] }) => (
  <aside className="space-y-4">
    <h3 className="font-display text-lg font-bold text-secondary">More listings</h3>
    <div className="space-y-3">
      {items.map((l) => (
        <Link
          key={l.id}
          to={`/listing/${l.id}`}
          className="flex gap-3 bg-card rounded-xl border border-border/60 p-2 hover:shadow-card-hover hover:border-primary/40 transition-smooth group"
        >
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
            {l.image_urls[0] ? (
              <img src={l.image_urls[0]} alt={l.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground"><ImageOff size={20} /></div>
            )}
          </div>
          <div className="min-w-0 py-1 pr-2">
            <div className="text-sm font-semibold text-secondary line-clamp-1 group-hover:text-primary transition-smooth">
              {l.name}
            </div>
            <div className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin size={11} className="mt-0.5 shrink-0" />
              <span className="line-clamp-2">{l.lga}, {l.city}</span>
            </div>
          </div>
        </Link>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No other listings available yet.</p>
      )}
    </div>
  </aside>
);
