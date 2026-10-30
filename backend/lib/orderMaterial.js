const { caseTypeLabelFromMap } = require("./designGroup");
const { CASE_TYPE_ALIASES } = require("./templateProducts");

function buildCaseTypeLabelMap(docs) {
  const map = {};
  for (const doc of docs || []) {
    const slug = String(doc?.slug || "").trim().toLowerCase();
    if (!slug) continue;
    map[slug] = { label: doc.name || doc.label || slug };
  }
  return map;
}

function snapshotOrderMaterial(line, labelMap = {}) {
  const template = line?.templateProduct || {};
  const product = line?.product || {};
  const isGenericProduct = !product.slug || product.slug === "generic";

  const case_type = String(
    (!isGenericProduct ? product.slug : null) ||
    template.case_type ||
    product.slug ||
    line?.case_type ||
    ""
  ).trim() || null;

  const tCase = String(template.case_type || "").trim().toLowerCase();
  const pSlug = String(product.slug || "").trim().toLowerCase();
  const isDefaultMaterial = Boolean(
    tCase && pSlug && (tCase === pSlug || CASE_TYPE_ALIASES?.[tCase]?.includes(pSlug))
  );

  const material = String(
    product.material ||
    (isDefaultMaterial ? template.material : null) ||
    line?.material ||
    (!isGenericProduct && product.name ? product.name : null) ||
    template.material ||
    ""
  ).trim() || null;

  const case_type_label = String(
    line?.case_type_label ||
    template.case_type_label ||
    (!isGenericProduct && product.name ? product.name : null) ||
    caseTypeLabelFromMap(case_type, labelMap) ||
    product.name ||
    ""
  ).trim() || null;

  return { case_type, case_type_label, material };
}

function orderMaterialLabel(item) {
  if (!item) return "";
  return String(
    item.case_type_label || item.material || item.product_name || ""
  ).trim();
}

module.exports = {
  buildCaseTypeLabelMap,
  snapshotOrderMaterial,
  orderMaterialLabel,
};
