import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { LayoutDashboard, ShoppingBag, Smartphone, Settings, LogOut, Layers, Tag, Megaphone, Palette, Users, Mail, Camera, Images, CircleAlert } from "lucide-react";
import SiteLogo from "../../components/SiteLogo";

const LINKS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/failed-payments", icon: CircleAlert, label: "Failed Payments" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/contact", icon: Mail, label: "Enquiries" },
  { to: "/admin/promo-codes", icon: Tag, label: "Promo Codes" },
  { to: "/admin/popup-offers", icon: Megaphone, label: "Popup Offers" },
  { to: "/admin/hero-slides", icon: Images, label: "Hero Slider" },
  { to: "/admin/customer-gallery", icon: Camera, label: "Customer Gallery" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

const CATALOG_LINKS = [
  { to: "/admin/catalog", label: "Brands & Products", end: true },
  { to: "/admin/case-types", label: "Case Types", icon: Layers },
  { to: "/admin/catalog/templates", label: "Case Overlays", icon: Layers },
  { to: "/admin/template-products", label: "Phone Cases", icon: Palette },
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const catalogActive =
    location.pathname.startsWith("/admin/catalog")
    || location.pathname.startsWith("/admin/template-products");

  if (loading) return <div className="p-10 text-white/60">Loading…</div>;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-white/[0.06] glass p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <SiteLogo className="h-8" />
          <span className="text-xs text-white/40 font-mono">admin</span>
        </div>
        <nav className="flex-1 space-y-1">
          {LINKS.slice(0, 4).map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} data-testid={`admin-nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-brand/15 text-brand border border-brand/30" : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
          <div className="pt-1">
            <div className={`flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider ${catalogActive ? "text-brand" : "text-white/40"}`}>
              <Smartphone className="w-3.5 h-3.5" /> Catalog
            </div>
            <div className="ml-2 mt-1 space-y-0.5 border-l border-white/[0.06] pl-2">
              {CATALOG_LINKS.map(({ to, label, end, icon: SubIcon }) => (
                <NavLink key={to} to={to} end={end} data-testid={`admin-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? "bg-brand/15 text-brand border border-brand/30" : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                    }`
                  }
                >
                  {SubIcon && <SubIcon className="w-3.5 h-3.5" />} {label}
                </NavLink>
              ))}
            </div>
          </div>
          {LINKS.slice(4).map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} data-testid={`admin-nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-brand/15 text-brand border border-brand/30" : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <button data-testid="admin-logout"
          onClick={() => logout({ redirectTo: "/" })}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-white/60 hover:text-white">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </aside>
      <main className="flex-1 p-8 lg:p-10 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
