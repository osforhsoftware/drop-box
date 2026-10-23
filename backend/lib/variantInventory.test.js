const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeVariantInventory,
  resolveVariantInventory,
  applyVariantInventoryUpdate,
  consumeVariantStock,
  assertCanPurchaseVariant,
  isModelOutOfStock,
  productHasAvailableStock,
} = require("./variantInventory");

const samsungCase = {
  id: "case-1",
  status: "published",
  category: "Minimal",
  stock: 10,
  phone_models: ["Samsung S24", "Samsung S23"],
};

test("legacy shared stock is exposed per phone model without marking siblings out", () => {
  const variants = resolveVariantInventory(samsungCase);
  assert.equal(variants.length, 2);
  assert.equal(variants[0].model_name, "Samsung S24");
  assert.equal(variants[0].stock_quantity, 10);
  assert.equal(variants[0].is_out_of_stock, false);
  assert.equal(variants[1].model_name, "Samsung S23");
  assert.equal(isModelOutOfStock(samsungCase, "Samsung S24"), false);
  assert.equal(productHasAvailableStock(samsungCase), true);
});

test("setting one variant to zero does not change sibling stock or product status", () => {
  const updated = applyVariantInventoryUpdate(samsungCase, "samsung-s24", { stock_quantity: 0 });
  assert.equal(updated.error, undefined);
  assert.equal(updated.variant.model_name, "Samsung S24");
  assert.equal(updated.variant.stock_quantity, 0);
  assert.equal(updated.variant.is_out_of_stock, true);
  const sibling = updated.variant_inventory.find((variant) => variant.model_name === "Samsung S23");
  assert.equal(sibling.stock_quantity, 10);
  assert.equal(sibling.is_out_of_stock, false);
  assert.equal(updated.stock, 10);
  assert.equal(updated.status, undefined);
  assert.equal(updated.category, undefined);

  const next = { ...samsungCase, ...updated };
  assert.equal(next.status, "published");
  assert.equal(next.category, "Minimal");
  assert.equal(isModelOutOfStock(next, "Samsung S24"), true);
  assert.equal(isModelOutOfStock(next, "Samsung S23"), false);
  assert.equal(productHasAvailableStock(next), true);
  assert.match(assertCanPurchaseVariant(next, "Samsung S24"), /Samsung S24 is out of stock/);
  assert.equal(assertCanPurchaseVariant(next, "Samsung S23"), null);
});

test("manual out-of-stock flag applies only to the targeted variant id", () => {
  const withInventory = {
    ...samsungCase,
    variant_inventory: normalizeVariantInventory([
      { model_name: "Samsung S24", stock_quantity: 4 },
      { model_name: "Samsung S23", stock_quantity: 6 },
    ], samsungCase.phone_models).value,
  };
  const s24 = withInventory.variant_inventory[0];
  const updated = applyVariantInventoryUpdate(withInventory, s24.variant_id, { is_out_of_stock: true });
  assert.equal(updated.variant.is_out_of_stock, true);
  assert.equal(updated.variant.stock_quantity, 4);
  assert.equal(updated.variant_inventory[1].is_out_of_stock, false);
  assert.equal(updated.variant_inventory[1].stock_quantity, 6);
  assert.equal(updated.stock, 6);
});

test("consuming stock decrements only the ordered model", () => {
  const product = {
    ...samsungCase,
    variant_inventory: [
      { variant_id: "samsung-s24", model_name: "Samsung S24", stock_quantity: 2, is_out_of_stock: false },
      { variant_id: "samsung-s23", model_name: "Samsung S23", stock_quantity: 5, is_out_of_stock: false },
    ],
  };
  const next = consumeVariantStock(product, "Samsung S24", 2);
  assert.equal(next.error, undefined);
  assert.equal(next.variant_inventory[0].stock_quantity, 0);
  assert.equal(next.variant_inventory[0].is_out_of_stock, true);
  assert.equal(next.variant_inventory[1].stock_quantity, 5);
  assert.equal(next.variant_inventory[1].is_out_of_stock, false);
  assert.equal(next.stock, 5);
});

test("a model that is not in the variant list stays available when another model is out of stock", () => {
  const product = {
    ...samsungCase,
    variant_inventory: [
      { variant_id: "samsung-s24", model_name: "Samsung S24", stock_quantity: 0, is_out_of_stock: true },
      { variant_id: "samsung-s23", model_name: "Samsung S23", stock_quantity: 3, is_out_of_stock: false },
    ],
  };
  assert.equal(isModelOutOfStock(product, "Samsung S22"), false);
  assert.equal(assertCanPurchaseVariant(product, "Samsung S22"), null);
});

test("saving a product keeps sibling variants and published status", () => {
  const { parseFormFields } = require("./templateProducts");
  const parsed = parseFormFields({
    title: "Tiger Case",
    price: "449",
    case_type: "matte",
    category: "Nature",
    status: "published",
    phone_brand: "Samsung",
    phone_models: JSON.stringify(["Samsung S24", "Samsung S23"]),
    variant_inventory: JSON.stringify([
      { model_name: "Samsung S24", stock_quantity: 0, is_out_of_stock: true },
      { model_name: "Samsung S23", stock_quantity: 8, is_out_of_stock: false },
    ]),
  }, { allowedCaseTypes: ["matte"] });

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.status, "published");
  assert.equal(parsed.category, "Nature");
  assert.equal(parsed.stock, 8);
  assert.equal(parsed.variant_inventory[0].model_name, "Samsung S24");
  assert.equal(parsed.variant_inventory[0].is_out_of_stock, true);
  assert.equal(parsed.variant_inventory[1].stock_quantity, 8);
  assert.equal(parsed.variant_inventory[1].is_out_of_stock, false);
});
