const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeAllowedProductIds,
  productIsAllowedForBrand,
} = require("./catalogCompatibility");

test("missing brand compatibility keeps all active products available", () => {
  assert.equal(
    productIsAllowedForBrand({ id: "brand-1" }, { id: "case-1", is_active: true }),
    true
  );
});

test("an explicit compatibility list only allows selected products", () => {
  const brand = { allowed_product_ids: ["case-1"] };
  assert.equal(productIsAllowedForBrand(brand, { id: "case-1" }), true);
  assert.equal(productIsAllowedForBrand(brand, { id: "case-2" }), false);
});

test("inactive products are unavailable even when selected", () => {
  const brand = { allowed_product_ids: ["case-1"] };
  assert.equal(
    productIsAllowedForBrand(brand, { id: "case-1", is_active: false }),
    false
  );
});

test("allowed product IDs parse, trim, and deduplicate multipart values", () => {
  assert.deepEqual(
    normalizeAllowedProductIds('["case-1", " case-1 ", "case-2", ""]'),
    { value: ["case-1", "case-2"] }
  );
  assert.match(normalizeAllowedProductIds("not-json").error, /JSON array/);
  assert.match(normalizeAllowedProductIds("[1]").error, /array of product IDs/);
});
