export const NAV_LINKS = [
  { to: "/", label: "Home", end: true, testId: "nav-home" },
  { to: "/about", label: "About", testId: "nav-about" },
  { to: "/shop", label: "Shop", testId: "nav-shop" },
  { to: "/gallery", label: "Gallery", testId: "nav-gallery" },
  { to: "/customize", label: "Customize", testId: "nav-customize" },
  { to: "/contact", label: "Contact", testId: "nav-contact" },
];

export const BOTTOM_NAV_ITEMS = [
  { to: "/", label: "Home", end: true, testId: "bottom-nav-home", icon: "home" },
  { to: "/shop", label: "Shop", testId: "bottom-nav-shop", icon: "store" },
  {
    to: "/customize",
    label: "Design",
    testId: "bottom-nav-design",
    icon: "palette",
  },
  {
    to: "/contact",
    label: "Contact",
    testId: "bottom-nav-contact",
    icon: "mail",
  },
  {
    to: "/profile",
    label: "Account",
    testId: "bottom-nav-account",
    icon: "user",
    authAlt: "/login",
  },
];

/** Total height reserved for the fixed mobile bottom bar (content + safe area). */
export const MOBILE_BOTTOM_NAV_HEIGHT = 68;

export const ADMIN_LOGIN_PATH = "/casebox-login";

export function isAdminUiPath(pathname) {
  return pathname.startsWith("/admin") || pathname === ADMIN_LOGIN_PATH;
}
