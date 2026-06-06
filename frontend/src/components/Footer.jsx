import { Link, useLocation } from "react-router-dom";
import { Instagram, Twitter, Mail } from "lucide-react";

export default function Footer() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;
  return (
    <footer
      data-testid="site-footer"
      className="mt-32 border-t border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#ff4f00]" />
            <span className="font-display text-lg">FORM</span>
          </div>
          <p className="text-sm text-white/50 mt-4 max-w-xs">
            Premium custom phone cases. Designed by you. Printed in India.
            Shipped worldwide.
          </p>
        </div>
        <div>
          <div className="label-eyebrow mb-4">Shop</div>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link to="/customize">Customize</Link>
            </li>
            <li>
              <Link to="/track">Track Order</Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow mb-4">Company</div>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <a href="/#how-it-works">How it works</a>
            </li>
            <li>
              <a href="/#testimonials">Reviews</a>
            </li>
          </ul>
        </div>
        <div>
          <div className="label-eyebrow mb-4">Contact</div>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4" /> hello@formcase.studio
            </li>
            <li className="flex items-center gap-3 pt-2">
              <Instagram className="w-4 h-4" />
              <Twitter className="w-4 h-4" />
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.05] py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} FORM Case Studio — Crafted in India
      </div>
    </footer>
  );
}
