import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { ImageSlideshow } from "./ImageSlideshow";
import { formatNaira, type Listing } from "@/types/listing";

export const ListingCard = ({ listing }: { listing: Listing }) => (
  <article className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-smooth border border-border/60 hover:-translate-y-1">
    <ImageSlideshow
      images={listing.image_urls}
      alt={listing.name}
      className="aspect-[4/3]"
      rounded="rounded-t-2xl"
    />
    <Link to={`/listing/${listing.id}`} className="block p-5">
      <div className="text-primary text-lg font-bold tracking-tight">{formatNaira(listing.price)}</div>
      <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin size={13} className="mt-0.5 shrink-0" />
        <span className="line-clamp-1">{listing.lga}, {listing.city}, {listing.state}</span>
      </div>
      <h3 className="mt-2 font-display text-lg font-semibold text-secondary line-clamp-1 group-hover:text-primary transition-smooth">
        {listing.name}
      </h3>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="px-2 py-1 rounded-md bg-muted">{listing.building_category}</span>
        <span className="px-2 py-1 rounded-md bg-accent text-accent-foreground">{listing.nature_of_purchase}</span>
      </div>
      <div className="mt-4 inline-flex items-center text-sm font-semibold text-primary">
        See details →
      </div>
    </Link>
  </article>
);
