import { Link } from "react-router-dom";
import logo from "@/assets/novique-logo.png";
import { Phone, MessageCircle } from "lucide-react";

export const Footer = () => (
  <footer className="mt-24 bg-secondary text-secondary-foreground">
    <div className="container py-14 grid gap-10 md:grid-cols-3">
      <div className="flex items-start gap-3">
        <img src={logo} alt="Novique Properties" className="h-12 w-12 object-contain bg-white rounded-lg p-1" />
        <div>
          <div className="font-display text-xl font-bold">Novique Properties</div>
          <p className="text-sm text-secondary-foreground/70 mt-2 max-w-xs">
            Discover homes that match your lifestyle across Nigeria's most desirable locations.
          </p>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-4 text-primary-glow">Get in touch</h4>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3"><Phone size={16} className="text-primary" /> Phone: 09023763465</li>
          <li className="flex items-center gap-3"><MessageCircle size={16} className="text-primary" /> WhatsApp: 09023763465</li>
        </ul>
      </div>

      <div>
        <h4 className="font-semibold mb-4 text-primary-glow">Quick links</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/" className="hover:text-primary transition-smooth">Home</Link></li>
          <li><Link to="/about" className="hover:text-primary transition-smooth">About Us</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10">
      <div className="container py-5 text-xs text-secondary-foreground/60 text-center">
        © {new Date().getFullYear()} Novique Properties. All rights reserved.
      </div>
    </div>
  </footer>
);
