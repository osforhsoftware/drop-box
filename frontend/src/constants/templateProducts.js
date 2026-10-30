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

export const CASE_TYPE_ALIASES = {
  silicone: ["silicone", "silicone-case"],
  "silicone-case": ["silicone", "silicone-case"],
  matte: ["matte", "matte-case", "test-case-type"],
  "matte-case": ["matte", "matte-case", "test-case-type"],
  "test-case-type": ["matte", "matte-case", "test-case-type"],
  transparent: ["transparent", "transparent-case"],
  "transparent-case": ["transparent", "transparent-case"],
  glass: ["glass", "glass-case"],
  "glass-case": ["glass", "glass-case"],
  "oil-green": ["oil-green"],
  gts: ["gts"],
};

export function caseTypeLabel(slug) {
  const s = String(slug || "").toLowerCase().trim();
  if (s === "test-case-type") return "Matte";
  const found = TEMPLATE_CASE_TYPES.find((c) => c.slug === s || c.slug === s.replace(/-case$/, ""));
  if (found) return found.label;
  if (s === "oil-green") return "Oil green";
  return slug || "";
}

export function matchesTemplate(p, caseType) {
  if (!p || !caseType) return false;
  const ct = String(caseType).toLowerCase().trim();
  const ps = String(p.slug || "").toLowerCase().trim();
  const pn = String(p.name || "").toLowerCase().trim();
  if (ps === ct || pn === ct) return true;
  const aliases = CASE_TYPE_ALIASES[ct];
  if (aliases && (aliases.includes(ps) || aliases.includes(pn))) return true;
  const pAliases = CASE_TYPE_ALIASES[ps];
  if (pAliases && (pAliases.includes(ct) || pAliases.includes(pn))) return true;
  const ctNorm = ct.replace(/-case$/, "");
  const psNorm = ps.replace(/-case$/, "");
  if (ctNorm && psNorm && ctNorm === psNorm) return true;
  return false;
}

export function normalizeProductCompatibility(product) {
  if (!product) return [];
  if (Array.isArray(product.compatibility) && product.compatibility.length > 0) {
    return product.compatibility;
  }
  const brand = String(product.phone_brand || "").trim();
  const models = Array.isArray(product.phone_models) ? product.phone_models : [];
  if (brand || models.length > 0) {
    return [{ brand, models }];
  }
  return [];
}

export function isMaterialCompatibleWithModel(variant, model, parentTemplate = null) {
  if (!variant || !model) return false;
  if (variant.status && variant.status !== "published") return false;

  let targetModels = null;
  if (Array.isArray(variant.phone_models) && variant.phone_models.length > 0) {
    targetModels = variant.phone_models;
  } else if (Array.isArray(variant.compatibility) && variant.compatibility.length > 0) {
    targetModels = variant.compatibility.flatMap((g) => g.models || []);
  } else if (parentTemplate && !Array.isArray(parentTemplate)) {
    if (Array.isArray(parentTemplate.phone_models) && parentTemplate.phone_models.length > 0) {
      targetModels = parentTemplate.phone_models;
    } else if (Array.isArray(parentTemplate.compatibility) && parentTemplate.compatibility.length > 0) {
      targetModels = parentTemplate.compatibility.flatMap((g) => g.models || []);
    }
  }

  if (targetModels && targetModels.length > 0) {
    const modelNameLower = String(model?.name || model || "").trim().toLowerCase();
    const modelIdLower = String(model?.id || "").trim().toLowerCase();
    const isModelInVariant = targetModels.some((m) => {
      const s = String(m).trim().toLowerCase();
      return s === modelNameLower || s === modelIdLower;
    });
    if (!isModelInVariant) return false;
  }

  return true;
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
    title: product.title,
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

export function getDesignCompatibility(template) {
  if (!template) return [];
  const variants = Array.isArray(template?.material_variants) ? template.material_variants : [];
  const allItems = [template, ...variants];
  const brandMap = new Map();

  for (const item of allItems) {
    if (!item || (item.status && item.status !== "published")) continue;
    const compats = normalizeProductCompatibility(item);
    for (const group of compats) {
      const bName = String(group.brand || "").trim();
      if (!bName) continue;
      const key = bName.toLowerCase();
      if (!brandMap.has(key)) {
        brandMap.set(key, { brand: bName, models: [] });
      }
      const entry = brandMap.get(key);
      const models = Array.isArray(group.models) ? group.models : [];
      for (const m of models) {
        const mStr = String(m || "").trim();
        if (mStr && !entry.models.some((x) => x.toLowerCase() === mStr.toLowerCase())) {
          entry.models.push(mStr);
        }
      }
    }
  }

  return Array.from(brandMap.values());
}

export function productFromMaterial(template, variant) {
  if (!template) return null;
  if (!variant || variant.id === template.id) {
    const defaultCompat = Array.isArray(template.compatibility) && template.compatibility.length > 0
      ? template.compatibility
      : normalizeProductCompatibility(template);
    return {
      ...template,
      title: variant?.title || template.title,
      effective_price: variant?.effective_price ?? template.effective_price ?? template.sale_price ?? template.price,
      compatibility: defaultCompat,
      variants: variant?.variants || template.variants,
      variant_inventory: variant?.variants || template.variant_inventory,
    };
  }

  const effective = variant.effective_price ?? variant.sale_price ?? variant.price;
  const variantCompat = Array.isArray(variant.compatibility) && variant.compatibility.length > 0
    ? variant.compatibility
    : (variant.phone_brand ? [{ brand: variant.phone_brand, models: variant.phone_models || [] }] : template.compatibility);
  const variantModels = Array.isArray(variant.phone_models) && variant.phone_models.length > 0
    ? variant.phone_models
    : template.phone_models;

  return {
    ...template,
    id: variant.id,
    title: variant.title || template.title,
    slug: variant.slug,
    case_type: variant.case_type,
    case_type_label: variant.case_type_label || template.case_type_label,
    material: variant.material,
    price: variant.price,
    sale_price: variant.sale_price,
    effective_price: effective,
    discount_percent: variant.discount_percent ?? (variant.sale_price && variant.price > variant.sale_price ? Math.round((1 - variant.sale_price / variant.price) * 100) : 0),
    description: variant.description,
    short_description: variant.short_description,
    sku: variant.sku,
    stock: variant.stock,
    in_stock: variant.in_stock,
    phone_brand: variant.phone_brand || template.phone_brand,
    phone_models: variantModels,
    compatibility: variantCompat,
    status: variant.status || template.status,
    variants: variant.variants || template.variants,
    variant_inventory: variant.variants || template.variant_inventory,
    thumbnail: variant.has_variant_image && variant.thumbnail ? variant.thumbnail : template.thumbnail,
    images: variant.has_variant_image && variant.images?.length ? variant.images : template.images,
  };
}

export function getUpdatedTemplateTitle(template, selectedVariant, selectedProduct) {
  if (!template) return "";
  const baseTitle = displayTemplateTitle(template.title);

  if (selectedVariant && selectedVariant.id !== template.id && selectedVariant.title) {
    const variantTitle = displayTemplateTitle(selectedVariant.title);
    if (variantTitle && variantTitle !== baseTitle) {
      return variantTitle;
    }
  }

  const newMaterialName = selectedProduct?.name
    || selectedVariant?.case_type_label
    || (selectedVariant?.case_type ? caseTypeLabel(selectedVariant.case_type) : "");

  if (!newMaterialName) return baseTitle;

  const baseCaseType = String(template.case_type || "").trim();
  const baseCaseLabel = caseTypeLabel(baseCaseType);
  const baseMaterial = String(template.material || "").trim();

  const candidates = [
    baseCaseLabel ? `${baseCaseLabel} Case` : null,
    baseCaseLabel,
    baseCaseType ? `${baseCaseType} case` : null,
    baseCaseType ? `${baseCaseType.replace(/-case$/i, "")} case` : null,
    baseMaterial && baseMaterial.toLowerCase() !== "case" ? `${baseMaterial} Case` : null,
    baseCaseType ? baseCaseType.replace(/-case$/i, "") : null,
    baseMaterial,
  ].filter(Boolean);

  const uniqueCandidates = [];
  for (const c of candidates) {
    const trimmed = String(c).trim();
    if (trimmed && !uniqueCandidates.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
      uniqueCandidates.push(trimmed);
    }
  }

  uniqueCandidates.sort((a, b) => b.length - a.length);

  for (const candidate of uniqueCandidates) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(baseTitle)) {
      let replacement = newMaterialName;
      if (!/case$/i.test(candidate) && /case$/i.test(newMaterialName)) {
        replacement = newMaterialName.replace(/\s+Case$/i, "");
      }
      return baseTitle.replace(regex, replacement).replace(/\s{2,}/g, " ").trim();
    }
  }

  return baseTitle;
}

export const MATERIAL_STANDARD_DESCRIPTIONS = {
  silicone:
    "Crafted from high-grade liquid silicone with a soft microfiber interior lining. Delivers a secure, velvety grip that absorbs everyday drops and bumps, complete with precision cutouts and responsive button covers.",
  transparent:
    "Engineered from optical-grade polycarbonate with anti-yellowing UV resistance and reinforced shock-absorbing edges. Lets your phone's original finish and design show through while guarding against scratches and everyday impact.",
  matte:
    "Finished with a premium satin matte coating that actively resists fingerprints, oils, and surface smudges. Combines a sleek, low-profile silhouette with smooth tactile grip and durable daily edge protection.",
  glass:
    "Constructed with a 9H tempered glass backplate and flexible shock-absorbing TPU borders. Features an ultra-smooth glossy surface with high scratch resistance for a clean, luxury look and premium hand feel.",
  "oil-green":
    "Crafted in a distinctive deep oil-green tone with a tactile soft-touch matte finish. Combines impact-absorbing corner protection with a smudge-resistant surface tailored for comfortable everyday handling.",
};

export function getMaterialStandardDescription(slugOrName) {
  const raw = String(slugOrName || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("transparent") || raw.includes("clear")) return MATERIAL_STANDARD_DESCRIPTIONS.transparent;
  if (raw.includes("silicone")) return MATERIAL_STANDARD_DESCRIPTIONS.silicone;
  if (raw.includes("matte")) return MATERIAL_STANDARD_DESCRIPTIONS.matte;
  if (raw.includes("glass")) return MATERIAL_STANDARD_DESCRIPTIONS.glass;
  if (raw.includes("oil-green") || raw.includes("oil green")) return MATERIAL_STANDARD_DESCRIPTIONS["oil-green"];
  const key = raw.replace(/-case$/i, "");
  return MATERIAL_STANDARD_DESCRIPTIONS[key] || "";
}

function isPlaceholder(desc) {
  if (!desc || typeof desc !== "string") return true;
  const trimmed = desc.trim();
  return !trimmed || /^(963|oky|test|case|placeholder|n\/a)$/i.test(trimmed);
}

function isSubstantialDescription(desc) {
  if (!desc || typeof desc !== "string") return false;
  const trimmed = desc.trim();
  if (trimmed.length < 90) return false;
  if (isPlaceholder(trimmed)) return false;
  return true;
}

export function getUpdatedProductDescription(template, selectedVariant, selectedProduct, isDefaultMaterial) {
  const targetKey =
    selectedProduct?.slug ||
    selectedProduct?.name ||
    selectedVariant?.case_type ||
    selectedVariant?.case_type_label ||
    template?.case_type ||
    "";
  const standardDesc = getMaterialStandardDescription(targetKey);

  if (isDefaultMaterial) {
    const defaultDesc = template?.description || template?.short_description || "";
    if (defaultDesc && !isPlaceholder(defaultDesc)) {
      return defaultDesc;
    }
    return standardDesc || defaultDesc || "";
  }

  if (
    selectedVariant &&
    selectedVariant.id !== template?.id &&
    selectedVariant.description &&
    selectedVariant.description !== template?.description &&
    isSubstantialDescription(selectedVariant.description)
  ) {
    return selectedVariant.description;
  }

  if (selectedProduct?.description && isSubstantialDescription(selectedProduct.description)) {
    return selectedProduct.description;
  }

  if (standardDesc) {
    return standardDesc;
  }

  return (
    selectedProduct?.description ||
    selectedVariant?.description ||
    template?.description ||
    template?.short_description ||
    ""
  );
}

export function getMaterialSpecification(selectedProduct, activeTemplate, template, isDefaultMaterial) {
  if (selectedProduct?.material) return selectedProduct.material;
  if (isDefaultMaterial && (activeTemplate?.material || template?.material)) {
    return activeTemplate?.material || template?.material;
  }
  if (selectedProduct?.name) {
    const n = selectedProduct.name.toLowerCase();
    if (n.includes("silicone")) return "Liquid Silicone";
    if (n.includes("transparent") || n.includes("clear")) return "Polycarbonate";
    if (n.includes("matte")) return "Matte Polycarbonate";
    if (n.includes("glass")) return "Tempered Glass";
    return selectedProduct.name;
  }
  return activeTemplate?.material || template?.material || "Premium UV print";
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
  return item?.template_product?.case_type_label
    || item?.template_product?.material
    || caseTypeLabel(item?.template_product?.case_type)
    || item?.product?.name
    || caseTypeLabel(item?.case_type)
    || "";
}

export function getModelPrice(materialOrTemplate, modelName) {
  if (!materialOrTemplate) return { price: 0, sale_price: null, effective_price: 0 };
  const basePrice = Number(materialOrTemplate.price) || 0;
  const baseSale = (materialOrTemplate.sale_price != null && materialOrTemplate.sale_price !== "")
    ? Number(materialOrTemplate.sale_price)
    : null;
  const variants = listVariants(materialOrTemplate);
  if (modelName && variants.length > 0) {
    const matched = variants.find(
      (v) => String(v.model_name || "").trim().toLowerCase() === String(modelName).trim().toLowerCase()
    );
    if (matched && matched.price != null && matched.price !== "" && Number(matched.price) > 0) {
      const price = Number(matched.price);
      const sale_price = (matched.sale_price != null && matched.sale_price !== "" && Number(matched.sale_price) > 0)
        ? Number(matched.sale_price)
        : null;
      const effective_price = (sale_price != null && sale_price > 0 && sale_price < price)
        ? sale_price
        : price;
      return { price, sale_price: sale_price && sale_price < price ? sale_price : null, effective_price };
    }
  }
  const effective_price = (baseSale != null && baseSale > 0 && baseSale < basePrice)
    ? baseSale
    : (materialOrTemplate.effective_price ?? basePrice);
  return { price: basePrice, sale_price: baseSale && baseSale < basePrice ? baseSale : null, effective_price };
}

export function syncVariantRows(modelNames, currentRows, fallbackStock = 0, fallbackPrice = "", fallbackSalePrice = "", brandMap = {}) {
  const rows = Array.isArray(currentRows) ? currentRows : [];
  return (modelNames || []).map((modelName) => {
    const model_name = String(modelName).trim();
    const existing = rows.find(
      (row) => String(row.model_name || "").trim().toLowerCase() === model_name.toLowerCase()
    );
    const brand = (brandMap && brandMap[model_name]) || existing?.brand || null;
    if (existing) {
      const stock_quantity = existing.stock_quantity ?? 0;
      return {
        variant_id: existing.variant_id,
        model_name,
        brand,
        stock_quantity: String(stock_quantity),
        is_out_of_stock: existing.is_out_of_stock === true || Number(stock_quantity) <= 0,
        price: existing.price != null && existing.price !== "" ? String(existing.price) : "",
        sale_price: existing.sale_price != null && existing.sale_price !== "" ? String(existing.sale_price) : "",
      };
    }
    const seed = rows.length ? rows[rows.length - 1].stock_quantity : fallbackStock;
    const qty = Math.max(0, Math.floor(Number(seed) || 0));
    return {
      model_name,
      brand,
      stock_quantity: String(qty),
      is_out_of_stock: qty <= 0,
      price: fallbackPrice ? String(fallbackPrice) : "",
      sale_price: fallbackSalePrice ? String(fallbackSalePrice) : "",
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
