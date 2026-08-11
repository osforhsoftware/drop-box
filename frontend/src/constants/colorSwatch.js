import { LOGO_COLOR } from "./brand";

const COLOR_MAP = {
  black: "#0c0c0e",
  white: "#f5f5f5",
  red: "#dc2626",
  blue: "#2563eb",
  orange: "#ea580c",
  green: LOGO_COLOR,
  yellow: "#eab308",
  pink: "#ec4899",
  purple: "#9333ea",
  grey: "#6b7280",
  gray: "#6b7280",
  brown: "#92400e",
  gold: "#d4af37",
  silver: "#c0c0c0",
  navy: "#1e3a5f",
  teal: "#0d9488",
  beige: "#d4c4a8",
  cream: "#fffdd0",
  transparent: "transparent",
};

export function isColorTag(tag) {
  if (!tag) return false;
  const key = String(tag).trim().toLowerCase();
  if (COLOR_MAP[key]) return true;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return true;
  return false;
}

export function getColorHex(tag) {
  const key = String(tag || "").trim().toLowerCase();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  return null;
}

export function partitionTags(tags = []) {
  const colors = [];
  const other = [];
  for (const tag of tags) {
    if (isColorTag(tag)) colors.push(tag);
    else other.push(tag);
  }
  return { colors, other };
}
