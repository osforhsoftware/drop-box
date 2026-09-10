export const TEMPLATE_CATEGORIES = [
  "Anime", "Gaming", "Luxury", "Minimal", "Nature", "Abstract",
  "Sports", "Travel", "Cars", "Quotes", "Photography", "Premium",
];

export const TEMPLATE_CASE_TYPES = [
  { slug: "silicone", label: "Silicone" },
  { slug: "matte", label: "Matte" },
  { slug: "transparent", label: "Transparent" },
  { slug: "glass", label: "Glass" },
];

export const TEMPLATE_COLLECTIONS = [
  "Essentials", "Limited Edition", "Artist Series", "Seasonal", "Collab",
];

export const TEMPLATE_PHONE_BRANDS = [
  "Apple", "Akkukkaa", "Samsung", "OnePlus", "Vivo", "Oppo", "Xiaomi", "Google",
];

export const TEMPLATE_PRODUCT_TYPES = [
  { slug: "customized", label: "Customized Phone Case" },
  { slug: "original", label: "Original Phone Case" },
];

export const TEMPLATE_PRODUCT_TYPE_SECTIONS = [
  {
    slug: "customized",
    label: "Customized Case Templates",
    eyebrow: "Pre-designed",
    description: "Ready-made designs with art already on the case — pick your phone and order instantly.",
  },
  {
    slug: "original",
    label: "Original Case Covers",
    eyebrow: "Blank cases",
    description: "Clean original cases with no print — order as-is for a minimal look.",
  },
];

/** Product color tags — Green uses the CASEBOX logo color (#6DB161). */
export const LOGO_COLOR_OPTIONS = [
  "Orange",
  "Black",
  "White",
  "Red",
  "Blue",
  "Green",
  "Gold",
  "Silver",
  "Pink",
  "Purple",
];

export const TEMPLATE_TAG_SUGGESTIONS = ["Green", "Black", "White", "Matte", "New Arrival"];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "best_selling", label: "Best Selling" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export function formatPrice(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export function caseTypeLabel(slug) {
  return TEMPLATE_CASE_TYPES.find((c) => c.slug === slug)?.label || slug;
}

export function productTypeLabel(slug) {
  return TEMPLATE_PRODUCT_TYPES.find((t) => t.slug === slug)?.label || slug;
}

/** Normalize API value — missing type defaults to customized. */
export function normalizeProductType(slug) {
  const t = String(slug || "").trim().toLowerCase();
  return TEMPLATE_PRODUCT_TYPES.some((p) => p.slug === t) ? t : "customized";
}

/** Normalize titles that accumulated repeated " (Copy)" suffixes from re-duplication. */
export function displayTemplateTitle(title) {
  if (!title) return "";
  const base = String(title).replace(/(\s*\(Copy(?:\s+\d+)?\))+$/i, "").trim();
  if (!/\(Copy/i.test(title)) return String(title).trim();
  const numbered = String(title).match(/\(Copy\s+(\d+)\)\s*$/i);
  if (numbered) return `${base} (Copy ${numbered[1]})`;
  return `${base} (Copy)`;
}

/** Recommended upload size for shop / showcase product images (matches 5:4 card frame). */
export const TEMPLATE_THUMB_SPEC = {
  width: 800,
  height: 640,
  ratio: "5:4",
  formats: "JPG, PNG, or WEBP",
  maxSize: "2 MB",
  hint: "800 × 640 px (5:4). Center the phone case. Use a dark (#111) or transparent background.",
};
