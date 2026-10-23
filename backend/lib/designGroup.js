const { effectivePrice, toPublicProduct, toRelativeMediaUrl } = require("./templateProducts");
const { productHasAvailableStock, resolveVariantInventory } = require("./variantInventory");

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
  const prices = source.map(effectivePrice).filter((price) => Number.isFinite(price) && price > 0);
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
  return {
    ...publicDoc,
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
