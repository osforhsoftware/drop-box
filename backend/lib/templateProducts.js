const CATEGORIES = [
  "Anime", "Gaming", "Luxury", "Minimal", "Nature", "Abstract",
  "Sports", "Travel", "Cars", "Quotes", "Photography", "Premium",
];

const CASE_TYPES = ["silicone", "matte", "transparent", "glass"];

const CASE_TYPE_ALIASES = {
  silicone: ["silicone", "silicone-case"],
  "silicone-case": ["silicone", "silicone-case"],
  matte: ["matte", "matte-case"],
  "matte-case": ["matte", "matte-case"],
  transparent: ["transparent", "transparent-case"],
  "transparent-case": ["transparent", "transparent-case"],
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

  if (query.phone_brand) clauses.push({ phone_brand: query.phone_brand });
  if (query.category) clauses.push({ category: query.category });
  if (query.collection) clauses.push({ collection: query.collection });
  if (query.case_type) clauses.push(caseTypeFilterClause(query.case_type));
  if (query.product_type) clauses.push(productTypeFilterClause(query.product_type));

  if (query.featured === "true") clauses.push({ featured: true });
  if (query.best_seller === "true") clauses.push({ best_seller: true });
  if (query.new_arrival === "true") clauses.push({ new_arrival: true });

  if (query.phone_model) {
    clauses.push({ phone_models: { $in: [query.phone_model] } });
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
    clauses.push({ stock: { $gt: 0 } });
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

  if (query.phone_brand) clauses.push({ phone_brand: query.phone_brand });
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

  return {
    title,
    slug: body.slug ? slugify(body.slug) : slugify(title),
    product_type,
    description: String(body.description || "").trim(),
    short_description: String(body.short_description || "").trim().slice(0, 300),
    phone_brand: String(body.phone_brand || "").trim(),
    phone_models: parsePhoneModels(body.phone_models),
    category: category || "Minimal",
    collection: String(body.collection || "").trim() || "Essentials",
    case_type,
    material: String(body.material || "").trim(),
    price,
    sale_price: parseNumber(body.sale_price),
    stock: Math.max(0, Math.floor(parseNumber(body.stock, 0))),
    sku: String(body.sku || "").trim().slice(0, 64) || null,
    tags: parseTags(body.tags),
    featured: parseBool(body.featured),
    best_seller: parseBool(body.best_seller),
    new_arrival: parseBool(body.new_arrival, true),
    status: body.status === "draft" ? "draft" : "published",
    rating: Math.min(5, Math.max(0, parseNumber(body.rating, 4.5))),
    review_count: Math.max(0, Math.floor(parseNumber(body.review_count, 0))),
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

function toPublicProduct(doc) {
  if (!doc || isTrashed(doc) || doc.status !== "published") return null;
  const { _id, ...rest } = doc;
  const product = {
    ...rest,
    title: displayTemplateTitle(rest.title),
    product_type: normalizedProductType(rest.product_type),
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
  parseTags,
  parsePhoneModels,
  buildListFilter,
  buildAdminListFilter,
  buildSort,
  effectivePrice,
  isTrashed,
  notTrashedClause,
  trashedClause,
  publishedShopClause,
  displayTemplateTitle,
  stripCopyTitleSuffix,
  stripCopySlugSuffix,
  toRelativeMediaUrl,
  toPublicProduct,
};
