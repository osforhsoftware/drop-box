const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const {
  normalizeVariantInventory,
  resolveVariantInventory,
  availableStock,
  productHasAvailableStock,
} = require("./variantInventory");

const CATEGORIES = [
  "Anime", "Gaming", "Luxury", "Minimal", "Nature", "Abstract",
  "Sports", "Travel", "Cars", "Quotes", "Photography", "Premium",
];

const CASE_TYPES = ["silicone", "matte", "transparent", "glass"];

const CASE_TYPE_ALIASES = {
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
};

const COLLECTIONS = [
  "Essentials", "Limited Edition", "Artist Series", "Seasonal", "Collab",
];

const PHONE_BRANDS = [
  "Apple", "Akkukkaa", "Samsung", "OnePlus", "Vivo", "Oppo", "Xiaomi", "Google",
];

/** Shop listing type: pre-designed art vs blank/original case (customizable). */
const PRODUCT_TYPES = ["customized", "original"];

function normalizedProductType(val) {
  const t = String(val || "").trim().toLowerCase();
  return PRODUCT_TYPES.includes(t) ? t : "customized";
}

function productTypeFilterClause(type) {
  const t = normalizedProductType(type);
  if (t === "original") return { product_type: "original" };
  return {
    $or: [
      { product_type: "customized" },
      { product_type: { $exists: false } },
      { product_type: null },
      { product_type: "" },
    ],
  };
}

function caseTypeFilterClause(caseType) {
  const slug = String(caseType || "").trim().toLowerCase();
  const aliases = CASE_TYPE_ALIASES[slug];
  return aliases ? { case_type: { $in: aliases } } : { case_type: slug };
}

function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "template";
}

function parseTags(raw) {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parseTags(parsed);
    } catch {
      /* fall through */
    }
    return raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
  }
  return [];
}

function parsePhoneModels(raw) {
  if (Array.isArray(raw)) return raw.map((m) => String(m).trim()).filter(Boolean).slice(0, 50);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsePhoneModels(parsed);
    } catch {
      /* fall through */
    }
    return raw.split(",").map((m) => m.trim()).filter(Boolean).slice(0, 50);
  }
  return [];
}

function parseNumber(val, fallback = null) {
  if (val == null || val === "") return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(val, fallback = false) {
  if (val === undefined || val === null) return fallback;
  return val === true || val === "true" || val === "1";
}

function effectivePrice(item) {
  const sale = parseNumber(item.sale_price);
  const regular = parseNumber(item.price, 0);
  if (sale != null && sale > 0 && sale < regular) return sale;
  return regular;
}

/** Strip host from stored upload URLs so clients resolve via their own backend URL. */
function toRelativeMediaUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("data:")) return url;
  const match = url.match(/\/api\/(uploads\/[^?#]+)/);
  if (match) return `/api/${match[1]}`;
  if (url.startsWith("/api/uploads/")) return url;
  if (url.startsWith("uploads/")) return `/api/${url}`;
  return url;
}

/** True when a template product is in the admin trash bin. */
function isTrashed(item) {
  const ts = item?.trashed_at;
  return typeof ts === "string" ? ts.trim().length > 0 : Boolean(ts);
}

/** Mongo filter: active (not trashed) template products. */
function notTrashedClause() {
  return {
    $or: [
      { trashed_at: { $exists: false } },
      { trashed_at: null },
      { trashed_at: "" },
    ],
  };
}

/** Mongo filter: items in the admin trash bin. */
function trashedClause() {
  return { trashed_at: { $exists: true, $nin: [null, ""] } };
}

/** Mongo filter for public shop listings (published + not trashed). */
function publishedShopClause(extra = {}) {
  return { status: "published", ...notTrashedClause(), ...extra };
}

function buildListFilter(query) {
  const clauses = [];
  const status = query.status || "published";
  if (status !== "all") clauses.push({ status });

  clauses.push(notTrashedClause());

  if (query.phone_brand) {
    clauses.push({
      $or: [
        { phone_brand: query.phone_brand },
        { "compatibility.brand": query.phone_brand },
        { "compatibility.brand": { $regex: new RegExp(`^${escapeRegExp(query.phone_brand)}$`, "i") } },
      ],
    });
  }
  if (query.category) clauses.push({ category: query.category });
  if (query.collection) clauses.push({ collection: query.collection });
  if (query.case_type) clauses.push(caseTypeFilterClause(query.case_type));
  if (query.product_type) clauses.push(productTypeFilterClause(query.product_type));

  if (query.featured === "true") clauses.push({ featured: true });
  if (query.best_seller === "true") clauses.push({ best_seller: true });
  if (query.new_arrival === "true") clauses.push({ new_arrival: true });

  if (query.phone_model) {
    clauses.push({
      $or: [
        { phone_models: { $in: [query.phone_model] } },
        { "compatibility.models": { $in: [query.phone_model] } },
      ],
    });
  }

  const minPrice = parseNumber(query.min_price);
  const maxPrice = parseNumber(query.max_price);
  if (minPrice != null || maxPrice != null) {
    const price = {};
    if (minPrice != null) price.$gte = minPrice;
    if (maxPrice != null) price.$lte = maxPrice;
    clauses.push({ price });
  }

  if (query.in_stock === "true") {
    clauses.push({
      $or: [
        { stock: { $gt: 0 } },
        {
          variant_inventory: {
            $elemMatch: {
              is_out_of_stock: { $ne: true },
              stock_quantity: { $gt: 0 },
            },
          },
        },
      ],
    });
  }

  if (query.ids) {
    const ids = String(query.ids)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length) clauses.push({ id: { $in: ids } });
  }

  if (query.search) {
    const q = String(query.search).trim();
    if (q) {
      clauses.push({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } },
        ],
      });
    }
  }

  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function buildAdminListFilter(query) {
  const clauses = [];
  if (query.trash === "true") {
    clauses.push(trashedClause());
  } else {
    clauses.push(notTrashedClause());
  }
  const status = query.status || "all";
  if (status !== "all") clauses.push({ status });

  if (query.phone_brand) {
    clauses.push({
      $or: [
        { phone_brand: query.phone_brand },
        { "compatibility.brand": query.phone_brand },
        { "compatibility.brand": { $regex: new RegExp(`^${escapeRegExp(query.phone_brand)}$`, "i") } },
      ],
    });
  }
  if (query.category) clauses.push({ category: query.category });
  if (query.collection) clauses.push({ collection: query.collection });
  if (query.case_type) clauses.push({ case_type: query.case_type });
  if (query.product_type) clauses.push(productTypeFilterClause(query.product_type));

  if (query.search) {
    const q = String(query.search).trim();
    if (q) {
      clauses.push({
        $or: [
          { title: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
          { tags: { $regex: q, $options: "i" } },
        ],
      });
    }
  }

  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

function buildSort(query) {
  const sort = query.sort || "newest";
  switch (sort) {
    case "popular":
      return { review_count: -1, rating: -1 };
    case "best_selling":
      return { order_count: -1, created_at: -1 };
    case "price_asc":
      return { price: 1 };
    case "price_desc":
      return { price: -1 };
    case "newest":
    default:
      return { created_at: -1 };
  }
}

function normalizeCompatibility(compatibility, fallbackBrand = "", fallbackModels = []) {
  let groups = [];
  if (compatibility != null && compatibility !== "") {
    if (typeof compatibility === "string") {
      try {
        groups = JSON.parse(compatibility);
      } catch {
        groups = [];
      }
    } else if (Array.isArray(compatibility)) {
      groups = compatibility;
    }
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    const singleBrand = String(fallbackBrand || "").trim();
    const singleModels = parsePhoneModels(fallbackModels);
    if (singleBrand || singleModels.length > 0) {
      groups = [{ brand: singleBrand, models: singleModels }];
    } else {
      return [];
    }
  }

  const brandGroupMap = new Map();
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const bName = String(group.brand || group.phone_brand || "").trim();
    if (!bName) continue;
    const key = bName.toLowerCase();
    const models = parsePhoneModels(group.models || group.phone_models);
    if (!brandGroupMap.has(key)) {
      brandGroupMap.set(key, { brand: bName, models: [] });
    }
    const entry = brandGroupMap.get(key);
    for (const m of models) {
      if (!entry.models.some((existing) => existing.toLowerCase() === m.toLowerCase())) {
        entry.models.push(m);
      }
    }
  }

  return Array.from(brandGroupMap.values());
}

function parseCompatibility(rawCompatibility, rawBrand, rawModels, options = {}) {
  let groups = [];
  if (rawCompatibility != null && rawCompatibility !== "") {
    if (typeof rawCompatibility === "string") {
      try {
        groups = JSON.parse(rawCompatibility);
      } catch {
        return { error: "compatibility must be a valid JSON array" };
      }
    } else if (Array.isArray(rawCompatibility)) {
      groups = rawCompatibility;
    } else {
      return { error: "compatibility must be an array" };
    }
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    const singleBrand = String(rawBrand || "").trim();
    const singleModels = parsePhoneModels(rawModels);
    if (singleBrand || singleModels.length > 0) {
      groups = [{ brand: singleBrand, models: singleModels }];
    }
  }

  if (!Array.isArray(groups) || groups.length === 0) {
    return { error: "Phone brand is required" };
  }

  const brandGroupMap = new Map();
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const bName = String(group.brand || group.phone_brand || "").trim();
    if (!bName) continue;
    const key = bName.toLowerCase();
    const models = parsePhoneModels(group.models || group.phone_models);
    if (!brandGroupMap.has(key)) {
      brandGroupMap.set(key, { brand: bName, models: [] });
    }
    const entry = brandGroupMap.get(key);
    for (const m of models) {
      if (!entry.models.some((existing) => existing.toLowerCase() === m.toLowerCase())) {
        entry.models.push(m);
      }
    }
  }

  const normalizedGroups = Array.from(brandGroupMap.values());
  if (!normalizedGroups.length) {
    return { error: "Phone brand is required" };
  }

  const allowedBrands = options.allowedBrands;
  const allowedModels = options.allowedModels;

  if (Array.isArray(allowedBrands) && allowedBrands.length > 0) {
    for (const group of normalizedGroups) {
      const matchedBrand = allowedBrands.find(
        (b) => b.name?.toLowerCase() === group.brand.toLowerCase() || b.id === group.brand
      );
      if (!matchedBrand) {
        return { error: `Brand "${group.brand}" is not in the catalog` };
      }
      group.brand = matchedBrand.name;

      if (Array.isArray(allowedModels) && allowedModels.length > 0 && group.models.length > 0) {
        const brandModels = allowedModels.some((m) => m && m.brand_id)
          ? allowedModels.filter((m) => m.brand_id === matchedBrand.id)
          : allowedModels;

        const validModelNames = new Set(
          brandModels.map((m) => String(m.name || m).trim().toLowerCase())
        );
        const validModelIds = new Set(
          brandModels.map((m) => String(m.id || "").trim()).filter(Boolean)
        );

        for (const model of group.models) {
          const lower = model.toLowerCase();
          if (!validModelNames.has(lower) && !validModelIds.has(model)) {
            return { error: `Model "${model}" is not a valid model for ${group.brand}` };
          }
        }
      }
    }
  }

  return { value: normalizedGroups };
}


function parseMaterialVariants(rawVariants, options = {}, primaryCaseType = "") {
  if (rawVariants == null || rawVariants === "") return { value: [] };
  let list = [];
  if (typeof rawVariants === "string") {
    try {
      list = JSON.parse(rawVariants);
    } catch {
      return { error: "material_variants must be a valid JSON array" };
    }
  } else if (Array.isArray(rawVariants)) {
    list = rawVariants;
  } else {
    return { error: "material_variants must be an array" };
  }

  const allowedCaseTypes = options.allowedCaseTypes;
  const primaryKey = primaryCaseType ? String(primaryCaseType).trim().toLowerCase().replace(/-case$/, "") : "";
  const seenTypes = new Set();
  if (primaryKey) seenTypes.add(primaryKey);

  const parsed = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const case_type = String(item.case_type || "").trim().toLowerCase();
    if (!case_type) return { error: "Each material variant must have a case_type" };

    const cKey = case_type.replace(/-case$/, "");
    if (seenTypes.has(cKey)) {
      return { error: `Duplicate material variant: ${case_type}` };
    }
    seenTypes.add(cKey);

    if (Array.isArray(allowedCaseTypes) && allowedCaseTypes.length > 0) {
      if (!allowedCaseTypes.includes(case_type) && !allowedCaseTypes.includes(cKey)) {
        return { error: `Variant case_type "${case_type}" is not an allowed case type` };
      }
    }

    const price = parseNumber(item.price);
    if (price == null || price <= 0) {
      return { error: `Material variant "${case_type}" requires a valid price greater than 0` };
    }

    const sale_price = parseNumber(item.sale_price);
    const stock = Math.max(0, parseInt(item.stock, 10) || 0);

    let phone_models = [];
    if (Array.isArray(item.phone_models)) {
      phone_models = parsePhoneModels(item.phone_models);
    }

    let compatibility = [];
    if (item.compatibility) {
      const compatRes = parseCompatibility(item.compatibility, item.phone_brand, phone_models, options);
      if (compatRes.error) return { error: compatRes.error };
      compatibility = compatRes.value;
    }

    let effStock = stock;
    let variant_inventory = [];
    if (item.variant_inventory != null && item.variant_inventory !== "") {
      const allVariantModels = phone_models.length > 0 ? phone_models : (compatibility.flatMap((g) => g.models) || []);
      const invRes = normalizeVariantInventory(item.variant_inventory, allVariantModels, stock);
      if (invRes.error) return { error: invRes.error };
      variant_inventory = invRes.value;
      effStock = availableStock(variant_inventory) || stock;
    }

    parsed.push({
      id: item.id ? String(item.id).trim() : null,
      case_type,
      material: String(item.material || "").trim(),
      case_type_label: item.case_type_label ? String(item.case_type_label).trim() : null,
      price,
      sale_price: sale_price != null && sale_price > 0 ? sale_price : null,
      stock: effStock,
      variant_inventory,
      sku: String(item.sku || "").trim().slice(0, 64) || null,
      description: String(item.description || "").trim(),
      short_description: String(item.short_description || "").trim().slice(0, 300),
      status: item.status === "draft" ? "draft" : "published",
      is_default: item.is_default !== undefined ? parseBool(item.is_default) : undefined,
      phone_models,
      compatibility,
      thumbnail: item.thumbnail || null,
      images: Array.isArray(item.images) ? item.images : null,
    });
  }

  return { value: parsed };
}

function parseFormFields(body, options = {}) {
  const title = String(body.title || "").trim();
  if (!title) return { error: "Title is required" };

  const price = parseNumber(body.price);
  if (price == null || price <= 0) return { error: "Valid price is required" };

  const case_type = String(body.case_type || "").trim().toLowerCase();
  if (!case_type) return { error: "Case type is required" };

  const allowedCaseTypes = options.allowedCaseTypes;
  if (Array.isArray(allowedCaseTypes)) {
    if (!allowedCaseTypes.length) {
      return { error: "No case types configured. Add them in Case Types / Categories." };
    }
    if (!allowedCaseTypes.includes(case_type)) {
      return { error: `case_type must be one of: ${allowedCaseTypes.join(", ")}` };
    }
  }

  const category = String(body.category || "").trim();
  if (category && !CATEGORIES.includes(category)) {
    return { error: `Invalid category` };
  }

  const product_type = normalizedProductType(body.product_type);

  const compatResult = parseCompatibility(
    body.compatibility,
    body.phone_brand,
    body.phone_models,
    options
  );
  if (compatResult.error) return { error: compatResult.error };
  const compatibility = compatResult.value;
  const phone_brand = compatibility[0]?.brand || "";
  const phone_models = [...new Set(compatibility.flatMap((g) => g.models))];

  const inventory = inventoryFields(body, phone_models);
  if (inventory.error) return { error: inventory.error };

  let material_variants = undefined;
  if (body.material_variants != null && body.material_variants !== "") {
    const varResult = parseMaterialVariants(body.material_variants, options, case_type);
    if (varResult.error) return { error: varResult.error };
    material_variants = varResult.value;
  }

  return {
    title,
    slug: body.slug ? slugify(body.slug) : slugify(title),
    product_type,
    description: String(body.description || "").trim(),
    short_description: String(body.short_description || "").trim().slice(0, 300),
    phone_brand,
    phone_models,
    compatibility,
    category: category || "Minimal",
    collection: String(body.collection || "").trim() || "Essentials",
    case_type,
    material: String(body.material || "").trim(),
    price,
    sale_price: parseNumber(body.sale_price),
    stock: inventory.stock,
    variant_inventory: inventory.variant_inventory,
    sku: String(body.sku || "").trim().slice(0, 64) || null,
    tags: parseTags(body.tags),
    featured: parseBool(body.featured),
    best_seller: parseBool(body.best_seller),
    new_arrival: parseBool(body.new_arrival, true),
    status: body.status === "draft" ? "draft" : "published",
    ...(body.is_default !== undefined ? { is_default: parseBool(body.is_default) } : {}),
    rating: Math.min(5, Math.max(0, parseNumber(body.rating, 4.5))),
    review_count: Math.max(0, Math.floor(parseNumber(body.review_count, 0))),
    ...(material_variants !== undefined ? { material_variants } : {}),
    seo: {
      meta_title: String(body.meta_title || "").trim().slice(0, 120) || null,
      meta_description: String(body.meta_description || "").trim().slice(0, 300) || null,
      keywords: String(body.keywords || "").trim().slice(0, 200) || null,
      og_image: String(body.og_image || "").trim() || null,
      canonical_url: String(body.canonical_url || "").trim() || null,
    },
  };
}

function stripCopyTitleSuffix(title) {
  return String(title || "").replace(/(\s*\(Copy(?:\s+\d+)?\))+$/i, "").trim();
}

/** Strip repeated "-copy" suffixes from duplicated template slugs. */
function stripCopySlugSuffix(slug) {
  return String(slug || "").replace(/(-copy)+$/i, "");
}

function displayTemplateTitle(title) {
  if (!title) return "";
  const base = stripCopyTitleSuffix(title);
  if (!/\(Copy/i.test(title)) return String(title).trim();
  const numbered = String(title).match(/\(Copy\s+(\d+)\)\s*$/i);
  if (numbered) return `${base} (Copy ${numbered[1]})`;
  return `${base} (Copy)`;
}

function inventoryFields(body, phoneModelsOverride = null) {
  const phone_models = phoneModelsOverride || parsePhoneModels(body.phone_models);
  const fallbackStock = Math.max(0, Math.floor(parseNumber(body.stock, 0)));
  if (!phone_models.length) {
    return { stock: fallbackStock, variant_inventory: [] };
  }
  if (body.variant_inventory != null && body.variant_inventory !== "") {
    const parsed = normalizeVariantInventory(body.variant_inventory, phone_models, fallbackStock);
    if (parsed.error) return { error: parsed.error };
    return {
      stock: availableStock(parsed.value),
      variant_inventory: parsed.value,
    };
  }
  const variant_inventory = normalizeVariantInventory([], phone_models, fallbackStock).value;
  return {
    stock: availableStock(variant_inventory),
    variant_inventory,
  };
}

/** Local upload filename for a template-product image URL, or null for external media. */
function templateProductUploadFilename(imageUrl) {
  const match = String(imageUrl || "").match(/uploads\/template-products\/([^/?#]+)/i);
  if (!match) return null;
  let filename = match[1];
  try {
    filename = decodeURIComponent(filename);
  } catch {
    return null;
  }
  if (!filename || filename !== path.basename(filename)) return null;
  if (filename === "." || filename === ".." || filename.includes("\0")) return null;
  return filename;
}

/** Thumbnail, gallery, and SEO image URLs stored on a template product. */
function collectTemplateProductMediaUrls(product) {
  const urls = [];
  const push = (url) => {
    if (typeof url === "string" && url && !urls.includes(url)) urls.push(url);
  };
  if (!product) return urls;
  push(product.thumbnail);
  if (Array.isArray(product.images)) {
    for (const url of product.images) push(url);
  }
  push(product.seo?.og_image);
  return urls;
}

function remapTemplateProductMediaUrl(url, filenameMap) {
  if (typeof url !== "string" || !url) return url;
  const filename = templateProductUploadFilename(url);
  if (!filename || !filenameMap.has(filename)) return url;
  return url.replace(
    /uploads\/template-products\/[^/?#]+/i,
    `uploads/template-products/${filenameMap.get(filename)}`
  );
}

function applyClonedTemplateProductMedia(product, filenameMap) {
  const images = Array.isArray(product?.images)
    ? product.images.map((url) => remapTemplateProductMediaUrl(url, filenameMap))
    : [];
  const thumbnail = product?.thumbnail
    ? remapTemplateProductMediaUrl(product.thumbnail, filenameMap)
    : images[0] || null;
  let seo = product?.seo;
  if (seo && typeof seo === "object") {
    seo = {
      ...seo,
      og_image: seo.og_image ? remapTemplateProductMediaUrl(seo.og_image, filenameMap) : seo.og_image,
    };
  }
  return { thumbnail, images, seo };
}

/**
 * Copy local template-product uploads so a duplicate does not share files with the source.
 * Missing or external URLs stay unchanged. Thumbnail, gallery, and og_image that pointed at
 * the same source file keep pointing at one new file.
 */
function cloneTemplateProductMedia(product, options = {}) {
  if (!options.uploadDir) {
    throw new Error("uploadDir is required to clone template product media");
  }
  const fsImpl = options.fs || fs;
  const randomUUID = options.randomUUID || (() => crypto.randomUUID());
  const filenameMap = new Map();
  const copied = [];
  const dir = path.join(options.uploadDir, "template-products");
  fsImpl.mkdirSync(dir, { recursive: true });

  try {
    for (const url of collectTemplateProductMediaUrls(product)) {
      const filename = templateProductUploadFilename(url);
      if (!filename || filenameMap.has(filename)) continue;
      const src = path.join(dir, filename);
      if (!fsImpl.existsSync(src)) continue;
      const nextName = `${String(randomUUID()).replace(/-/g, "")}${path.extname(filename)}`;
      const dest = path.join(dir, nextName);
      fsImpl.copyFileSync(src, dest);
      copied.push(dest);
      filenameMap.set(filename, nextName);
    }
  } catch (err) {
    for (const dest of copied) {
      try {
        fsImpl.unlinkSync(dest);
      } catch {
        /* ignore cleanup failure */
      }
    }
    throw err;
  }

  return applyClonedTemplateProductMedia(product, filenameMap);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Mongo filter for other products that still store this template-product upload. */
function templateProductMediaReferenceQuery(imageUrl, excludeIds = []) {
  const filename = templateProductUploadFilename(imageUrl);
  if (!filename) return null;
  const pattern = new RegExp(
    `uploads/template-products/${escapeRegExp(filename)}(?:$|[?#])`,
    "i"
  );
  const clause = {
    $or: [
      { thumbnail: pattern },
      { images: pattern },
      { "seo.og_image": pattern },
    ],
  };
  const ids = (Array.isArray(excludeIds) ? excludeIds : [excludeIds]).filter(Boolean);
  if (!ids.length) return clause;
  return { $and: [clause, { id: { $nin: ids } }] };
}

/** True when some product outside excludeIds still references the same upload file. */
function templateProductMediaIsShared(imageUrl, products, excludeIds = []) {
  const filename = templateProductUploadFilename(imageUrl);
  if (!filename) return false;
  const excluded = new Set(
    (Array.isArray(excludeIds) ? excludeIds : [excludeIds]).filter(Boolean)
  );
  return (products || []).some((product) => {
    if (!product || excluded.has(product.id)) return false;
    return collectTemplateProductMediaUrls(product).some(
      (url) => templateProductUploadFilename(url) === filename
    );
  });
}

function toPublicProduct(doc) {
  if (!doc || isTrashed(doc) || doc.status !== "published") return null;
  const { _id, ...rest } = doc;
  const compatibility = normalizeCompatibility(rest.compatibility, rest.phone_brand, rest.phone_models);
  const allModels = Array.isArray(rest.phone_models) && rest.phone_models.length > 0
    ? rest.phone_models
    : [...new Set(compatibility.flatMap((g) => g.models || []))];
  const variants = resolveVariantInventory({ ...doc, phone_models: allModels });
  const product = {
    ...rest,
    title: displayTemplateTitle(rest.title),
    product_type: normalizedProductType(rest.product_type),
    phone_brand: rest.phone_brand || compatibility[0]?.brand || "",
    phone_models: allModels,
    compatibility,
    variants,
    in_stock: productHasAvailableStock({ ...doc, variant_inventory: variants }),
    effective_price: effectivePrice(doc),
    discount_percent: doc.sale_price && doc.price > doc.sale_price
      ? Math.round((1 - doc.sale_price / doc.price) * 100)
      : 0,
  };
  if (product.thumbnail) product.thumbnail = toRelativeMediaUrl(product.thumbnail);
  if (Array.isArray(product.images)) {
    product.images = product.images.map(toRelativeMediaUrl);
  }
  if (product.seo?.og_image) {
    product.seo = { ...product.seo, og_image: toRelativeMediaUrl(product.seo.og_image) };
  }
  return product;
}

function humanizeCaseType(slug) {
  const key = String(slug || "").trim().replace(/-case$/i, "").replace(/-/g, " ");
  if (!key) return "";
  const titled = key.replace(/\b\w/g, (letter) => letter.toUpperCase());
  return /case$/i.test(titled) ? titled : `${titled} Case`;
}

function getUpdatedTemplateTitle(template, selectedVariant, selectedProduct) {
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
    || (selectedVariant?.case_type ? humanizeCaseType(selectedVariant.case_type) : "");

  if (!newMaterialName) return baseTitle;

  const baseCaseType = String(template.case_type || "").trim();
  const baseCaseLabel = humanizeCaseType(baseCaseType);
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

module.exports = {
  CATEGORIES,
  CASE_TYPES,
  COLLECTIONS,
  PHONE_BRANDS,
  PRODUCT_TYPES,
  normalizedProductType,
  productTypeFilterClause,
  caseTypeFilterClause,
  slugify,
  parseFormFields,
  parseCompatibility,
  normalizeCompatibility,
  parseMaterialVariants,
  parseTags,
  parsePhoneModels,
  buildListFilter,
  buildAdminListFilter,
  buildSort,
  effectivePrice,
  CASE_TYPE_ALIASES,
  isTrashed,
  notTrashedClause,
  trashedClause,
  publishedShopClause,
  displayTemplateTitle,
  getUpdatedTemplateTitle,
  stripCopyTitleSuffix,
  stripCopySlugSuffix,
  toRelativeMediaUrl,
  toPublicProduct,
  templateProductUploadFilename,
  collectTemplateProductMediaUrls,
  cloneTemplateProductMedia,
  templateProductMediaReferenceQuery,
  templateProductMediaIsShared,
};
