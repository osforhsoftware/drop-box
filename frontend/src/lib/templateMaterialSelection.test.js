import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getUpdatedTemplateTitle,
  getUpdatedProductDescription,
  getMaterialSpecification,
  getModelPrice,
  syncVariantRows,
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

  it("supports multi-brand compatibility in parent templates and material variants", async () => {
    const { isMaterialCompatibleWithModel, normalizeProductCompatibility } = await import("../constants/templateProducts.js");
    const multiBrandTemplate = {
      id: "tpl-multi",
      compatibility: [
        { brand: "Samsung", models: ["Galaxy S24 Ultra"] },
        { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
      ],
      phone_models: ["Galaxy S24 Ultra", "iPhone 15", "iPhone 16"],
    };

    const s24 = { id: "mod-s24", name: "Galaxy S24 Ultra" };
    const ip15 = { id: "mod-15", name: "iPhone 15" };
    const pixel8 = { id: "mod-px8", name: "Pixel 8 Pro" };

    const inheritingVariant = {
      id: "v-inheriting",
      case_type: "silicone",
      status: "published",
      phone_models: [],
    };

    // Both Samsung and Apple models are compatible when inherited
    assert.equal(isMaterialCompatibleWithModel(inheritingVariant, s24, multiBrandTemplate), true);
    assert.equal(isMaterialCompatibleWithModel(inheritingVariant, ip15, multiBrandTemplate), true);
    // Unrelated brand model is not compatible
    assert.equal(isMaterialCompatibleWithModel(inheritingVariant, pixel8, multiBrandTemplate), false);

    // Normalizing legacy single-brand product
    const legacy = { id: "leg-1", phone_brand: "Apple", phone_models: ["iPhone 15"] };
    assert.deepEqual(normalizeProductCompatibility(legacy), [
      { brand: "Apple", models: ["iPhone 15"] },
    ]);
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

  it("getDesignCompatibility aggregates and deduplicates brands and models across variants", async () => {
    const { getDesignCompatibility } = await import("../constants/templateProducts.js");
    const multiVariantTemplate = {
      id: "tpl-matte",
      phone_brand: "Apple",
      phone_models: ["iPhone 15", "iPhone 15 Pro"],
      compatibility: [
        { brand: "Apple", models: ["iPhone 15", "iPhone 15 Pro"] },
      ],
      material_variants: [
        {
          id: "tpl-glass",
          case_type: "glass",
          phone_brand: "Samsung",
          phone_models: ["Galaxy S24"],
          compatibility: [
            { brand: "Samsung", models: ["Galaxy S24"] },
            { brand: "Apple", models: ["iPhone 15 Pro", "iPhone 16"] },
          ],
        },
      ],
    };

    const designCompat = getDesignCompatibility(multiVariantTemplate);
    assert.equal(designCompat.length, 2);

    const appleGroup = designCompat.find((c) => c.brand.toLowerCase() === "apple");
    assert.ok(appleGroup);
    assert.deepEqual(appleGroup.models, ["iPhone 15", "iPhone 15 Pro", "iPhone 16"]);

    const samsungGroup = designCompat.find((c) => c.brand.toLowerCase() === "samsung");
    assert.ok(samsungGroup);
    assert.deepEqual(samsungGroup.models, ["Galaxy S24"]);
  });

  it("switches accurately between Matte at ₹359 and Glass at ₹609 variants", async () => {
    const { productFromMaterial } = await import("../constants/templateProducts.js");
    const matteTemplate = {
      id: "tpl-matte-359",
      title: "Neon Cyber Design",
      slug: "neon-cyber-matte",
      case_type: "matte",
      case_type_label: "Matte Case",
      material: "Matte Polycarbonate",
      price: 359,
      sale_price: null,
      effective_price: 359,
      stock: 50,
      description: "Durable matte satin finish with shock protection.",
      images: ["/uploads/neon-cyber-matte.jpg"],
      compatibility: [{ brand: "Apple", models: ["iPhone 15"] }],
      phone_models: ["iPhone 15"],
    };

    const glassVariant = {
      id: "tpl-glass-609",
      title: "Neon Cyber Design",
      slug: "neon-cyber-glass",
      case_type: "glass",
      case_type_label: "Toughened Glass Case",
      material: "9H Tempered Glass",
      price: 609,
      sale_price: 599,
      effective_price: 599,
      stock: 20,
      has_variant_image: true,
      images: ["/uploads/neon-cyber-glass.jpg"],
      description: "Ultra-glossy 9H tempered glass backplate with anti-scratch coating.",
      compatibility: [{ brand: "Apple", models: ["iPhone 15", "iPhone 15 Pro Max"] }],
      phone_models: ["iPhone 15", "iPhone 15 Pro Max"],
    };

    // Selecting glass variant updates price from 359 to 599 (or 609), material, specs, and gallery images
    const active = productFromMaterial(matteTemplate, glassVariant);
    assert.equal(active.id, "tpl-glass-609");
    assert.equal(active.slug, "neon-cyber-glass");
    assert.equal(active.case_type, "glass");
    assert.equal(active.case_type_label, "Toughened Glass Case");
    assert.equal(active.material, "9H Tempered Glass");
    assert.equal(active.price, 609);
    assert.equal(active.sale_price, 599);
    assert.equal(active.effective_price, 599);
    assert.equal(active.stock, 20);
    assert.deepEqual(active.images, ["/uploads/neon-cyber-glass.jpg"]);
    assert.deepEqual(active.phone_models, ["iPhone 15", "iPhone 15 Pro Max"]);
    assert.equal(active.description, "Ultra-glossy 9H tempered glass backplate with anti-scratch coating.");
  });

  it("materialLabel prioritizes template_product case_type_label and material over blank product name", async () => {
    const { materialLabel } = await import("../constants/templateProducts.js");
    const cartItem = {
      template_product: {
        case_type: "glass",
        case_type_label: "Glass Case",
        material: "Tempered Glass",
      },
      product: {
        name: "Standard Matte Case",
        slug: "matte",
      },
    };
    assert.equal(materialLabel(cartItem), "Glass Case");

    const cartItemFallback = {
      template_product: {
        material: "Tempered Glass",
      },
      product: {
        name: "Standard Matte Case",
      },
    };
    assert.equal(materialLabel(cartItemFallback), "Tempered Glass");
  });

  it("evaluates active in-stock materials to determine material selector visibility", async () => {
    const { isMaterialCompatibleWithModel, productHasAvailableStock } = await import("../constants/templateProducts.js");
    const selectedModel = { id: "m-15", name: "iPhone 15" };
    const designTemplate = {
      id: "tpl-1",
      phone_models: ["iPhone 15"],
    };

    const inStockMatte = {
      id: "v-matte",
      case_type: "matte",
      status: "published",
      stock: 10,
      phone_models: ["iPhone 15"],
    };

    const inStockGlass = {
      id: "v-glass",
      case_type: "glass",
      status: "published",
      stock: 15,
      phone_models: ["iPhone 15"],
    };

    const outOfStockSilicone = {
      id: "v-silicone",
      case_type: "silicone",
      status: "published",
      stock: 0,
      phone_models: ["iPhone 15"],
    };

    const allMaterials = [inStockMatte, inStockGlass, outOfStockSilicone];
    const compatible = allMaterials.filter((m) => isMaterialCompatibleWithModel(m, selectedModel, designTemplate));
    assert.equal(compatible.length, 3);

    const activeInStock = compatible.filter((m) => {
      const isPublished = (m.status || "published") === "published";
      const hasStock = productHasAvailableStock(m);
      return isPublished && hasStock;
    });

    // When 2 materials are in stock, selector condition is met (> 1)
    assert.equal(activeInStock.length, 2);
    const showMaterialSelector = activeInStock.length > 1;
    assert.equal(showMaterialSelector, true);

    // If Glass also runs out of stock, only Matte remains
    inStockGlass.stock = 0;
    const remainingInStock = compatible.filter((m) => (m.status || "published") === "published" && productHasAvailableStock(m));
    assert.equal(remainingInStock.length, 1);
    assert.equal(remainingInStock.length > 1, false);
  });

  it("aggregates design compatibility across template and variants so all brands are available", async () => {
    const { getDesignCompatibility } = await import("../constants/templateProducts.js");

    const template = {
      id: "tpl-root",
      case_type: "matte",
      compatibility: [
        { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
      ],
      material_variants: [
        {
          id: "tpl-var-glass",
          case_type: "glass",
          compatibility: [
            { brand: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S25"] },
          ],
        },
      ],
    };

    const combined = getDesignCompatibility(template);
    assert.equal(combined.length, 2);

    const appleGroup = combined.find((g) => g.brand === "Apple");
    const samsungGroup = combined.find((g) => g.brand === "Samsung");

    assert.ok(appleGroup);
    assert.deepEqual(appleGroup.models, ["iPhone 15", "iPhone 16"]);
    assert.ok(samsungGroup);
    assert.deepEqual(samsungGroup.models, ["Galaxy S24 Ultra", "Galaxy S25"]);
  });

  it("preserves Samsung when editing Apple models in compatibility", () => {
    // Simulating admin form state updating one brand group
    const initialCompatibility = [
      { brand: "Apple", models: ["iPhone 15"] },
      { brand: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S25"] },
    ];

    // Admin edits Apple to add iPhone 16
    const updatedCompatibility = initialCompatibility.map((group) => {
      if (group.brand === "Apple") {
        return { ...group, models: ["iPhone 15", "iPhone 16"] };
      }
      return group;
    });

    assert.equal(updatedCompatibility.length, 2);
    const apple = updatedCompatibility.find((g) => g.brand === "Apple");
    const samsung = updatedCompatibility.find((g) => g.brand === "Samsung");

    assert.deepEqual(apple.models, ["iPhone 15", "iPhone 16"]);
    assert.deepEqual(samsung.models, ["Galaxy S24 Ultra", "Galaxy S25"]);
  });

  it("removes only the targeted brand when intentionally deleting Apple", () => {
    const initialCompatibility = [
      { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
      { brand: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S25"] },
    ];

    // Admin intentionally deletes Apple
    const filteredCompatibility = initialCompatibility.filter((g) => g.brand !== "Apple");

    assert.equal(filteredCompatibility.length, 1);
    assert.equal(filteredCompatibility[0].brand, "Samsung");
    assert.deepEqual(filteredCompatibility[0].models, ["Galaxy S24 Ultra", "Galaxy S25"]);
  });

  it("preserves Matte variant when editing Glass variant price and stock", () => {
    const initialVariants = [
      { id: "var-matte", case_type: "matte", price: 359, stock: 20 },
      { id: "var-glass", case_type: "glass", price: 609, stock: 15 },
    ];

    // Admin updates Glass price from 609 to 629 and stock to 12
    const updatedVariants = initialVariants.map((v) => {
      if (v.id === "var-glass") {
        return { ...v, price: 629, stock: 12 };
      }
      return v;
    });

    assert.equal(updatedVariants.length, 2);
    const matte = updatedVariants.find((v) => v.id === "var-matte");
    const glass = updatedVariants.find((v) => v.id === "var-glass");

    assert.equal(matte.price, 359);
    assert.equal(matte.stock, 20);
    assert.equal(glass.price, 629);
    assert.equal(glass.stock, 12);
  });

  it("removes only the selected variant when intentionally unlinking a variant", () => {
    const initialVariants = [
      { id: "var-matte", case_type: "matte", price: 359 },
      { id: "var-glass", case_type: "glass", price: 609 },
      { id: "var-silicone", case_type: "silicone", price: 299 },
    ];

    // Admin unlinks silicone
    const remaining = initialVariants.filter((v) => v.id !== "var-silicone");

    assert.equal(remaining.length, 2);
    assert.deepEqual(remaining.map((v) => v.case_type), ["matte", "glass"]);
  });

  it("+ Add brand: adding brand from catalog preserves existing brands and models", () => {
    const currentCompatibility = [
      { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
    ];
    const newBrandName = "OnePlus";

    // Simulating handleBrandSelect logic
    const exists = currentCompatibility.some(
      (g) => g.brand.toLowerCase() === newBrandName.toLowerCase()
    );
    const updatedCompat = exists
      ? currentCompatibility
      : [...currentCompatibility, { brand: newBrandName, models: [] }];

    assert.equal(updatedCompat.length, 2);
    assert.deepEqual(updatedCompat[0], { brand: "Apple", models: ["iPhone 15", "iPhone 16"] });
    assert.deepEqual(updatedCompat[1], { brand: "OnePlus", models: [] });
  });

  it("+ Add brand: adding an already configured brand does not create duplicates", () => {
    const currentCompatibility = [
      { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
      { brand: "Samsung", models: ["Galaxy S24"] },
    ];
    const brandToSelect = "apple"; // lowercase

    const exists = currentCompatibility.some(
      (g) => g.brand.toLowerCase() === brandToSelect.toLowerCase()
    );
    const updatedCompat = exists
      ? currentCompatibility
      : [...currentCompatibility, { brand: brandToSelect, models: [] }];

    assert.equal(updatedCompat.length, 2);
    assert.deepEqual(updatedCompat[0].models, ["iPhone 15", "iPhone 16"]);
  });

  it("+ Add brand: correctly computes total selected models and model choices per brand", () => {
    const compatibility = [
      { brand: "Apple", models: ["iPhone 14", "iPhone 15", "iPhone 16"] },
      { brand: "Samsung", models: ["Galaxy S24 Ultra", "Galaxy S25"] },
      { brand: "Google", models: ["Pixel 8", "Pixel 9"] },
    ];

    const allModels = [...new Set(compatibility.flatMap((g) => g.models))];
    assert.equal(allModels.length, 7);
    assert.equal(compatibility[0].models.length, 3);
    assert.equal(compatibility[1].models.length, 2);
    assert.equal(compatibility[2].models.length, 2);
  });
  it("getModelPrice returns model-specific price when configured", () => {
    const template = {
      price: 499,
      sale_price: null,
      variants: [
        { model_name: "iPhone 12", price: 349, stock_quantity: 10 },
        { model_name: "iPhone 13 Pro", price: 399, sale_price: 369, stock_quantity: 6 },
        { model_name: "Galaxy S24", stock_quantity: 8 },
      ],
    };

    const p12 = getModelPrice(template, "iPhone 12");
    assert.equal(p12.price, 349);
    assert.equal(p12.sale_price, null);
    assert.equal(p12.effective_price, 349);

    const p13 = getModelPrice(template, "iPhone 13 Pro");
    assert.equal(p13.price, 399);
    assert.equal(p13.sale_price, 369);
    assert.equal(p13.effective_price, 369);

    const pS24 = getModelPrice(template, "Galaxy S24");
    assert.equal(pS24.price, 499);
    assert.equal(pS24.sale_price, null);
    assert.equal(pS24.effective_price, 499);
  });

  it("syncVariantRows preserves model prices, sale prices, and brands across edits", () => {
    const existingRows = [
      { model_name: "iPhone 12", stock_quantity: "10", price: "349", sale_price: "", brand: "Apple" },
      { model_name: "iPhone 13 Pro", stock_quantity: "6", price: "399", sale_price: "369", brand: "Apple" },
    ];
    const brandMap = {
      "iPhone 12": "Apple",
      "iPhone 13 Pro": "Apple",
      "Galaxy S24": "Samsung",
    };

    const nextRows = syncVariantRows(
      ["iPhone 12", "iPhone 13 Pro", "Galaxy S24"],
      existingRows,
      5,
      "499",
      "",
      brandMap
    );

    assert.equal(nextRows.length, 3);
    assert.equal(nextRows[0].price, "349");
    assert.equal(nextRows[0].brand, "Apple");
    assert.equal(nextRows[1].price, "399");
    assert.equal(nextRows[1].sale_price, "369");
    assert.equal(nextRows[2].model_name, "Galaxy S24");
    assert.equal(nextRows[2].price, "499");
    assert.equal(nextRows[2].brand, "Samsung");
  });

  it("handles product templates with null model prices falling back to base price (noew-case shape)", () => {
    const noewCaseTemplate = {
      id: "8fc676e2-259e-429e-a37d-e02f59cd504a",
      title: "noew case",
      slug: "noew-case",
      price: 242,
      sale_price: null,
      variants: [
        { variant_id: "iphone-13-pro", model_name: "iPhone 13 pro", price: null, sale_price: null },
        { variant_id: "iphone-14-pro", model_name: "iPhone 14 Pro", price: null, sale_price: null },
      ],
    };

    const price13 = getModelPrice(noewCaseTemplate, "iPhone 13 pro");
    assert.equal(price13.price, 242);
    assert.equal(price13.sale_price, null);
    assert.equal(price13.effective_price, 242);

    const priceFallback = getModelPrice(noewCaseTemplate, null);
    assert.equal(priceFallback.price, 242);
    assert.equal(priceFallback.effective_price, 242);

    const nullProductPrice = getModelPrice(null, "iPhone 13 pro");
    assert.equal(nullProductPrice.price, 0);
    assert.equal(nullProductPrice.effective_price, 0);
  });
});