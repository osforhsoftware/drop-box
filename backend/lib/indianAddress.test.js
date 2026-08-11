const test = require("node:test");
const assert = require("node:assert/strict");

const {
  formatIndianAddress,
  normalizeOrderAddress,
  parseIndiaPostResponse,
  fetchIndiaPostPincode,
} = require("./indianAddress");

const indiaPostPayload = [
  {
    Status: "Success",
    PostOffice: [
      {
        Name: "Connaught Place",
        Block: "New Delhi",
        District: "Central Delhi",
        State: "Delhi",
        Country: "India",
      },
      {
        Name: "Sansad Marg",
        Taluk: "New Delhi",
        District: "Central Delhi",
        State: "Delhi",
        Country: "India",
      },
    ],
  },
];

test("parses India Post results into checkout fields", () => {
  assert.deepEqual(parseIndiaPostResponse(indiaPostPayload, "110001"), {
    pincode: "110001",
    country: "India",
    state: "Delhi",
    district: "Central Delhi",
    city_area: "New Delhi",
    post_office: "Connaught Place",
    post_offices: [
      { name: "Connaught Place", city_area: "New Delhi" },
      { name: "Sansad Marg", city_area: "New Delhi" },
    ],
  });
});

test("returns null for an unknown pincode response", () => {
  assert.equal(
    parseIndiaPostResponse([{ Status: "Error", PostOffice: null }], "000000"),
    null
  );
});

test("formats and normalizes a structured Indian address", () => {
  const result = normalizeOrderAddress({
    house_no_flat: "42B",
    building_name: "Lotus Residency",
    street: "MG Road",
    landmark: "Near Metro Gate 2",
    country: "India",
    state: "Delhi",
    district: "Central Delhi",
    city_area: "New Delhi",
    post_office: "Connaught Place",
    pincode: "110001",
  });

  assert.equal(result.error, undefined);
  assert.equal(
    result.address.formatted_address,
    "42B, Lotus Residency, MG Road, Landmark: Near Metro Gate 2, Connaught Place P.O., New Delhi, Central Delhi, Delhi - 110001, India"
  );
  assert.equal(result.address.address, result.address.formatted_address);
});

test("accepts legacy address payloads for backwards compatibility", () => {
  const result = normalizeOrderAddress({
    address: "42B, MG Road",
    state: "Delhi",
    pincode: "110001",
  });

  assert.equal(result.error, undefined);
  assert.equal(result.address.house_no_flat, "42B, MG Road");
  assert.equal(result.address.country, "India");
});

test("rejects incomplete structured addresses", () => {
  const result = normalizeOrderAddress({
    house_no_flat: "42B",
    country: "India",
    state: "Delhi",
    district: "Central Delhi",
    pincode: "110001",
  });
  assert.equal(result.error, "Complete the address and select a valid post office");
});

test("fetches and parses an India Post lookup", async () => {
  const fetchImpl = async (url, options) => {
    assert.equal(url, "https://example.test/pincode/110001");
    assert.equal(options.headers.Accept, "application/json");
    return {
      ok: true,
      json: async () => indiaPostPayload,
    };
  };

  const result = await fetchIndiaPostPincode("110001", {
    fetchImpl,
    baseUrl: "https://example.test/pincode",
  });
  assert.equal(result.post_office, "Connaught Place");
});

test("rejects invalid pincodes before calling India Post", async () => {
  await assert.rejects(
    fetchIndiaPostPincode("123", { fetchImpl: async () => assert.fail("fetch called") }),
    { code: "INVALID_PINCODE" }
  );
});

test("formats an address without duplicating matching city and district", () => {
  assert.equal(
    formatIndianAddress({
      house_no_flat: "1",
      street: "Main Road",
      city_area: "Mumbai",
      district: "mumbai",
      state: "Maharashtra",
      pincode: "400001",
      country: "India",
    }),
    "1, Main Road, Mumbai, Maharashtra - 400001, India"
  );
});
