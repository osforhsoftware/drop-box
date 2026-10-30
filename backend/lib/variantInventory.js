function slugify(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function namesMatch(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function asBool(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function isVariantOutOfStock(variant) {
  if (!variant) return false;
  return variant.is_out_of_stock === true || Number(variant.stock_quantity) <= 0;
}

function availableStock(inventory) {
  return (inventory || []).reduce((sum, variant) => {
    if (isVariantOutOfStock(variant)) return sum;
    return sum + Math.max(0, Math.floor(Number(variant.stock_quantity) || 0));
  }, 0);
}

/**
 * Align inventory rows to the product's phone models.
 * A missing model uses fallbackStock. Stored rows for other models are left unchanged.
 */
function normalizeVariantInventory(raw, phoneModels, fallbackStock = 0) {
  let entries = raw;
  if (entries == null || entries === "") entries = [];
  if (typeof entries === "string") {
    try {
      entries = JSON.parse(entries);
    } catch {
      return { error: "variant_inventory must be a JSON array" };
    }
  }
  if (!Array.isArray(entries)) {
    return { error: "variant_inventory must be an array" };
  }

  const fallback = Math.max(0, Math.floor(Number(fallbackStock) || 0));
  const parsed = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      return { error: "Each variant must be an object" };
    }
    const model_name = String(entry.model_name || entry.name || "").trim();
    if (!model_name) return { error: "Each variant requires a model name" };
    const stock_quantity = Math.floor(Number(entry.stock_quantity ?? entry.stock ?? fallback));
    if (!Number.isFinite(stock_quantity) || stock_quantity < 0) {
      return { error: `Invalid stock quantity for ${model_name}` };
    }
    const is_out_of_stock = asBool(entry.is_out_of_stock) || stock_quantity <= 0;
    const explicitId = String(entry.variant_id || "").trim();

    let price = null;
    if (entry.price != null && entry.price !== "") {
      const p = Number(entry.price);
      if (!Number.isFinite(p) || p < 0) {
        return { error: `Invalid price for ${model_name}` };
      }
      price = Math.round(p * 100) / 100;
    }

    let sale_price = null;
    if (entry.sale_price != null && entry.sale_price !== "") {
      const sp = Number(entry.sale_price);
      if (!Number.isFinite(sp) || sp < 0) {
        return { error: `Invalid sale price for ${model_name}` };
      }
      sale_price = Math.round(sp * 100) / 100;
    }

    const brand = entry.brand ? String(entry.brand).trim() : null;

    parsed.push({
      variant_id: explicitId || slugify(model_name),
      model_name,
      brand,
      stock_quantity,
      is_out_of_stock,
      price,
      sale_price,
    });
  }

  const models = (phoneModels || []).map((name) => String(name).trim()).filter(Boolean);
  const sourceModels = models.length ? models : parsed.map((entry) => entry.model_name);
  if (!sourceModels.length) return { value: [] };

  const used = new Set();
  const value = sourceModels.map((model_name) => {
    const match = parsed.find((entry) => {
      if (used.has(entry)) return false;
      return namesMatch(entry.model_name, model_name) || entry.variant_id === slugify(model_name);
    });
    if (match) {
      used.add(match);
      return {
        variant_id: match.variant_id || slugify(model_name),
        model_name,
        brand: match.brand || null,
        stock_quantity: match.stock_quantity,
        is_out_of_stock: match.is_out_of_stock || match.stock_quantity <= 0,
        price: match.price ?? null,
        sale_price: match.sale_price ?? null,
      };
    }
    return {
      variant_id: slugify(model_name),
      model_name,
      brand: null,
      stock_quantity: fallback,
      is_out_of_stock: fallback <= 0,
      price: null,
      sale_price: null,
    };
  });

  const seen = new Set();
  for (const row of value) {
    let id = row.variant_id || slugify(row.model_name);
    if (!id) id = "variant";
    if (seen.has(id)) id = `${id}-${seen.size + 1}`;
    seen.add(id);
    row.variant_id = id;
  }

  return { value };
}

function synthesizeVariantInventory(phoneModels, stock) {
  const normalized = normalizeVariantInventory([], phoneModels, stock);
  return normalized.value || [];
}

/** Stored rows win. Products that only have a shared stock field get one row per phone model. */
function resolveVariantInventory(product) {
  const models = Array.isArray(product?.phone_models) ? product.phone_models : [];
  const stored = Array.isArray(product?.variant_inventory) ? product.variant_inventory : [];
  if (stored.length) {
    const normalized = normalizeVariantInventory(stored, models, 0);
    if (!normalized.error) return normalized.value;
  }
  if (!models.length) return [];
  return synthesizeVariantInventory(models, product?.stock);
}

function findVariant(inventory, { variantId, modelName } = {}) {
  if (!inventory?.length) return null;
  if (variantId) {
    const byId = inventory.find((variant) => variant.variant_id === variantId);
    if (byId) return byId;
    const bySlug = inventory.find((variant) => namesMatch(variant.model_name, variantId));
    if (bySlug) return bySlug;
  }
  if (modelName) {
    return inventory.find((variant) => namesMatch(variant.model_name, modelName)) || null;
  }
  return null;
}

function isModelOutOfStock(product, modelName) {
  const inventory = resolveVariantInventory(product);
  if (modelName) {
    const variant = findVariant(inventory, { modelName });
    if (variant) return isVariantOutOfStock(variant);
    if (inventory.length) return false;
    return Number(product?.stock) <= 0;
  }
  if (inventory.length) return inventory.every(isVariantOutOfStock);
  return Number(product?.stock) <= 0;
}

function productHasAvailableStock(product) {
  const inventory = resolveVariantInventory(product);
  if (inventory.length) return inventory.some((variant) => !isVariantOutOfStock(variant));
  return Number(product?.stock) > 0;
}

function assertCanPurchaseVariant(product, modelName, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const inventory = resolveVariantInventory(product);
  if (!inventory.length) {
    const stock = Math.max(0, Math.floor(Number(product?.stock) || 0));
    if (stock <= 0) return "This product is out of stock";
    if (stock < qty) return `Only ${stock} left in stock`;
    return null;
  }
  const variant = findVariant(inventory, { modelName });
  if (!variant) return null;
  if (isVariantOutOfStock(variant)) return `${variant.model_name} is out of stock`;
  if (variant.stock_quantity < qty) return `Only ${variant.stock_quantity} left for ${variant.model_name}`;
  return null;
}

/**
 * Update one variant. Other variants, product status, and category are not changed.
 * Parent `stock` is the sum of units that are still available.
 */
function applyVariantInventoryUpdate(product, variantKey, patch = {}) {
  const inventory = resolveVariantInventory(product);
  if (!inventory.length) return { error: "This product has no variants to update" };

  const key = String(variantKey || "").trim();
  const index = inventory.findIndex(
    (variant) => variant.variant_id === key || namesMatch(variant.model_name, key)
  );
  if (index < 0) return { error: "Variant not found" };

  const hasQty = patch.stock_quantity != null && patch.stock_quantity !== "";
  const hasFlag = patch.is_out_of_stock != null && patch.is_out_of_stock !== "";
  const hasPrice = patch.price !== undefined;
  const hasSalePrice = patch.sale_price !== undefined;
  if (!hasQty && !hasFlag && !hasPrice && !hasSalePrice) return { error: "No inventory fields to update" };

  const current = { ...inventory[index] };
  if (hasQty) {
    const stock_quantity = Math.floor(Number(patch.stock_quantity));
    if (!Number.isFinite(stock_quantity) || stock_quantity < 0) {
      return { error: "stock_quantity must be a number that is 0 or greater" };
    }
    current.stock_quantity = stock_quantity;
    if (stock_quantity <= 0) current.is_out_of_stock = true;
    else if (!hasFlag) current.is_out_of_stock = false;
  }

  if (hasFlag) {
    const flag = asBool(patch.is_out_of_stock);
    if (!flag && current.stock_quantity <= 0) {
      return { error: "Set a stock quantity above 0 before marking this variant in stock" };
    }
    current.is_out_of_stock = flag || current.stock_quantity <= 0;
  }

  if (hasPrice) {
    const p = patch.price === null || patch.price === "" ? null : Number(patch.price);
    if (p !== null && (!Number.isFinite(p) || p < 0)) {
      return { error: "price must be a positive number or null" };
    }
    current.price = p != null ? Math.round(p * 100) / 100 : null;
  }

  if (hasSalePrice) {
    const sp = patch.sale_price === null || patch.sale_price === "" ? null : Number(patch.sale_price);
    if (sp !== null && (!Number.isFinite(sp) || sp < 0)) {
      return { error: "sale_price must be a positive number or null" };
    }
    current.sale_price = sp != null ? Math.round(sp * 100) / 100 : null;
  }

  const variant_inventory = inventory.map((variant, i) => (i === index ? current : variant));
  return {
    variant_inventory,
    stock: availableStock(variant_inventory),
    variant: current,
  };
}

/** Pure stock consumption for a single model. Sibling variants stay as they are. */
function consumeVariantStock(product, modelName, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const blocked = assertCanPurchaseVariant(product, modelName, qty);
  if (blocked) return { error: blocked };

  const inventory = resolveVariantInventory(product);
  if (!inventory.length) {
    const stock = Math.max(0, Math.floor(Number(product?.stock) || 0) - qty);
    return { stock, variant_inventory: [] };
  }

  const variant = findVariant(inventory, { modelName });
  if (!variant) {
    return { stock: availableStock(inventory), variant_inventory: inventory };
  }

  const variant_inventory = inventory.map((entry) => {
    if (entry.variant_id !== variant.variant_id) return entry;
    const stock_quantity = entry.stock_quantity - qty;
    return {
      ...entry,
      stock_quantity,
      is_out_of_stock: stock_quantity <= 0 ? true : entry.is_out_of_stock,
    };
  });

  return {
    stock: availableStock(variant_inventory),
    variant_inventory,
  };
}

module.exports = {
  slugify,
  isVariantOutOfStock,
  availableStock,
  normalizeVariantInventory,
  synthesizeVariantInventory,
  resolveVariantInventory,
  findVariant,
  isModelOutOfStock,
  productHasAvailableStock,
  assertCanPurchaseVariant,
  applyVariantInventoryUpdate,
  consumeVariantStock,
  resolveModelPrice,
};

function resolveModelPrice(product, modelName) {
  if (!product) return { price: 0, sale_price: null, effective_price: 0 };
  const basePrice = Number(product.price) || 0;
  const baseSale = (product.sale_price != null && product.sale_price !== "") ? Number(product.sale_price) : null;
  const inventory = resolveVariantInventory(product);
  const variant = findVariant(inventory, { modelName });
  if (variant && variant.price != null && Number(variant.price) > 0) {
    const price = Number(variant.price);
    const sale_price = (variant.sale_price != null && Number(variant.sale_price) > 0) ? Number(variant.sale_price) : null;
    const effective_price = (sale_price != null && sale_price > 0 && sale_price < price) ? sale_price : price;
    return {
      price,
      sale_price: sale_price && sale_price < price ? sale_price : null,
      effective_price,
    };
  }
  const effective_price = (baseSale != null && baseSale > 0 && baseSale < basePrice) ? baseSale : (product.effective_price ?? basePrice);
  return {
    price: basePrice,
    sale_price: baseSale && baseSale < basePrice ? baseSale : null,
    effective_price,
  };
}
