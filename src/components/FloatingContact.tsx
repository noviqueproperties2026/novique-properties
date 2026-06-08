import { useEffect, useState } from "react";
import { Phone } from "lucide-react";

export const FloatingContact = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="status"
      aria-label="Contact Novique Properties"
      className={`
        fixed bottom-4 left-4 z-50
        flex items-center gap-3
        pl-3 pr-4 py-2.5
        rounded-2xl
        bg-primary text-primary-foreground
        shadow-lg
        border border-white/20
        select-none pointer-events-none
        transition-all duration-500 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}
      `}
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20 shrink-0">
        <Phone size={16} className="text-white" />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 border-2 border-primary animate-pulse" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/80">
          Call or WhatsApp
        </span>
        <span className="text-sm font-bold whitespace-nowrap">
          +234 902 3763 465
        </span>
      </div>
    </div>
  );
};
