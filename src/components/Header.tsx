import { Link, useLocation } from "react-router-dom";
import logo from "@/assets/novique-logo.png";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Upload Property", to: "/upload" },
];

export const Header = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="container flex h-20 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Novique Properties logo" className="h-12 w-12 object-contain" />
          <div className="leading-tight hidden sm:block">
            <div className="font-display text-lg font-bold text-secondary">Novique</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Properties</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "text-sm font-medium transition-smooth relative py-2",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          className="md:hidden p-2 text-secondary"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-3 flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium",
                  pathname === item.to ? "bg-accent text-primary" : "text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
