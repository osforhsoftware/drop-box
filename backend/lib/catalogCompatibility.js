function normalizeAllowedProductIds(value) {
  if (value === undefined) return { value: undefined };

  let ids = value;
  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      return { error: "allowed_product_ids must be a JSON array" };
    }
  }

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return { error: "allowed_product_ids must be an array of product IDs" };
  }

  return {
    value: [...new Set(ids.map((id) => id.trim()).filter(Boolean))],
  };
}

function productIsAllowedForBrand(brand, product) {
  if (!product || product.is_active === false) return false;
  return !Array.isArray(brand?.allowed_product_ids)
    || brand.allowed_product_ids.includes(product.id);
}

module.exports = {
  normalizeAllowedProductIds,
  productIsAllowedForBrand,
};
