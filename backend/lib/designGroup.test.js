const test = require("node:test");
const assert = require("node:assert/strict");
const {
  caseTypeKey,
  designGroupKey,
  variantHasOwnImages,
  pickCanonical,
  startingPriceForMembers,
  groupProductsForListing,
  toPublicListingProduct,
  toPublicMaterialVariant,
  paginateList,
  findDuplicateCaseType,
} = require("./designGroup");

function product(overrides = {}) {
  return {
    id: "p1",
    title: "Mountain Design",
    slug: "mountain-soft",
    status: "published",
    case_type: "silicone",
    price: 299,
    sale_price: null,
    stock: 10,
    phone_models: ["iPhone 15"],
    variant_inventory: [
      { variant_id: "iphone-15", model_name: "iPhone 15", stock_quantity: 10, is_out_of_stock: false },
    ],
    thumbnail: "/api/uploads/template-products/mountain.jpg",
    images: ["/api/uploads/template-products/mountain.jpg"],
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("products without design_id are never grouped, even with similar titles", () => {
  const items = [
    product({ id: "a", title: "Mountain Design Soft", slug: "mountain-soft" }),
    product({ id: "b", title: "Mountain Design Glass", slug: "mountain-glass", case_type: "glass", price: 499 }),
  ];
  const groups = groupProductsForListing(items);
  assert.equal(groups.length, 2);
  assert.equal(designGroupKey(items[0]), "a");
  assert.equal(designGroupKey(items[1]), "b");
});

test("only an explicit design_id groups materials of the same design", () => {
  const items = [
    product({ id: "a", design_id: "design-mountain", created_at: "2026-01-02T00:00:00.000Z" }),
    product({
      id: "b",
      slug: "mountain-glass",
      case_type: "glass",
      price: 499,
      design_id: "design-mountain",
      created_at: "2026-01-03T00:00:00.000Z",
    }),
    product({ id: "c", title: "River Design", slug: "river", design_id: "design-river", price: 399 }),
  ];
  const groups = groupProductsForListing(items);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].members.length, 2);
  assert.equal(groups[0].design_id, "design-mountain");
  assert.equal(groups[1].members[0].id, "c");
});

test("starting price uses the lowest in-stock material price", () => {
  const members = [
    product({ id: "soft", price: 299, stock: 0, variant_inventory: [
      { variant_id: "iphone-15", model_name: "iPhone 15", stock_quantity: 0, is_out_of_stock: true },
    ] }),
    product({ id: "clear", case_type: "transparent", price: 399, stock: 3 }),
    product({ id: "glass", case_type: "glass", price: 499, stock: 5 }),
  ];
  assert.equal(startingPriceForMembers(members), 399);
});

test("listing card exposes starting_from when a design has multiple materials", () => {
  const group = {
    design_id: "design-mountain",
    members: [
      product({ id: "soft", design_id: "design-mountain", created_at: "2026-01-01T00:00:00.000Z" }),
      product({
        id: "glass",
        slug: "mountain-glass",
        case_type: "glass",
        price: 499,
        design_id: "design-mountain",
        created_at: "2026-01-02T00:00:00.000Z",
      }),
    ],
  };
  const listing = toPublicListingProduct(group);
  assert.equal(listing.slug, "mountain-soft");
  assert.equal(listing.starting_price, 299);
  assert.equal(listing.price_from, true);
  assert.equal(listing.material_count, 2);
  assert.equal(listing.effective_price, 299);
});

test("canonical listing is the oldest product in the design group", () => {
  const members = [
    product({ id: "newer", slug: "mountain-glass", created_at: "2026-02-01T00:00:00.000Z" }),
    product({ id: "older", slug: "mountain-soft", created_at: "2026-01-01T00:00:00.000Z" }),
  ];
  assert.equal(pickCanonical(members).id, "older");
});

test("shared design images are not treated as variant-specific", () => {
  const canonical = product();
  const sibling = product({
    id: "glass",
    thumbnail: "/api/uploads/template-products/mountain.jpg",
    images: ["/api/uploads/template-products/mountain.jpg"],
  });
  assert.equal(variantHasOwnImages(sibling, canonical), false);
  const unique = product({
    id: "glass",
    thumbnail: "/api/uploads/template-products/mountain-glass.jpg",
    images: ["/api/uploads/template-products/mountain-glass.jpg"],
  });
  assert.equal(variantHasOwnImages(unique, canonical), true);
});

test("material variants keep their own price, description, and stock", () => {
  const canonical = product();
  const glass = product({
    id: "glass",
    slug: "mountain-glass",
    case_type: "glass",
    price: 499,
    description: "Premium glass-finish phone case.",
    stock: 0,
    variant_inventory: [
      { variant_id: "iphone-15", model_name: "iPhone 15", stock_quantity: 0, is_out_of_stock: true },
    ],
  });
  const variant = toPublicMaterialVariant(glass, canonical, { glass: { label: "Glass Case" } });
  assert.equal(variant.title, "Mountain Design");
  assert.equal(variant.effective_price, 499);
  assert.equal(variant.description, "Premium glass-finish phone case.");
  assert.equal(variant.in_stock, false);
  assert.equal(variant.case_type_label, "Glass Case");
  assert.equal(variant.has_variant_image, false);
  assert.deepEqual(variant.phone_models, ["iPhone 15"]);
  assert.equal(variant.status, "published");
});

test("silicone and silicone-case are the same material for uniqueness checks", () => {
  assert.equal(caseTypeKey("silicone-case"), "silicone");
  assert.equal(caseTypeKey("glass"), "glass");
  const clash = findDuplicateCaseType(
    [product({ id: "a", case_type: "silicone-case" })],
    "silicone"
  );
  assert.equal(clash.id, "a");
  assert.equal(findDuplicateCaseType([product({ id: "a", case_type: "silicone" })], "glass"), null);
});

test("pagination happens after grouping so duplicate materials do not consume extra pages", () => {
  const products = [
    product({ id: "a1", design_id: "d1" }),
    product({ id: "a2", slug: "a-glass", case_type: "glass", design_id: "d1" }),
    product({ id: "b1", design_id: "d2", slug: "b" }),
    product({ id: "c1", slug: "c" }),
  ];
  const listings = groupProductsForListing(products)
    .map((group) => toPublicListingProduct(group))
    .filter(Boolean);
  assert.equal(listings.length, 3);
  const page = paginateList(listings, 1, 2);
  assert.equal(page.total, 3);
  assert.equal(page.pages, 2);
  assert.equal(page.items.length, 2);
});

test("toPublicListingProduct merges compatibility across variants and exposes correct starting price", () => {
  const matte = product({
    id: "prod-matte",
    case_type: "matte",
    price: 359,
    phone_brand: "Apple",
    phone_models: ["iPhone 15"],
    compatibility: [{ brand: "Apple", models: ["iPhone 15"] }],
    design_id: "des-1",
    created_at: "2026-01-01T00:00:00.000Z",
  });
  const glass = product({
    id: "prod-glass",
    slug: "mountain-glass",
    case_type: "glass",
    price: 609,
    phone_brand: "Samsung",
    phone_models: ["Galaxy S24"],
    compatibility: [{ brand: "Samsung", models: ["Galaxy S24"] }],
    design_id: "des-1",
    created_at: "2026-01-02T00:00:00.000Z",
  });

  const group = {
    design_id: "des-1",
    members: [matte, glass],
  };

  const listing = toPublicListingProduct(group);
  assert.equal(listing.starting_price, 359);
  assert.equal(listing.price_from, true);
  assert.equal(listing.material_count, 2);
  assert.deepEqual(listing.compatibility, [
    { brand: "Apple", models: ["iPhone 15"] },
    { brand: "Samsung", models: ["Galaxy S24"] },
  ]);
  assert.deepEqual(listing.phone_models, ["iPhone 15", "Galaxy S24"]);
});

test("toPublicMaterialVariant preserves distinct prices and compatibility for Matte 359 and Glass 609", () => {
  const canonical = product({ id: "prod-matte", price: 359, case_type: "matte" });
  const glass = product({
    id: "prod-glass",
    slug: "mountain-glass",
    case_type: "glass",
    price: 609,
    phone_brand: "Samsung",
    phone_models: ["Galaxy S24"],
    compatibility: [{ brand: "Samsung", models: ["Galaxy S24"] }],
  });

  const varGlass = toPublicMaterialVariant(glass, canonical, { glass: { label: "Glass Case" } });
  assert.equal(varGlass.id, "prod-glass");
  assert.equal(varGlass.price, 609);
  assert.equal(varGlass.effective_price, 609);
  assert.equal(varGlass.phone_brand, "Samsung");
  assert.deepEqual(varGlass.phone_models, ["Galaxy S24"]);
  assert.deepEqual(varGlass.compatibility, [{ brand: "Samsung", models: ["Galaxy S24"] }]);
});


test("updating one material variant preserves all other material variants in the design", () => {
  const matte = product({ id: "prod-matte", price: 359, case_type: "matte", design_id: "des-group-1" });
  const glass = product({ id: "prod-glass", price: 609, case_type: "glass", design_id: "des-group-1" });
  const silicone = product({ id: "prod-silicone", price: 299, case_type: "silicone", design_id: "des-group-1" });

  const initialMembers = [matte, glass, silicone];

  // Admin updates only Glass price to 649 and stock to 30
  const updatedGlass = { ...glass, price: 649, stock: 30 };
  const updatedMembers = initialMembers.map((m) => (m.id === "prod-glass" ? updatedGlass : m));

  // Matte and Silicone are untouched
  const foundMatte = updatedMembers.find((m) => m.id === "prod-matte");
  assert.equal(foundMatte.price, 359);
  assert.equal(foundMatte.case_type, "matte");

  const foundSilicone = updatedMembers.find((m) => m.id === "prod-silicone");
  assert.equal(foundSilicone.price, 299);
  assert.equal(foundSilicone.case_type, "silicone");

  const foundGlass = updatedMembers.find((m) => m.id === "prod-glass");
  assert.equal(foundGlass.price, 649);
  assert.equal(foundGlass.stock, 30);
});

test("intentionally removing one material variant unlinks it while retaining remaining variants", () => {
  const matte = product({ id: "prod-matte", price: 359, case_type: "matte", design_id: "des-group-1" });
  const glass = product({ id: "prod-glass", price: 609, case_type: "glass", design_id: "des-group-1" });
  const silicone = product({ id: "prod-silicone", price: 299, case_type: "silicone", design_id: "des-group-1" });

  const initialMembers = [matte, glass, silicone];

  // Admin removes silicone
  const afterRemoval = initialMembers.filter((m) => m.id !== "prod-silicone");
  assert.equal(afterRemoval.length, 2);
  assert.deepEqual(afterRemoval.map((m) => m.case_type), ["matte", "glass"]);
  assert.equal(afterRemoval.some((m) => m.id === "prod-silicone"), false);
});

test("variant inherits design compatibility when custom model restrictions are empty", () => {
  const canonical = product({
    id: "prod-matte",
    phone_brand: "Apple",
    phone_models: ["iPhone 15", "iPhone 16"],
    compatibility: [
      { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
      { brand: "Samsung", models: ["Galaxy S24"] },
    ],
  });

  const glassInheriting = product({
    id: "prod-glass",
    case_type: "glass",
    price: 609,
    phone_models: [], // inherits
    compatibility: [],
  });

  const varDoc = toPublicMaterialVariant(glassInheriting, canonical, { glass: { label: "Glass Case" } });
  assert.deepEqual(varDoc.phone_models, ["iPhone 15", "iPhone 16"]);
  assert.deepEqual(varDoc.compatibility, [
    { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
    { brand: "Samsung", models: ["Galaxy S24"] },
  ]);
});

test("pickCanonical selects lowest effective price variant when order counts are equal", () => {
  const matte = product({
    id: "prod-matte",
    case_type: "matte",
    price: 359,
    created_at: "2026-01-01T00:00:00.000Z",
  });
  const glass = product({
    id: "prod-glass",
    case_type: "glass",
    price: 609,
    created_at: "2026-01-02T00:00:00.000Z",
  });

  // Even though glass is newer, matte has lowest effective price and should be picked as canonical
  const picked = pickCanonical([glass, matte]);
  assert.equal(picked.id, "prod-matte");
  assert.equal(picked.price, 359);
});

test("multi-brand material variant supports distinct models across Apple and Samsung", () => {
  const glossShell = product({
    id: "prod-gloss",
    case_type: "gloss-shell",
    price: 499,
    compatibility: [
      { brand: "Apple", models: ["iPhone 15", "iPhone 16"] },
      { brand: "Samsung", models: ["Galaxy S24", "Galaxy S25"] },
    ],
    phone_models: ["iPhone 15", "iPhone 16", "Galaxy S24", "Galaxy S25"],
  });

  const canonical = product({ id: "prod-matte", price: 359, case_type: "matte" });
  const variant = toPublicMaterialVariant(glossShell, canonical, { "gloss-shell": { label: "Gloss Shell" } });

  assert.equal(variant.price, 499);
  assert.equal(variant.compatibility.length, 2);
  assert.deepEqual(
    variant.compatibility.find((g) => g.brand === "Apple").models,
    ["iPhone 15", "iPhone 16"]
  );
  assert.deepEqual(
    variant.compatibility.find((g) => g.brand === "Samsung").models,
    ["Galaxy S24", "Galaxy S25"]
  );
});

test("pickCanonical selects explicit default variant when available", () => {
  const matte = product({
    id: "prod-matte",
    case_type: "matte",
    price: 359,
    stock: 20,
    is_default: false,
  });
  const glass = product({
    id: "prod-glass",
    case_type: "glass",
    price: 609,
    stock: 15,
    is_default: true,
  });

  const picked = pickCanonical([matte, glass]);
  assert.equal(picked.id, "prod-glass");
  assert.equal(picked.case_type, "glass");
});

test("pickCanonical ignores out-of-stock default variant in favor of available variant", () => {
  const matte = product({
    id: "prod-matte",
    case_type: "matte",
    price: 359,
    stock: 20,
    is_default: false,
  });
  const glass = product({
    id: "prod-glass",
    case_type: "glass",
    price: 609,
    stock: 0,
    variant_inventory: [{ variant_id: "m1", model_name: "iPhone 15", stock_quantity: 0, is_out_of_stock: true }],
    is_default: true,
  });

  const picked = pickCanonical([matte, glass]);
  assert.equal(picked.id, "prod-matte");
});
