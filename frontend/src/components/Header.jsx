import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  User,
  LogOut,
  ChevronDown,
  MapPin,
  Package,
  Heart,
  LayoutDashboard,
  Menu,
  Sparkles,
  Search,
  ArrowRight,
  X,
} from "lucide-react";
import SiteLogo from "./SiteLogo";
import { useAuth } from "../lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LOGOUT } from "../constants/testIds/auth";
import { NAV_LINKS, isAdminUiPath } from "../constants/nav";

import { useCart } from "../lib/cart";

function displayName(user) {
  if (user?.name?.trim()) return user.name.trim().split(/\s+/)[0];
  if (user?.email) return user.email.split("@")[0];
  return "Account";
}

function navLinkClass({ isActive }) {
  return isActive ? "text-brand" : "text-white/70 hover:text-brand-light transition-colors";
}

function NavItem({ link, className = navLinkClass, onNavigate }) {
  if (link.hash) {
    return (
      <a
        href={link.to}
        data-testid={link.testId}
        onClick={onNavigate}
        className={typeof className === "string" ? className : "hover:text-white transition-colors"}
      >
        {link.label}
      </a>
    );
  }

  return (
    <NavLink
      to={link.to}
      end={link.end}
      data-testid={link.testId}
      onClick={onNavigate}
      className={className}
    >
      {link.label}
    </NavLink>
  );
}

const accountLinkClass =
  "flex items-center gap-3 text-[15px] text-neutral-700 hover:text-neutral-900 px-1 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors";

function AuthActions({ user, loading, logout, className = "", onNavigate }) {
  if (loading) return null;

  if (!user) {
    return (
      <div className={`flex flex-col items-stretch gap-2 ${className}`}>
        <Link
          to="/login"
          data-testid="header-sign-in"
          onClick={onNavigate}
          className="btn-secondary text-sm px-4 py-2.5 text-center rounded-full"
        >
          Sign in
        </Link>
        <Link
          to="/login"
          data-testid="header-sign-up"
          onClick={onNavigate}
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors px-4 py-2 text-center"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      {user.role === "admin" && (
        <Link
          to="/admin"
          data-testid="header-admin-dashboard"
          onClick={onNavigate}
          className={accountLinkClass}
        >
          <LayoutDashboard className="w-4 h-4" />
          Admin dashboard
        </Link>
      )}
      {user.role === "customer" && (
        <>
          <Link
            to="/profile"
            data-testid="header-profile"
            onClick={onNavigate}
            className={accountLinkClass}
          >
            <MapPin className="w-4 h-4" />
            Profile &amp; address
          </Link>
          <Link
            to="/profile#orders"
            data-testid="header-orders"
            onClick={onNavigate}
            className={accountLinkClass}
          >
            <Package className="w-4 h-4" />
            My orders
          </Link>
          <Link
            to="/wishlist"
            data-testid="header-wishlist"
            onClick={onNavigate}
            className={accountLinkClass}
          >
            <Heart className="w-4 h-4" />
            Wishlist
          </Link>
        </>
      )}
      <button
        type="button"
        data-testid={LOGOUT.button}
        onClick={() => {
          logout({ redirectTo: "/" });
          onNavigate?.();
        }}
        className={`${accountLinkClass} w-full`}
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}

function mobileNavClass({ isActive }) {
  return [
    "block w-full text-left text-[17px] font-medium px-1 py-3 rounded-lg transition-colors",
    isActive ? "text-brand-dark" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50",
  ].join(" ");
}

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const { cartItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const onAdmin = isAdminUiPath(location.pathname);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  if (onAdmin) return null;

  return (
    <header
      data-testid="site-header"
      className="site-header sticky top-0 z-40"
    >
      <div className="hidden md:block border-b border-white/[0.06] bg-[#080a08]">
        <div className="max-w-[92rem] mx-auto px-6 lg:px-10 h-8 flex items-center justify-between text-[11px] text-white/55">
          <span>Made with care in India · Tracked nationwide delivery</span>
          <Link to="/customize" className="flex items-center gap-1 text-white/80 hover:text-brand-light transition-colors">
            Create your first case <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-10 h-16 md:h-[4.5rem] flex items-center gap-5">
        <Link
          to="/"
          data-testid="logo-link"
          className="flex items-center group"
        >
          <SiteLogo className="h-9 sm:h-9" />
        </Link>

        <nav className="hidden lg:flex items-center gap-7 ml-5 text-[13px] text-white/70">
          {NAV_LINKS.map((link) => (
            <NavItem
              key={link.label}
              link={link}
              className={link.hash ? "text-white/70 hover:text-brand-light transition-colors" : navLinkClass}
            />
          ))}
        </nav>

        <form
          className="hidden md:flex flex-1 max-w-md ml-auto"
          onSubmit={(event) => {
            event.preventDefault();
            const query = new FormData(event.currentTarget).get("search")?.toString().trim();
            navigate(query ? `/shop?search=${encodeURIComponent(query)}` : "/shop");
          }}
          role="search"
        >
          <label className="header-search">
            <Search className="w-4 h-4" aria-hidden="true" />
            <input name="search" type="search" placeholder="Search designs" aria-label="Search designs" />
          </label>
        </form>

        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto md:ml-0">
          {!loading && !user && (
            <div className="hidden md:flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                data-testid="header-sign-in"
                className="header-icon-button text-xs px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                data-testid="header-sign-up"
                className="text-sm text-white/70 hover:text-white transition-colors px-1"
              >
                Sign up
              </Link>
            </div>
          )}

          {!loading && user && (
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger
                  data-testid="header-user-menu"
                  className="flex items-center gap-1.5 sm:gap-2 text-sm text-white/80 hover:text-white transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-white/[0.04] outline-none"
                >
                  <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/10 grid place-items-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="max-w-[120px] truncate">
                    {displayName(user)}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 glass border-white/10">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-sm text-white truncate flex items-center gap-2">
                      {user.name || displayName(user)}
                      {user.role === "admin" && (
                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/50 truncate font-normal">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />
                  {user.role === "admin" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/admin"
                          data-testid="header-admin-dashboard"
                          className="cursor-pointer text-white/80 focus:text-white focus:bg-white/[0.06]"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Admin dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                    </>
                  )}
                  {user.role === "customer" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/profile"
                          data-testid="header-profile"
                          className="cursor-pointer text-white/80 focus:text-white focus:bg-white/[0.06]"
                        >
                          <MapPin className="w-4 h-4" />
                          Profile &amp; address
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/profile#orders"
                          data-testid="header-orders"
                          className="cursor-pointer text-white/80 focus:text-white focus:bg-white/[0.06]"
                        >
                          <Package className="w-4 h-4" />
                          My orders
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/wishlist"
                          data-testid="header-wishlist"
                          className="cursor-pointer text-white/80 focus:text-white focus:bg-white/[0.06]"
                        >
                          <Heart className="w-4 h-4" />
                          Wishlist
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                    </>
                  )}
                  <DropdownMenuItem
                    data-testid={LOGOUT.button}
                    onClick={() => logout({ redirectTo: "/" })}
                    className="cursor-pointer text-white/80 focus:text-white focus:bg-white/[0.06]"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Link
            to="/cart"
            data-testid="header-cart"
            className="header-icon-button text-sm flex items-center gap-2 relative p-2.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 sm:static sm:top-auto sm:right-auto bg-brand-gradient text-white text-[10px] sm:text-xs font-medium w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </Link>

          <Link
            to="/customize"
            data-testid="header-cta"
            className="btn-primary text-xs items-center gap-2 hidden xl:flex !py-2.5 !px-4"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Design</span>
          </Link>

          <button
            type="button"
            data-testid="mobile-menu-toggle"
            className="header-icon-button lg:!hidden p-2.5 outline-none"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drop-menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen &&
        createPortal(
          <div className="lg:hidden fixed inset-0 top-0 z-[60] h-dvh w-full">
            <button
              type="button"
              className="absolute inset-0 h-full w-full bg-black/40"
              aria-label="Close menu"
              onClick={closeMobile}
            />
            <div
              id="mobile-drop-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="mobile-menu-dropdown absolute top-0 left-0 flex h-dvh min-h-0 w-[min(85vw,22.5rem)] flex-col overflow-hidden bg-white shadow-[8px_24px_48px_rgba(16,24,16,0.18)]"
            >
              <div className="flex items-center justify-between px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
                <p className="text-lg font-semibold tracking-tight text-neutral-800">Menu</p>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="grid h-8 w-8 place-items-center rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto px-6 pb-2">
                {NAV_LINKS.map((link) =>
                  link.hash ? (
                    <a
                      key={link.label}
                      href={link.to}
                      data-testid={link.testId}
                      onClick={closeMobile}
                      className="block w-full text-left text-[17px] font-medium px-1 py-3 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <NavLink
                      key={link.label}
                      to={link.to}
                      end={link.end}
                      data-testid={link.testId}
                      onClick={closeMobile}
                      className={mobileNavClass}
                    >
                      {link.label}
                    </NavLink>
                  )
                )}

                <div className="mt-3 border-t border-neutral-100 pt-4 pb-2">
                  {!loading && user && (
                    <div className="px-1 pb-3">
                      <div className="text-sm font-medium text-neutral-800 truncate">
                        {user.name || displayName(user)}
                      </div>
                      <div className="text-xs text-neutral-500 truncate">{user.email}</div>
                    </div>
                  )}
                  <AuthActions user={user} loading={loading} logout={logout} onNavigate={closeMobile} />
                </div>
              </nav>

              <div className="space-y-3 border-t border-neutral-100 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Link
                  to="/cart"
                  data-testid="mobile-header-cart"
                  onClick={closeMobile}
                  className="btn-secondary !rounded-2xl text-sm flex items-center justify-center gap-2 w-full"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Cart ({cartItems.length})
                </Link>
                <Link
                  to="/customize"
                  data-testid="mobile-header-cta"
                  onClick={closeMobile}
                  className="btn-primary text-sm flex items-center justify-center gap-2 w-full"
                >
                  <Sparkles className="w-4 h-4" />
                  Start Design
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
}
