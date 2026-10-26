const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildCaseTypeLabelMap,
  snapshotOrderMaterial,
  orderMaterialLabel,
} = require("./orderMaterial");

describe("orderMaterial", () => {
  it("prefers the selected template case type and catalog label", () => {
    const labelMap = buildCaseTypeLabelMap([
      { slug: "silicone", name: "Silicone Case" },
    ]);
    const snap = snapshotOrderMaterial({
      templateProduct: { case_type: "silicone", material: "TPU" },
      product: { name: "Generic Case", slug: "generic" },
    }, labelMap);
    assert.deepEqual(snap, {
      case_type: "silicone",
      case_type_label: "Silicone Case",
      material: "TPU",
    });
  });

  it("uses selected catalog product material when a non-default case type is chosen", () => {
    const labelMap = buildCaseTypeLabelMap([
      { slug: "transparent-case", name: "Transparent Case" },
      { slug: "silicone", name: "Silicone Case" },
    ]);
    const snap = snapshotOrderMaterial({
      templateProduct: { case_type: "silicone", material: "Silicone" },
      product: { name: "Transparent Case", slug: "transparent-case", material: "Polycarbonate" },
    }, labelMap);
    assert.deepEqual(snap, {
      case_type: "transparent-case",
      case_type_label: "Transparent Case",
      material: "Polycarbonate",
    });
  });

  it("falls back to catalog product name for older lines", () => {
    assert.equal(orderMaterialLabel({ product_name: "Matte Case" }), "Matte Case");
    assert.equal(
      orderMaterialLabel({ case_type_label: "Glass Case", product_name: "Clear" }),
      "Glass Case"
    );
  });
});
