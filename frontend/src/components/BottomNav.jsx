import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Store, Palette, User, Mail } from "lucide-react";
import { useAuth } from "../lib/auth";
import { BOTTOM_NAV_ITEMS, isAdminUiPath } from "../constants/nav";
import { cn } from "../lib/utils";

function isHomeLeadPath(pathname) {
  return pathname === "/";
}

function shouldRevealAfterScroll() {
  const hero = document.querySelector('[data-testid="video-hero"]');
  if (hero) {
    const bottom = hero.getBoundingClientRect().bottom;
    return bottom < window.innerHeight * 0.72;
  }
  return (window.scrollY || document.documentElement.scrollTop) > 80;
}

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



function BottomNavItem({ item, to, isActive }) {
  const Icon = ICONS[item.icon];

  const content = (
    <>
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-[color,transform] duration-300 ease-out",
          isActive && "bottom-nav-icon-active"
        )}
        strokeWidth={isActive ? 2.25 : 1.75}
        aria-hidden
      />
      <span
        className={cn(
          "text-[10px] font-medium leading-none tracking-wide truncate max-w-full",
          "transition-colors duration-300 ease-out"
        )}
      >
        {item.label}
      </span>
    </>
  );

  const className = cn(
    "relative flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] min-w-0 px-0.5",
    "touch-manipulation rounded-2xl",
    "transition-colors duration-300 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
    isActive ? "text-brand-dark" : "text-white/45 active:text-white/70"
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

  return (
    <NavLink
      to={to}
      end={item.end}
      data-testid={item.testId}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      className={className}
    >
      {content}
    </NavLink>
  );
}

export default function BottomNav() {
  const { pathname, hash } = useLocation();
  const { user } = useAuth();
  const onAdmin = isAdminUiPath(pathname);
  const hideOnLead = isHomeLeadPath(pathname);
  const [visible, setVisible] = useState(() => !hideOnLead);

  useEffect(() => {
    if (onAdmin) return undefined;

    if (!hideOnLead) {
      setVisible(true);
      return undefined;
    }

    setVisible(false);

    let frame = 0;
    const update = () => {
      setVisible(shouldRevealAfterScroll());
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(update);
    });
    const retry = window.setTimeout(update, 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hideOnLead, onAdmin]);

  if (onAdmin) return null;

  return (
    <nav
      data-testid="mobile-bottom-nav"
      data-visible={visible ? "true" : "false"}
      aria-label="Mobile navigation"
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
      className={cn(
        "bottom-nav fixed left-3 right-3 bottom-3 z-40 md:hidden",
        !visible && "is-hidden"
      )}
    >
      <div className="bottom-nav-inner mx-auto flex h-[64px] w-full max-w-2xl items-stretch px-1.5 py-1">
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
