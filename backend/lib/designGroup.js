const { effectivePrice, toPublicProduct, toRelativeMediaUrl, normalizeCompatibility } = require("./templateProducts");
const { productHasAvailableStock, resolveVariantInventory, isVariantOutOfStock } = require("./variantInventory");

/** Normalize case-type slugs so "silicone" and "silicone-case" count as one material. */
function caseTypeKey(slug) {
  const value = String(slug || "").trim().toLowerCase();
  return value.replace(/-case$/, "") || value;
}

function designGroupKey(product) {
  const designId = String(product?.design_id || "").trim();
  if (designId) return designId;
  return String(product?.id || "");
}

function sameMediaUrl(a, b) {
  return toRelativeMediaUrl(a || "") === toRelativeMediaUrl(b || "");
}

function variantHasOwnImages(variant, canonical) {
  const variantThumb = variant?.thumbnail || variant?.images?.[0] || "";
  const canonicalThumb = canonical?.thumbnail || canonical?.images?.[0] || "";
  if (variantThumb && canonicalThumb && !sameMediaUrl(variantThumb, canonicalThumb)) {
    return true;
  }
  const variantImages = Array.isArray(variant?.images) ? variant.images.filter(Boolean) : [];
  const canonicalImages = Array.isArray(canonical?.images) ? canonical.images.filter(Boolean) : [];
  if (variantImages.length !== canonicalImages.length) {
    return variantImages.length > 0 && variantImages.some((url, i) => !sameMediaUrl(url, canonicalImages[i]));
  }
  return variantImages.some((url, i) => !sameMediaUrl(url, canonicalImages[i]));
}

function pickCanonical(members) {
  const list = (members || []).filter(Boolean);
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    // 1. Explicit in-stock default variant comes first
    const aDef = Boolean(a.is_default && a.status === "published" && productHasAvailableStock(a));
    const bDef = Boolean(b.is_default && b.status === "published" && productHasAvailableStock(b));
    if (aDef && !bDef) return -1;
    if (!aDef && bDef) return 1;

    // 2. Order count
    const ordersB = Number(b.order_count || 0);
    const ordersA = Number(a.order_count || 0);
    if (ordersB !== ordersA) return ordersB - ordersA;

    // 3. Lowest effective price
    const effA = effectivePrice(a);
    const effB = effectivePrice(b);
    if (Number.isFinite(effA) && Number.isFinite(effB) && effA !== effB) {
      return effA - effB;
    }

    const created = String(a.created_at || "").localeCompare(String(b.created_at || ""));
    if (created) return created;
    return String(a.id || "").localeCompare(String(b.id || ""));
  })[0];
}

function startingPriceForMembers(members) {
  const list = (members || []).filter(Boolean);
  if (!list.length) return 0;
  const available = list.filter(productHasAvailableStock);
  const source = available.length ? available : list;
  const prices = [];
  for (const item of source) {
    const inv = resolveVariantInventory(item);
    if (inv && inv.length > 0) {
      for (const row of inv) {
        if (!isVariantOutOfStock(row)) {
          const rowPrice = row.price != null && Number(row.price) > 0 ? Number(row.price) : effectivePrice(item);
          const rowSale = row.sale_price != null && Number(row.sale_price) > 0 ? Number(row.sale_price) : null;
          const eff = (rowSale && rowSale < rowPrice) ? rowSale : rowPrice;
          if (eff > 0) prices.push(eff);
        }
      }
    } else {
      const p = effectivePrice(item);
      if (p > 0) prices.push(p);
    }
  }
  if (!prices.length) return effectivePrice(list[0]);
  return Math.min(...prices);
}

/**
 * Collapse products that share an explicit design_id.
 * Products without design_id stay as their own listing — titles are never used.
 */
function groupProductsForListing(products) {
  const groups = new Map();
  const order = [];
  for (const product of products || []) {
    if (!product) continue;
    const key = designGroupKey(product);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(product);
  }
  return order.map((key) => ({
    key,
    design_id: String(groups.get(key)[0]?.design_id || "").trim() || null,
    members: groups.get(key),
  }));
}

function humanizeCaseType(slug) {
  const key = String(slug || "").trim().replace(/-case$/i, "").replace(/-/g, " ");
  if (!key) return "";
  const titled = key.replace(/\b\w/g, (letter) => letter.toUpperCase());
  return /case$/i.test(titled) ? titled : `${titled} Case`;
}

function caseTypeLabelFromMap(slug, labelMap = {}) {
  const key = String(slug || "").trim().toLowerCase();
  const aliases = [key, key.replace(/-case$/, ""), `${key.replace(/-case$/, "")}-case`];
  for (const alias of aliases) {
    const mapped = labelMap[alias]?.label || (typeof labelMap[alias] === "string" ? labelMap[alias] : "");
    if (!mapped) continue;
    if (mapped.toLowerCase() === alias || mapped.toLowerCase() === key) continue;
    return mapped;
  }
  return humanizeCaseType(slug) || slug || "";
}

function toPublicMaterialVariant(doc, canonical, labelMap = {}) {
  const product = toPublicProduct(doc);
  if (!product) return null;
  const ownImages = variantHasOwnImages(doc, canonical);
  return {
    id: product.id,
    is_default: Boolean(doc.is_default || (canonical && doc.id === canonical.id && doc.is_default !== false)),
    title: product.title,
    slug: product.slug,
    case_type: product.case_type,
    case_type_key: caseTypeKey(product.case_type),
    case_type_label: caseTypeLabelFromMap(product.case_type, labelMap),
    material: product.material || "",
    price: product.price,
    sale_price: product.sale_price ?? null,
    effective_price: product.effective_price,
    discount_percent: product.discount_percent,
    description: product.description || "",
    short_description: product.short_description || "",
    sku: product.sku || null,
    stock: product.stock,
    in_stock: product.in_stock,
    variants: resolveVariantInventory(doc),
    thumbnail: ownImages ? product.thumbnail : null,
    images: ownImages ? product.images : null,
    has_variant_image: ownImages,
    phone_brand: product.phone_brand || canonical?.phone_brand || "",
    phone_models: Array.isArray(product.phone_models) && product.phone_models.length > 0
      ? product.phone_models
      : (Array.isArray(canonical?.phone_models) ? canonical.phone_models : []),
    compatibility: Array.isArray(product.compatibility) && product.compatibility.length > 0
      ? product.compatibility
      : (Array.isArray(canonical?.compatibility) ? canonical.compatibility : []),
    status: product.status || "published",
  };
}

function toPublicListingProduct(group, labelMap = {}) {
  const members = (group?.members || []).filter((item) => item && item.status === "published");
  if (!members.length) return null;
  const canonical = pickCanonical(members);
  const publicDoc = toPublicProduct(canonical);
  if (!publicDoc) return null;
  const starting_price = startingPriceForMembers(members);
  const priceFrom = members.length > 1;
  const available = members.filter(productHasAvailableStock);
  const priceSourceMembers = available.length ? available : members;
  const cheapest = [...priceSourceMembers].sort((a, b) => effectivePrice(a) - effectivePrice(b))[0];
  const cheapestPublic = toPublicProduct(cheapest) || publicDoc;

  const brandGroupMap = new Map();
  for (const m of members) {
    const pCompat = Array.isArray(m.compatibility) && m.compatibility.length > 0
      ? m.compatibility
      : normalizeCompatibility(m.compatibility, m.phone_brand, m.phone_models);
    for (const g of pCompat) {
      const bKey = String(g.brand || "").trim().toLowerCase();
      if (!bKey) continue;
      if (!brandGroupMap.has(bKey)) {
        brandGroupMap.set(bKey, { brand: g.brand, models: [] });
      }
      const entry = brandGroupMap.get(bKey);
      for (const model of g.models || []) {
        if (!entry.models.some((x) => x.toLowerCase() === String(model).toLowerCase())) {
          entry.models.push(model);
        }
      }
    }
  }
  const mergedCompatibility = Array.from(brandGroupMap.values());
  const mergedModels = [...new Set(mergedCompatibility.flatMap((g) => g.models))];

  return {
    ...publicDoc,
    is_default: true,
    default_variant_id: canonical.id,
    design_id: group.design_id || canonical.design_id || null,
    material_count: members.length,
    materials: members.map((item) => item.case_type),
    material_labels: members.map((item) => caseTypeLabelFromMap(item.case_type, labelMap)),
    starting_price,
    price_from: priceFrom,
    effective_price: starting_price,
    price: priceFrom ? cheapestPublic.price : publicDoc.price,
    sale_price: priceFrom ? cheapestPublic.sale_price : publicDoc.sale_price,
    discount_percent: priceFrom ? cheapestPublic.discount_percent : publicDoc.discount_percent,
    in_stock: members.some(productHasAvailableStock),
    phone_brand: mergedCompatibility[0]?.brand || publicDoc.phone_brand,
    phone_models: mergedModels.length > 0 ? mergedModels : publicDoc.phone_models,
    compatibility: mergedCompatibility.length > 0 ? mergedCompatibility : publicDoc.compatibility,
  };
}

function paginateList(items, page, limit) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 12);
  const total = items.length;
  const skip = (safePage - 1) * safeLimit;
  return {
    items: items.slice(skip, skip + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    pages: Math.ceil(total / safeLimit) || 1,
  };
}

function findDuplicateCaseType(members, caseType, excludeId = null) {
  const key = caseTypeKey(caseType);
  if (!key) return null;
  return (members || []).find((item) => {
    if (!item || item.id === excludeId) return false;
    return caseTypeKey(item.case_type) === key;
  }) || null;
}

module.exports = {
  caseTypeKey,
  designGroupKey,
  variantHasOwnImages,
  pickCanonical,
  startingPriceForMembers,
  groupProductsForListing,
  caseTypeLabelFromMap,
  toPublicMaterialVariant,
  toPublicListingProduct,
  paginateList,
  findDuplicateCaseType,
};
