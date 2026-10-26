const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFormFields } = require("./templateProducts");

test("catalogCompatibility: parseFormFields validates brand and models against catalog", async (t) => {
  const allowedBrands = [
    { id: "brand-apple", name: "Apple", slug: "apple" },
    { id: "brand-samsung", name: "Samsung", slug: "samsung" },
  ];

  const appleModels = [
    { id: "model-ip15pm", name: "iPhone 15 Pro Max" },
    { id: "model-ip15p", name: "iPhone 15 Pro" },
    { id: "model-ip15", name: "iPhone 15" },
  ];

  await t.test("rejects phone brand not in allowedBrands", () => {
    const res = parseFormFields(
      {
        title: "Test Case",
        phone_brand: "Nokia",
        phone_models: JSON.stringify(["iPhone 15 Pro Max"]),
        case_type: "matte",
        price: "499",
      },
      { allowedBrands, allowedModels: appleModels }
    );
    assert.ok(res.error);
    assert.match(res.error, /Brand "Nokia" is not in the catalog/);
  });

  await t.test("rejects phone models that do not belong to the selected brand", () => {
    const res = parseFormFields(
      {
        title: "Test Case",
        phone_brand: "Apple",
        phone_models: JSON.stringify(["Galaxy S24 Ultra", "iPhone 15 Pro Max"]),
        case_type: "matte",
        price: "499",
      },
      { allowedBrands, allowedModels: appleModels }
    );
    assert.ok(res.error);
    assert.match(res.error, /Model "Galaxy S24 Ultra" is not a valid model for Apple/);
  });

  await t.test("accepts valid phone brand and compatible catalog models", () => {
    const parsed = parseFormFields(
      {
        title: "Test Case",
        phone_brand: "Apple",
        phone_models: JSON.stringify(["iPhone 15 Pro Max", "iPhone 15"]),
        case_type: "matte",
        price: "499",
        stock: "25",
      },
      { allowedBrands, allowedModels: appleModels }
    );

    assert.equal(parsed.error, undefined);
    assert.equal(parsed.phone_brand, "Apple");
    assert.deepEqual(parsed.phone_models, ["iPhone 15 Pro Max", "iPhone 15"]);
  });

  await t.test("preserves backwards compatibility when allowed options are not supplied", () => {
    const parsed = parseFormFields({
      title: "Legacy Case",
      phone_brand: "AnyBrand",
      phone_models: JSON.stringify(["Custom Model A", "Custom Model B"]),
      case_type: "silicone",
      price: "399",
    });

    assert.equal(parsed.error, undefined);
    assert.equal(parsed.phone_brand, "AnyBrand");
    assert.deepEqual(parsed.phone_models, ["Custom Model A", "Custom Model B"]);
  });
});
