import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "./ui/sheet";
import { LOGOUT } from "../constants/testIds/auth";
import { NAV_LINKS } from "../constants/nav";

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

function AuthActions({ user, loading, logout, className = "", onNavigate }) {
  if (loading) return null;

  if (!user) {
    return (
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
        <SheetClose asChild>
          <Link
            to="/login"
            data-testid="header-sign-in"
            onClick={onNavigate}
            className="btn-secondary text-sm px-4 py-2 text-center"
          >
            Sign in
          </Link>
        </SheetClose>
        <SheetClose asChild>
          <Link
            to="/register"
            data-testid="header-sign-up"
            onClick={onNavigate}
            className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2 text-center"
          >
            Sign up
          </Link>
        </SheetClose>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {user.role === "admin" && (
        <SheetClose asChild>
          <Link
            to="/admin"
            data-testid="header-admin-dashboard"
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.04]"
          >
            <LayoutDashboard className="w-4 h-4" />
            Admin dashboard
          </Link>
        </SheetClose>
      )}
      {user.role === "customer" && (
        <>
          <SheetClose asChild>
            <Link
              to="/profile"
              data-testid="header-profile"
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.04]"
            >
              <MapPin className="w-4 h-4" />
              Profile &amp; address
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              to="/profile#orders"
              data-testid="header-orders"
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.04]"
            >
              <Package className="w-4 h-4" />
              My orders
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link
              to="/wishlist"
              data-testid="header-wishlist"
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.04]"
            >
              <Heart className="w-4 h-4" />
              Wishlist
            </Link>
          </SheetClose>
        </>
      )}
      <button
        type="button"
        data-testid={LOGOUT.button}
        onClick={() => {
          logout();
          onNavigate?.();
        }}
        className="flex items-center gap-2 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.04] w-full"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}

export default function Header() {
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const { cartItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const onAdmin = location.pathname.startsWith("/admin");
  if (onAdmin) return null;

  const closeMobile = () => setMobileOpen(false);

  return (
    <header
      data-testid="site-header"
      className="sticky top-0 z-40 glass border-b border-brand/15"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link
          to="/"
          data-testid="logo-link"
          className="flex items-center group"
        >
          <SiteLogo className="h-9 sm:h-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
          {NAV_LINKS.map((link) => (
            <NavItem
              key={link.label}
              link={link}
              className={link.hash ? "text-white/70 hover:text-brand-light transition-colors" : navLinkClass}
            />
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && !user && (
            <div className="hidden md:flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                data-testid="header-sign-in"
                className="btn-secondary text-sm px-3 sm:px-4 py-2"
              >
                Sign in
              </Link>
              <Link
                to="/register"
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
                    onClick={() => logout()}
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
            className="btn-secondary text-sm flex items-center gap-2 relative p-2 sm:px-3 sm:py-2 rounded-lg"
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
            className="btn-primary text-sm flex items-center gap-2 hidden sm:flex"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Design</span>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              data-testid="mobile-menu-toggle"
              className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors outline-none"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="glass border-white/10 w-[min(100vw,20rem)] p-0 flex flex-col"
            >
              <SheetHeader className="px-6 py-5 border-b border-white/[0.06] text-left">
                <SheetTitle className="text-white font-display text-lg">Menu</SheetTitle>
              </SheetHeader>

              <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {NAV_LINKS.map((link) =>
                  link.hash ? (
                    <SheetClose key={link.label} asChild>
                      <a
                        href={link.to}
                        data-testid={link.testId}
                        onClick={closeMobile}
                        className="block w-full text-left text-base px-3 py-3 rounded-lg text-white/70 hover:text-brand-light hover:bg-white/[0.04] transition-colors"
                      >
                        {link.label}
                      </a>
                    </SheetClose>
                  ) : (
                    <SheetClose key={link.label} asChild>
                      <NavLink
                        to={link.to}
                        end={link.end}
                        data-testid={link.testId}
                        onClick={closeMobile}
                        className="block w-full text-left text-base px-3 py-3 rounded-lg text-white/70 hover:text-brand-light hover:bg-white/[0.04] transition-colors"
                      >
                        {link.label}
                      </NavLink>
                    </SheetClose>
                  )
                )}
              </nav>

              <div className="border-t border-white/[0.06] px-4 py-5 space-y-4">
                {!loading && user && (
                  <div className="px-3 pb-2">
                    <div className="text-sm text-white truncate">{user.name || displayName(user)}</div>
                    <div className="text-xs text-white/50 truncate">{user.email}</div>
                  </div>
                )}

                <AuthActions user={user} loading={loading} logout={logout} onNavigate={closeMobile} />

                <SheetClose asChild>
                  <Link
                    to="/cart"
                    data-testid="mobile-header-cart"
                    onClick={closeMobile}
                    className="btn-secondary text-sm flex items-center justify-center gap-2 w-full mb-3"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Cart ({cartItems.length})
                  </Link>
                </SheetClose>

                <SheetClose asChild>
                  <Link
                    to="/customize"
                    data-testid="mobile-header-cta"
                    onClick={closeMobile}
                    className="btn-primary text-sm flex items-center justify-center gap-2 w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    Start Design
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
