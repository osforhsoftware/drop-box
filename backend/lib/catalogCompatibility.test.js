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

  await t.test("accepts multi-brand compatibility collection and returns all brand/model groups", () => {
    const catalogModels = [
      { id: "model-ip15pm", name: "iPhone 15 Pro Max", brand_id: "brand-apple" },
      { id: "model-ip15", name: "iPhone 15", brand_id: "brand-apple" },
      { id: "model-s24u", name: "Galaxy S24 Ultra", brand_id: "brand-samsung" },
    ];

    const parsed = parseFormFields(
      {
        title: "Multi-Brand Case",
        compatibility: JSON.stringify([
          { brand: "Samsung", models: ["Galaxy S24 Ultra"] },
          { brand: "Apple", models: ["iPhone 15", "iPhone 15 Pro Max"] },
        ]),
        case_type: "matte",
        price: "499",
      },
      { allowedBrands, allowedModels: catalogModels }
    );

    assert.equal(parsed.error, undefined);
    assert.deepEqual(parsed.compatibility, [
      { brand: "Samsung", models: ["Galaxy S24 Ultra"] },
      { brand: "Apple", models: ["iPhone 15", "iPhone 15 Pro Max"] },
    ]);
    assert.equal(parsed.phone_brand, "Samsung");
    assert.deepEqual(parsed.phone_models, ["Galaxy S24 Ultra", "iPhone 15", "iPhone 15 Pro Max"]);
  });

  await t.test("rejects invalid model for a brand in a multi-brand compatibility collection", () => {
    const catalogModels = [
      { id: "model-ip15pm", name: "iPhone 15 Pro Max", brand_id: "brand-apple" },
      { id: "model-s24u", name: "Galaxy S24 Ultra", brand_id: "brand-samsung" },
    ];

    const res = parseFormFields(
      {
        title: "Multi-Brand Case",
        compatibility: JSON.stringify([
          { brand: "Samsung", models: ["Galaxy S24 Ultra"] },
          { brand: "Apple", models: ["Galaxy S24 Ultra"] }, // Invalid model for Apple
        ]),
        case_type: "matte",
        price: "499",
      },
      { allowedBrands, allowedModels: catalogModels }
    );

    assert.ok(res.error);
    assert.match(res.error, /Model "Galaxy S24 Ultra" is not a valid model for Apple/);
  });

  await t.test("deduplicates duplicate brand groups and models in compatibility", () => {
    const catalogModels = [
      { id: "model-ip15", name: "iPhone 15", brand_id: "brand-apple" },
      { id: "model-ip15pm", name: "iPhone 15 Pro Max", brand_id: "brand-apple" },
    ];

    const parsed = parseFormFields(
      {
        title: "Deduplicated Case",
        compatibility: JSON.stringify([
          { brand: "Apple", models: ["iPhone 15", "iPhone 15"] },
          { brand: "apple", models: ["iPhone 15 Pro Max"] },
        ]),
        case_type: "matte",
        price: "499",
      },
      { allowedBrands, allowedModels: catalogModels }
    );

    assert.equal(parsed.error, undefined);
    assert.deepEqual(parsed.compatibility, [
      { brand: "Apple", models: ["iPhone 15", "iPhone 15 Pro Max"] },
    ]);
    assert.deepEqual(parsed.phone_models, ["iPhone 15", "iPhone 15 Pro Max"]);
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
    assert.deepEqual(parsed.compatibility, [
      { brand: "AnyBrand", models: ["Custom Model A", "Custom Model B"] },
    ]);
  });

  await t.test("parseMaterialVariants validates required price > 0 and rejects invalid prices", () => {
    const { parseMaterialVariants } = require("./templateProducts");
    const allowedCaseTypes = ["matte", "glass", "silicone"];

    // Missing price
    const resNoPrice = parseMaterialVariants([
      { case_type: "glass", price: "" },
    ], { allowedCaseTypes });
    assert.ok(resNoPrice.error);
    assert.match(resNoPrice.error, /requires a valid price greater than 0/);

    // Zero or negative price
    const resZeroPrice = parseMaterialVariants([
      { case_type: "glass", price: 0 },
    ], { allowedCaseTypes });
    assert.ok(resZeroPrice.error);
    assert.match(resZeroPrice.error, /requires a valid price greater than 0/);

    // Valid price
    const resValid = parseMaterialVariants([
      { case_type: "glass", price: "609", material: "9H Glass" },
    ], { allowedCaseTypes });
    assert.equal(resValid.error, undefined);
    assert.equal(resValid.value[0].price, 609);
    assert.equal(resValid.value[0].case_type, "glass");
  });

  await t.test("parseMaterialVariants rejects duplicate variant case_types", () => {
    const { parseMaterialVariants } = require("./templateProducts");
    const allowedCaseTypes = ["matte", "glass", "silicone"];

    // Duplicate against primary material
    const resDupPrimary = parseMaterialVariants([
      { case_type: "matte", price: "359" },
    ], { allowedCaseTypes }, "matte");
    assert.ok(resDupPrimary.error);
    assert.match(resDupPrimary.error, /Duplicate material variant/);

    // Duplicate within variant list
    const resDupList = parseMaterialVariants([
      { case_type: "glass", price: "609" },
      { case_type: "glass", price: "649" },
    ], { allowedCaseTypes }, "matte");
    assert.ok(resDupList.error);
    assert.match(resDupList.error, /Duplicate material variant/);
  });

  await t.test("editing Apple models preserves Samsung brand group and models", () => {
    const catalogModels = [
      { id: "m-s24u", name: "Galaxy S24 Ultra", brand_id: "brand-samsung" },
      { id: "m-s25", name: "Galaxy S25", brand_id: "brand-samsung" },
      { id: "m-ip15", name: "iPhone 15", brand_id: "brand-apple" },
      { id: "m-ip16", name: "iPhone 16", brand_id: "brand-apple" },
    ];

    // Initial state: Apple and Samsung
    const initialCompat = [
      { brand: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S25"] },
      { brand: "Apple", models: ["iPhone 15"] },
    ];

    // Update Apple to add iPhone 16 while keeping Samsung unchanged
    const updatedAppleOnly = initialCompat.map((g) => {
      if (g.brand === "Apple") {
        return { brand: "Apple", models: ["iPhone 15", "iPhone 16"] };
      }
      return g;
    });

    const parsed = parseFormFields(
      {
        title: "Galaxy & iPhone Design",
        compatibility: JSON.stringify(updatedAppleOnly),
        case_type: "matte",
        price: "359",
      },
      { allowedBrands, allowedModels: catalogModels }
    );

    assert.equal(parsed.error, undefined);
    assert.equal(parsed.compatibility.length, 2);
    const samsungGroup = parsed.compatibility.find((g) => g.brand === "Samsung");
    assert.ok(samsungGroup);
    assert.deepEqual(samsungGroup.models, ["Galaxy S24 Ultra", "Galaxy S25"]);

    const appleGroup = parsed.compatibility.find((g) => g.brand === "Apple");
    assert.ok(appleGroup);
    assert.deepEqual(appleGroup.models, ["iPhone 15", "iPhone 16"]);
  });

  await t.test("intentionally removing Apple retains Samsung without re-adding Apple", () => {
    const catalogModels = [
      { id: "m-s24u", name: "Galaxy S24 Ultra", brand_id: "brand-samsung" },
      { id: "m-s25", name: "Galaxy S25", brand_id: "brand-samsung" },
    ];

    const initialCompat = [
      { brand: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S25"] },
      { brand: "Apple", models: ["iPhone 15"] },
    ];

    // Admin intentionally removes Apple
    const removedApple = initialCompat.filter((g) => g.brand !== "Apple");

    const parsed = parseFormFields(
      {
        title: "Samsung Only Design",
        compatibility: JSON.stringify(removedApple),
        case_type: "matte",
        price: "359",
      },
      { allowedBrands, allowedModels: catalogModels }
    );

    assert.equal(parsed.error, undefined);
    assert.equal(parsed.compatibility.length, 1);
    assert.equal(parsed.compatibility[0].brand, "Samsung");
    assert.deepEqual(parsed.compatibility[0].models, ["Galaxy S24 Ultra", "Galaxy S25"]);
    assert.equal(parsed.phone_brand, "Samsung");
  });
});
