const DEFAULT_API_URL = "https://api.postalpincode.in/pincode";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;

const lookupCache = new Map();

function clean(value, maxLength = 120) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function formatIndianAddress(address) {
  const locality = [address.city_area, address.district]
    .map((value) => clean(value))
    .filter((value, index, values) =>
      value && values.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index
    );
  const parts = [
    clean(address.house_no_flat),
    clean(address.building_name),
    clean(address.street),
    address.landmark ? `Landmark: ${clean(address.landmark)}` : "",
    address.post_office ? `${clean(address.post_office)} P.O.` : "",
    ...locality,
    [clean(address.state), clean(address.pincode, 6)].filter(Boolean).join(" - "),
    clean(address.country) || "India",
  ];
  return parts.filter(Boolean).join(", ");
}

function normalizeOrderAddress(input) {
  const pincode = clean(input.pincode, 6);
  const hasStructuredFields = [
    "house_no_flat",
    "building_name",
    "street",
    "landmark",
    "district",
    "city_area",
    "post_office",
    "country",
  ].some((key) => input[key] != null && String(input[key]).trim());

  const address = {
    house_no_flat: clean(
      hasStructuredFields ? input.house_no_flat : input.address,
      120
    ),
    building_name: clean(input.building_name, 120),
    street: clean(input.street, 160),
    landmark: clean(input.landmark, 120),
    country: clean(input.country, 80) || "India",
    state: clean(input.state, 80),
    district: clean(input.district, 100),
    city_area: clean(input.city_area, 120),
    post_office: clean(input.post_office, 120),
    pincode,
  };

  if (!address.house_no_flat || !address.state || !address.pincode) {
    return { error: "Complete all required shipping fields" };
  }
  if (!/^\d{6}$/.test(address.pincode)) {
    return { error: "Pincode must be 6 digits" };
  }
  if (address.country.toLowerCase() !== "india") {
    return { error: "Shipping is currently available only within India" };
  }
  if (
    hasStructuredFields &&
    (!address.street || !address.district || !address.city_area || !address.post_office)
  ) {
    return { error: "Complete the address and select a valid post office" };
  }

  address.country = "India";
  const formatted_address = formatIndianAddress(address);
  return {
    address: {
      ...address,
      formatted_address,
      // Keep the existing field populated for older admin and tracking clients.
      address: formatted_address,
    },
  };
}

function parseIndiaPostResponse(payload, pincode) {
  const result = Array.isArray(payload) ? payload[0] : null;
  const offices = Array.isArray(result?.PostOffice) ? result.PostOffice : [];
  if (String(result?.Status || "").toLowerCase() !== "success" || offices.length === 0) {
    return null;
  }

  const normalizedOffices = offices
    .map((office) => ({
      name: clean(office?.Name),
      city_area: clean(
        office?.Block || office?.Taluk || office?.Division || office?.Region || office?.Name
      ),
    }))
    .filter((office) => office.name);

  const uniqueOffices = normalizedOffices.filter(
    (office, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.name.toLowerCase() === office.name.toLowerCase() &&
          candidate.city_area.toLowerCase() === office.city_area.toLowerCase()
      ) === index
  );
  if (!uniqueOffices.length) return null;

  const first = offices[0];
  return {
    pincode,
    country: clean(first.Country) || "India",
    state: clean(first.State),
    district: clean(first.District),
    city_area: uniqueOffices[0].city_area,
    post_office: uniqueOffices[0].name,
    post_offices: uniqueOffices,
  };
}

async function fetchIndiaPostPincode(
  pincode,
  {
    fetchImpl = global.fetch,
    baseUrl = process.env.INDIA_POST_API_URL || DEFAULT_API_URL,
    timeoutMs = Number(process.env.INDIA_POST_API_TIMEOUT_MS) || 5000,
  } = {}
) {
  if (!/^\d{6}$/.test(String(pincode || ""))) {
    const error = new Error("Pincode must be 6 digits");
    error.code = "INVALID_PINCODE";
    throw error;
  }

  const cached = lookupCache.get(pincode);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) lookupCache.delete(pincode);

  if (typeof fetchImpl !== "function") {
    const error = new Error("India Post lookup is unavailable");
    error.code = "UPSTREAM_ERROR";
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}/${pincode}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error("India Post service returned an error");
      error.code = "UPSTREAM_ERROR";
      throw error;
    }
    const value = parseIndiaPostResponse(await response.json(), pincode);
    if (!value) {
      const error = new Error("No delivery post office found for this pincode");
      error.code = "PINCODE_NOT_FOUND";
      throw error;
    }

    if (lookupCache.size >= MAX_CACHE_ENTRIES) {
      lookupCache.delete(lookupCache.keys().next().value);
    }
    lookupCache.set(pincode, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("India Post lookup timed out");
      timeoutError.code = "UPSTREAM_TIMEOUT";
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  formatIndianAddress,
  normalizeOrderAddress,
  parseIndiaPostResponse,
  fetchIndiaPostPincode,
};
