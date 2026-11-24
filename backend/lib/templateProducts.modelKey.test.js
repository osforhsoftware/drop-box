const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeModelKey,
  resolveCatalogModelName,
  parseCompatibility,
} = require("./templateProducts");

describe("normalizeModelKey", () => {
  it("treats Pixel 7a and Pixel 7 a as the same key", () => {
    assert.equal(normalizeModelKey("Pixel 7a"), "pixel 7 a");
    assert.equal(normalizeModelKey("Pixel 7 a"), "pixel 7 a");
    assert.equal(normalizeModelKey("  PIXEL  7A  "), "pixel 7 a");
  });
});

describe("resolveCatalogModelName", () => {
  const catalog = [
    { id: "1", name: "Pixel 7 a", brand_id: "gp" },
    { id: "2", name: "Pixel 8", brand_id: "gp" },
  ];

  it("maps Pixel 7a onto catalog Pixel 7 a", () => {
    assert.equal(resolveCatalogModelName("Pixel 7a", catalog), "Pixel 7 a");
  });
});

describe("parseCompatibility model remapping", () => {
  it("accepts Pixel 7a when catalog has Pixel 7 a and remaps the name", () => {
    const result = parseCompatibility(
      [{ brand: "Google Pixel", models: ["Pixel 7a", "Pixel 8"] }],
      "",
      [],
      {
        allowedBrands: [{ id: "gp", name: "Google Pixel" }],
        allowedModels: [
          { id: "1", name: "Pixel 7 a", brand_id: "gp" },
          { id: "2", name: "Pixel 8", brand_id: "gp" },
          { id: "3", name: "Pixel 9", brand_id: "gp" },
        ],
      }
    );
    assert.equal(result.error, undefined);
    assert.deepEqual(result.value[0].models, ["Pixel 7 a", "Pixel 8"]);
  });

  it("rejects truly unknown models with a clear error", () => {
    const result = parseCompatibility(
      [{ brand: "Google Pixel", models: ["Pixel 99 Ultra"] }],
      "",
      [],
      {
        allowedBrands: [{ id: "gp", name: "Google Pixel" }],
        allowedModels: [{ id: "1", name: "Pixel 7 a", brand_id: "gp" }],
      }
    );
    assert.match(result.error, /not valid for Google Pixel: Pixel 99 Ultra/);
  });

  it("auto-strips unknown models when stripInvalidModels is set", () => {
    const result = parseCompatibility(
      [{ brand: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy Z Fantasy"] }],
      "",
      [],
      {
        allowedBrands: [{ id: "s", name: "Samsung" }],
        allowedModels: [
          { id: "1", name: "Galaxy S24 Ultra", brand_id: "s" },
          { id: "2", name: "Galaxy A54", brand_id: "s" },
        ],
        stripInvalidModels: true,
      }
    );
    assert.equal(result.error, undefined);
    assert.deepEqual(result.value[0].models, ["Galaxy S24 Ultra"]);
    assert.deepEqual(result.strippedInvalid, [
      { brand: "Samsung", models: ["Galaxy Z Fantasy"] },
    ]);
  });
});
