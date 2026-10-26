import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getUpdatedTemplateTitle,
  getUpdatedProductDescription,
  getMaterialSpecification,
} from "../constants/templateProducts.js";

describe("template material selection", () => {
  const baseTemplate = {
    id: "tpl-1",
    title: "Midnight Black Silicone Case",
    slug: "midnight-black-silicone-case",
    case_type: "silicone",
    material: "Silicone",
    description: "A premium matte black silicone phone case designed for everyday protection.",
  };

  const siliconeProduct = {
    id: "prod-silicone",
    name: "Silicone Case",
    slug: "silicone-case",
    description: "Soft-touch liquid silicone with microfiber lining.",
    material: "Liquid Silicone",
    price: 120,
  };

  const transparentProduct = {
    id: "prod-transparent",
    name: "Transparent Case",
    slug: "transparent-case",
    description: "Crystal-clear polycarbonate. Show off your phone while protecting your design.",
    material: "Polycarbonate",
    price: 349,
  };

  const glassProduct = {
    id: "prod-glass",
    name: "glass",
    slug: "glass",
    description: "Tempered glass back with metallic edges.",
    price: 499,
  };

  it("updates product title from Silicone Case to Transparent Case", () => {
    const title = getUpdatedTemplateTitle(baseTemplate, null, transparentProduct);
    assert.equal(title, "Midnight Black Transparent Case");
  });

  it("keeps original title when the default material is selected", () => {
    const title = getUpdatedTemplateTitle(baseTemplate, null, siliconeProduct);
    assert.equal(title, "Midnight Black Silicone Case");
  });

  it("uses sibling variant title when one is explicitly provided", () => {
    const siblingVariant = {
      id: "tpl-sibling-glass",
      title: "Midnight Black Ultra Glass Edition",
      case_type: "glass",
      case_type_label: "Glass Case",
    };
    const title = getUpdatedTemplateTitle(baseTemplate, siblingVariant, glassProduct);
    assert.equal(title, "Midnight Black Ultra Glass Edition");
  });

  it("upgrades brief or placeholder catalog descriptions to substantial polished material descriptions", () => {
    const desc = getUpdatedProductDescription(baseTemplate, null, transparentProduct, false);
    assert.match(desc, /optical-grade polycarbonate with anti-yellowing UV resistance/i);
    assert.ok(desc.length > 100);

    const glassDesc = getUpdatedProductDescription(baseTemplate, null, { slug: "glass", name: "glass", description: "963" }, false);
    assert.match(glassDesc, /9H tempered glass backplate/i);
  });

  it("preserves substantial custom descriptions provided by catalog or admin", () => {
    const customProduct = {
      id: "prod-custom",
      name: "Matte Case",
      slug: "matte-case",
      description: "Custom artisan satin coating crafted specifically for our limited artist collection with enhanced corner drop defense.",
      price: 399,
    };
    const desc = getUpdatedProductDescription(baseTemplate, null, customProduct, false);
    assert.equal(desc, customProduct.description);
  });

  it("preserves base template description when the default material is active", () => {
    const desc = getUpdatedProductDescription(baseTemplate, null, siliconeProduct, true);
    assert.equal(desc, "A premium matte black silicone phone case designed for everyday protection.");
  });

  it("updates material specification to match selected material", () => {
    const transparentMat = getMaterialSpecification(transparentProduct, baseTemplate, baseTemplate, false);
    assert.equal(transparentMat, "Polycarbonate");

    const siliconeMat = getMaterialSpecification(siliconeProduct, baseTemplate, baseTemplate, true);
    assert.equal(siliconeMat, "Liquid Silicone");

    const glassMat = getMaterialSpecification(glassProduct, baseTemplate, baseTemplate, false);
    assert.equal(glassMat, "Tempered Glass");
  });

  it("correctly matches template case types to catalog products including aliases", async () => {
    const { matchesTemplate } = await import("../constants/templateProducts.js");
    assert.equal(matchesTemplate({ slug: "matte-case", name: "Matte Case" }, "test-case-type"), true);
    assert.equal(matchesTemplate({ slug: "matte-case", name: "Matte Case" }, "matte"), true);
    assert.equal(matchesTemplate({ slug: "silicone-case", name: "Silicone Case" }, "silicone"), true);
    assert.equal(matchesTemplate({ slug: "transparent-case", name: "Transparent Case" }, "transparent"), true);
    assert.equal(matchesTemplate({ slug: "glass", name: "glass" }, "glass"), true);
    assert.equal(matchesTemplate({ slug: "silicone-case", name: "Silicone Case" }, "glass"), false);
  });

  it("filters compatibility by model catalog and variant phone_models", async () => {
    const { isMaterialCompatibleWithModel } = await import("../constants/templateProducts.js");
    const modelIphone15 = { id: "mod-15", name: "iPhone 15" };
    const modelIphone16Pro = { id: "mod-16pro", name: "iphone 16 pr0" };

    const model15Catalog = [
      { id: "p1", slug: "silicone-case", name: "Silicone Case" },
      { id: "p2", slug: "matte-case", name: "Matte Case" },
      { id: "p3", slug: "transparent-case", name: "Transparent Case" },
      { id: "p4", slug: "glass", name: "glass" },
    ];
    const designTemplate = {
      id: "tpl-cyber",
      phone_models: ["iPhone 15"],
    };

    const matteVariant = {
      id: "v-matte",
      case_type: "test-case-type",
      status: "published",
      phone_models: [], // inherits designTemplate
    };

    const glassVariant = {
      id: "v-glass",
      case_type: "glass",
      status: "published",
      phone_models: ["iPhone 15"],
    };

    const restrictedVariant = {
      id: "v-silicone-restricted",
      case_type: "silicone",
      status: "published",
      phone_models: ["iPhone 14"],
    };

    const draftVariant = {
      id: "v-draft",
      case_type: "matte",
      status: "draft",
      phone_models: [],
    };

    // iPhone 15 is supported by matte (inherited from designTemplate) and glass
    assert.equal(isMaterialCompatibleWithModel(matteVariant, modelIphone15, designTemplate), true);
    assert.equal(isMaterialCompatibleWithModel(glassVariant, modelIphone15, designTemplate), true);

    // Restricted variant only for iPhone 14 -> false for iPhone 15
    assert.equal(isMaterialCompatibleWithModel(restrictedVariant, modelIphone15, designTemplate), false);

    // Draft variant is never compatible
    assert.equal(isMaterialCompatibleWithModel(draftVariant, modelIphone15, designTemplate), false);

    // iPhone 16 Pro is not in designTemplate or glassVariant -> false
    assert.equal(isMaterialCompatibleWithModel(matteVariant, modelIphone16Pro, designTemplate), false);
    assert.equal(isMaterialCompatibleWithModel(glassVariant, modelIphone16Pro, designTemplate), false);

    // Configured variant is NOT hidden solely because unrelated generic catalog lookup is missing
    assert.equal(isMaterialCompatibleWithModel(matteVariant, modelIphone15, null), true);
  });

  it("handles single-material product fallback preserving single-material behavior", async () => {
    const { listMaterialVariants } = await import("../constants/templateProducts.js");
    const singleProduct = {
      id: "single-1",
      title: "Solo Minimalist Case",
      slug: "solo-minimalist-case",
      case_type: "silicone",
      price: 299,
      stock: 10,
    };
    const variants = listMaterialVariants(singleProduct);
    assert.equal(variants.length, 1);
    assert.equal(variants[0].id, "single-1");
    assert.equal(variants[0].case_type, "silicone");
  });

  it("switches product properties when productFromMaterial is called with sibling variant", async () => {
    const { productFromMaterial } = await import("../constants/templateProducts.js");
    const rootTemplate = {
      id: "tpl-root",
      title: "Cyberpunk Art Case",
      slug: "cyberpunk-art-case",
      case_type: "matte",
      material: "Matte Polycarbonate",
      price: 399,
      description: "Root matte description",
    };
    const glassSibling = {
      id: "sibling-glass",
      title: "Cyberpunk Art Case",
      slug: "cyberpunk-art-case-glass",
      case_type: "glass",
      material: "Tempered Glass",
      price: 499,
      effective_price: 499,
      description: "Glass finish description",
    };
    const active = productFromMaterial(rootTemplate, glassSibling);
    assert.equal(active.id, "sibling-glass");
    assert.equal(active.slug, "cyberpunk-art-case-glass");
    assert.equal(active.case_type, "glass");
    assert.equal(active.material, "Tempered Glass");
    assert.equal(active.price, 499);
    assert.equal(active.effective_price, 499);
    assert.equal(active.description, "Glass finish description");
  });
});


