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
        fixed bottom-6 right-6 z-50
        flex items-center gap-4
        pl-4 pr-6 py-4
        rounded-3xl
        bg-primary text-primary-foreground
        shadow-xl
        border border-white/20
        select-none pointer-events-none
        transition-all duration-500 ease-out
        ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}
      `}
    >
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/20 shrink-0">
        <Phone size={24} className="text-white" />
        <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-primary animate-pulse" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-[14px] font-medium uppercase tracking-wider text-white/80">
          Call or WhatsApp
        </span>
        <span className="text-xl font-bold whitespace-nowrap">
          +234 902 3763 465
        </span>
      </div>
    </div>
  );
};
