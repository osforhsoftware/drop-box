/**
 * Case body colors for the Customize preview (yourPrint-style swatches).
 * Default is white so transparent overlays read as a blank white case.
 */
export const DEFAULT_CASE_COLOR_ID = "white";

export const CASE_COLOR_OPTIONS = [
  { id: "black", label: "Black", hex: "#0c0c0e" },
  { id: "white", label: "White", hex: "#ffffff" },
  { id: "grey", label: "Grey", hex: "#9ca3af" },
  { id: "dark-grey", label: "Dark Grey", hex: "#4b5563" },
  { id: "red", label: "Red", hex: "#dc2626" },
  { id: "blue", label: "Blue", hex: "#2563eb" },
  { id: "navy", label: "Navy", hex: "#1e3a5f" },
  { id: "green", label: "Green", hex: "#16a34a" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "orange", label: "Orange", hex: "#ea580c" },
  { id: "purple", label: "Purple", hex: "#9333ea" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "maroon", label: "Maroon", hex: "#7f1d1d" },
  { id: "teal", label: "Teal", hex: "#0d9488" },
  { id: "cream", label: "Cream", hex: "#f5f0e6" },
];

export function getCaseColorById(id) {
  return (
    CASE_COLOR_OPTIONS.find((c) => c.id === id) ||
    CASE_COLOR_OPTIONS.find((c) => c.id === DEFAULT_CASE_COLOR_ID)
  );
}

export function getCaseColorHex(idOrHex) {
  if (!idOrHex) return getCaseColorById(DEFAULT_CASE_COLOR_ID).hex;
  const byId = CASE_COLOR_OPTIONS.find((c) => c.id === idOrHex);
  if (byId) return byId.hex;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(idOrHex))) {
    return String(idOrHex);
  }
  return getCaseColorById(DEFAULT_CASE_COLOR_ID).hex;
}

export function isLightCaseColor(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Perceived luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72;
}
