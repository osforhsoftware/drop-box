import { Link, NavLink, useLocation } from "react-router-dom";
import { ShoppingBag, Sparkles, Package } from "lucide-react";

export default function Header() {
  const location = useLocation();
  const onAdmin = location.pathname.startsWith("/admin");
  if (onAdmin) return null;
  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-40 glass border-b border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link
          to="/"
          data-testid="logo-link"
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-md bg-[#ff4f00] grid place-items-center shadow-[0_0_20px_rgba(255,79,0,0.5)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-xl tracking-tight">FORM</span>
          <span className="label-eyebrow ml-1 hidden sm:inline">
            Case Studio
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          <NavLink
            data-testid="nav-customize"
            to="/customize"
            className={({ isActive }) =>
              isActive ? "text-white" : "hover:text-white transition-colors"
            }
          >
            Customize
          </NavLink>
          <NavLink
            data-testid="nav-track"
            to="/track"
            className={({ isActive }) =>
              isActive ? "text-white" : "hover:text-white transition-colors"
            }
          >
            Track Order
          </NavLink>
          <a
            data-testid="nav-how"
            href="/#how-it-works"
            className="hover:text-white transition-colors"
          >
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/customize"
            data-testid="header-cta"
            className="btn-primary text-sm flex items-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> Start Design
          </Link>
        </div>
      </div>
    </header>
  );
}
