import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  alt: string;
  autoPlay?: boolean;
  className?: string;
  rounded?: string;
  fit?: "cover" | "contain";
}

export const ImageSlideshow = ({ images, alt, autoPlay = false, className, rounded = "rounded-t-2xl", fit = "cover" }: Props) => {
  const [i, setI] = useState(0);
  const safe = images?.length ? images : [];

  useEffect(() => {
    if (!autoPlay || safe.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % safe.length), 4500);
    return () => clearInterval(t);
  }, [autoPlay, safe.length]);

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setI((p) => (p - 1 + safe.length) % safe.length);
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setI((p) => (p + 1) % safe.length);
  };

  if (safe.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", rounded, className)}>
        <ImageOff size={32} />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden group", fit === "contain" ? "bg-white" : "bg-muted", rounded, className)}>
      <img
        src={safe[i]}
        alt={`${alt} — image ${i + 1}`}
        className={cn("h-full w-full transition-smooth", fit === "contain" ? "object-contain" : "object-cover")}
        loading="lazy"
      />
      {safe.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-background/90 text-secondary shadow-card opacity-0 group-hover:opacity-100 transition-smooth hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-full bg-background/90 text-secondary shadow-card opacity-0 group-hover:opacity-100 transition-smooth hover:bg-primary hover:text-primary-foreground"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {safe.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-smooth",
                  idx === i ? "w-5 bg-primary" : "w-1.5 bg-white/70",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
