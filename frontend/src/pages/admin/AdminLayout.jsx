import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { LayoutDashboard, ShoppingBag, Smartphone, Settings, LogOut, Sparkles } from "lucide-react";

const LINKS = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/catalog", icon: Smartphone, label: "Catalog" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="p-10 text-white/60">Loading…</div>;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-white/[0.06] glass p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-md bg-[#ff4f00] grid place-items-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-xl">FORM</span>
          <span className="text-xs text-white/40 font-mono">admin</span>
        </div>
        <nav className="flex-1 space-y-1">
          {LINKS.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} data-testid={`admin-nav-${label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-[#ff4f00]/15 text-[#ff4f00] border border-[#ff4f00]/30" : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <button data-testid="admin-logout"
          onClick={async () => { await logout(); navigate("/admin/login"); }}
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
