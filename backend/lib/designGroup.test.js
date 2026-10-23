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
  assert.equal(variant.effective_price, 499);
  assert.equal(variant.description, "Premium glass-finish phone case.");
  assert.equal(variant.in_stock, false);
  assert.equal(variant.case_type_label, "Glass Case");
  assert.equal(variant.has_variant_image, false);
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
