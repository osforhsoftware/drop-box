function normalizeModelCaseTypes(value) {
  if (value === undefined) return { value: undefined };

  let entries = value;
  if (typeof entries === "string") {
    try {
      entries = JSON.parse(entries);
    } catch {
      return { error: "case_types must be a JSON array" };
    }
  }

  if (!Array.isArray(entries)) {
    return { error: "case_types must be an array" };
  }

  const seen = new Set();
  const normalized = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      return { error: "Each case type configuration must be an object" };
    }
    const caseTypeId = String(entry.case_type_id || "").trim();
    const price = Number(entry.price);
    if (!caseTypeId) {
      return { error: "Each case type configuration requires case_type_id" };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Each selected case type requires a valid price" };
    }
    if (seen.has(caseTypeId)) {
      return { error: "A case type can only be configured once per model" };
    }
    seen.add(caseTypeId);
    normalized.push({
      case_type_id: caseTypeId,
      price: Math.round(price * 100) / 100,
      status: entry.status !== false,
    });
  }

  return { value: normalized };
}

function modelCaseTypeIsEnabled(relation, product) {
  return Boolean(relation && relation.status !== false && product?.is_active !== false);
}

function withModelPrice(product, relation) {
  if (!product || !relation) return null;
  return {
    ...product,
    price: relation.price,
    model_case_type_id: relation.id,
    model_case_type_status: relation.status !== false,
  };
}

module.exports = {
  normalizeModelCaseTypes,
  modelCaseTypeIsEnabled,
  withModelPrice,
};
