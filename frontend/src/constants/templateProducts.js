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

export function listVariants(product) {
  if (Array.isArray(product?.variants) && product.variants.length) return product.variants;
  if (Array.isArray(product?.variant_inventory) && product.variant_inventory.length) {
    return product.variant_inventory;
  }
  return [];
}

export function variantForModel(product, modelName) {
  const name = String(modelName || "").trim().toLowerCase();
  if (!name) return null;
  return listVariants(product).find(
    (variant) => String(variant.model_name || "").trim().toLowerCase() === name
  ) || null;
}

export function isVariantOutOfStock(variant) {
  if (!variant) return false;
  return variant.is_out_of_stock === true || Number(variant.stock_quantity) <= 0;
}

/** True only when this phone model itself has no stock. Other models are ignored. */
export function isModelOutOfStock(product, modelName) {
  const variants = listVariants(product);
  if (modelName) {
    const variant = variantForModel(product, modelName);
    if (variant) return isVariantOutOfStock(variant);
    if (variants.length) return false;
    return Number(product?.stock) <= 0;
  }
  if (variants.length) return variants.every(isVariantOutOfStock);
  return Number(product?.stock) <= 0;
}

export function productHasAvailableStock(product) {
  const variants = listVariants(product);
  if (variants.length) return variants.some((variant) => !isVariantOutOfStock(variant));
  return Number(product?.stock) > 0;
}

export function listMaterialVariants(product) {
  if (Array.isArray(product?.material_variants) && product.material_variants.length) {
    return product.material_variants;
  }
  if (!product) return [];
  return [{
    id: product.id,
    slug: product.slug,
    case_type: product.case_type,
    case_type_label: caseTypeLabel(product.case_type),
    material: product.material || "",
    price: product.price,
    sale_price: product.sale_price ?? null,
    effective_price: product.effective_price ?? product.sale_price ?? product.price,
    discount_percent: product.discount_percent || 0,
    description: product.description || "",
    short_description: product.short_description || "",
    sku: product.sku || null,
    stock: product.stock,
    in_stock: productHasAvailableStock(product),
    variants: listVariants(product),
    thumbnail: null,
    images: null,
    has_variant_image: false,
  }];
}

export function listingPrice(product) {
  return product?.starting_price ?? product?.effective_price ?? product?.sale_price ?? product?.price;
}

export function listingPriceIsFrom(product) {
  return Boolean(product?.price_from) && Number(product?.material_count) > 1;
}

export function productFromMaterial(template, variant) {
  if (!template) return null;
  if (!variant || variant.id === template.id) {
    return {
      ...template,
      effective_price: variant?.effective_price ?? template.effective_price ?? template.sale_price ?? template.price,
      variants: variant?.variants || template.variants,
      variant_inventory: variant?.variants || template.variant_inventory,
    };
  }
  return {
    ...template,
    id: variant.id,
    slug: variant.slug,
    case_type: variant.case_type,
    material: variant.material,
    price: variant.price,
    sale_price: variant.sale_price,
    effective_price: variant.effective_price,
    discount_percent: variant.discount_percent,
    description: variant.description,
    short_description: variant.short_description,
    sku: variant.sku,
    stock: variant.stock,
    in_stock: variant.in_stock,
    variants: variant.variants,
    variant_inventory: variant.variants,
    thumbnail: variant.has_variant_image && variant.thumbnail ? variant.thumbnail : template.thumbnail,
    images: variant.has_variant_image && variant.images?.length ? variant.images : template.images,
  };
}

export function maxPurchasableQuantity(product, modelName) {
  const variants = listVariants(product);
  if (modelName) {
    const variant = variantForModel(product, modelName);
    if (variant) {
      if (isVariantOutOfStock(variant)) return 0;
      return Math.max(0, Number(variant.stock_quantity) || 0);
    }
    if (variants.length) return 0;
  }
  if (variants.length) {
    return variants.reduce((sum, variant) => (
      isVariantOutOfStock(variant) ? sum : sum + Math.max(0, Number(variant.stock_quantity) || 0)
    ), 0);
  }
  return Math.max(0, Number(product?.stock) || 0);
}

export function materialLabel(item) {
  return item?.product?.name
    || item?.template_product?.material
    || caseTypeLabel(item?.template_product?.case_type || item?.case_type)
    || "";
}

export function syncVariantRows(modelNames, currentRows, fallbackStock = 0) {
  const rows = Array.isArray(currentRows) ? currentRows : [];
  return (modelNames || []).map((modelName) => {
    const model_name = String(modelName).trim();
    const existing = rows.find(
      (row) => String(row.model_name || "").trim().toLowerCase() === model_name.toLowerCase()
    );
    if (existing) {
      const stock_quantity = existing.stock_quantity ?? 0;
      return {
        variant_id: existing.variant_id,
        model_name,
        stock_quantity: String(stock_quantity),
        is_out_of_stock: existing.is_out_of_stock === true || Number(stock_quantity) <= 0,
      };
    }
    const seed = rows.length ? rows[rows.length - 1].stock_quantity : fallbackStock;
    const qty = Math.max(0, Math.floor(Number(seed) || 0));
    return {
      model_name,
      stock_quantity: String(qty),
      is_out_of_stock: qty <= 0,
    };
  });
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
