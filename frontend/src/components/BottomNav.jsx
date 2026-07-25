import { NavLink, useLocation } from "react-router-dom";
import { Home, Store, Palette, User, Mail } from "lucide-react";
import { useAuth } from "../lib/auth";
import { BOTTOM_NAV_ITEMS } from "../constants/nav";
import { cn } from "../lib/utils";

const ICONS = {
  home: Home,
  store: Store,
  palette: Palette,
  user: User,
  mail: Mail,
};

function isItemActive(item, pathname, hash, user) {
  if (item.hash) {
    return pathname === "/" && hash === item.hashTarget;
  }
  if (item.authAlt) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true;
    if (!user && (pathname === item.authAlt || pathname === "/register")) return true;
    if (user && (pathname === "/track" || pathname.startsWith("/track/"))) return true;
    return false;
  }
  if (item.end) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function tabClassName(isActive, isFeatured = false) {
  if (isFeatured) {
    return "relative flex flex-1 flex-col items-center justify-end pb-1 min-h-[44px] min-w-0 touch-manipulation rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";
  }
  return cn(
    "relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-0 px-0.5 touch-manipulation rounded-xl",
    "transition-colors duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
    isActive ? "text-white" : "text-white/45 active:text-white/70"
  );
}

function TabIcon({ Icon, isActive, isFeatured = false }) {
  if (isFeatured) {
    return (
      <span
        className={cn(
          "absolute -top-5 flex h-[48px] w-[48px] items-center justify-center rounded-2xl transition-all duration-300 ease-out",
          "bg-brand-gradient shadow-[0_4px_20px_rgba(109,177,97,0.35)]",
          isActive
            ? "scale-105 shadow-[0_6px_28px_rgba(109,177,97,0.45)]"
            : "hover:scale-105 hover:shadow-[0_6px_24px_rgba(109,177,97,0.4)] active:scale-95"
        )}
      >
        <Icon className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
      </span>
    );
  }

  return (
    <>
      <span
        className={cn(
          "absolute top-0 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-brand-gradient transition-all duration-300 ease-out",
          isActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}
        aria-hidden
      />
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-transform duration-200 ease-out",
          isActive && "scale-105"
        )}
        strokeWidth={isActive ? 2.25 : 1.75}
        aria-hidden
      />
    </>
  );
}

function TabLabel({ children, isActive, isFeatured = false }) {
  return (
    <span
      className={cn(
        "text-[9px] font-medium leading-none tracking-wide transition-colors duration-200 truncate max-w-full",
        isFeatured ? "mt-6 text-white/90" : isActive ? "text-white" : "text-white/45"
      )}
    >
      {children}
    </span>
  );
}

function BottomNavItem({ item, to, isActive }) {
  const Icon = ICONS[item.icon];
  const isFeatured = item.featured;
  const className = tabClassName(isActive, isFeatured);

  const content = (
    <>
      <TabIcon Icon={Icon} isActive={isActive} isFeatured={isFeatured} />
      <TabLabel isActive={isActive} isFeatured={isFeatured}>
        {item.label}
      </TabLabel>
    </>
  );

  if (item.hash) {
    return (
      <a
        href={to}
        data-testid={item.testId}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        className={className}
      >
        {content}
      </a>
    );
  }

  if (isFeatured) {
    return (
      <NavLink
        to={to}
        data-testid={item.testId}
        aria-current={isActive ? "page" : undefined}
        aria-label={item.label}
        className={className}
      >
        {content}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      end={item.end}
      data-testid={item.testId}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {content}
    </NavLink>
  );
}

export default function BottomNav() {
  const { pathname, hash } = useLocation();
  const { user } = useAuth();
  const onAdmin = pathname.startsWith("/admin");

  if (onAdmin) return null;

  return (
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Mobile navigation"
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 md:hidden"
    >
      <div className="bottom-nav-inner mx-auto flex h-[68px] w-full max-w-2xl items-stretch px-1">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const to = item.authAlt && !user ? item.authAlt : item.to;
          const isActive = isItemActive(item, pathname, hash, user);

          return (
            <BottomNavItem key={item.testId} item={item} to={to} isActive={isActive} />
          );
        })}
      </div>
    </nav>
  );
}
