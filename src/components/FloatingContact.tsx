import { useEffect, useState } from "react";
import { Phone } from "lucide-react";

const PHONE = "+2349023763465";
const WHATSAPP_LINK = `https://wa.me/${PHONE.replace(/\D/g, "")}`;

export const FloatingContact = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  const handleClick = () => {
    if (isMobile) {
      window.location.href = `tel:${PHONE}`;
    } else {
      window.open(WHATSAPP_LINK, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Call or WhatsApp Novique Properties"
      className={`
        fixed bottom-5 right-5 z-40
        flex items-center gap-2.5
        pl-3 pr-4 py-2.5
        rounded-full
        bg-primary text-primary-foreground
        shadow-card-hover
        transition-all duration-500 ease-out
        hover:scale-105 hover:shadow-elegant
        active:scale-95
        cursor-pointer
        border border-white/20
        ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
      `}
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
        <Phone size={16} className="text-white" />
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-primary" />
      </span>
      <span className="text-sm font-semibold whitespace-nowrap hidden sm:inline">
        Call or WhatsApp
      </span>
      <span className="text-sm font-semibold whitespace-nowrap sm:hidden">
        {PHONE}
      </span>
    </button>
  );
};
