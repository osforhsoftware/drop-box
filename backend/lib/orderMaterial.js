const { caseTypeLabelFromMap } = require("./designGroup");

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
  const case_type = String(
    template.case_type || product.slug || line?.case_type || ""
  ).trim() || null;
  const material = String(template.material || line?.material || "").trim() || null;
  const case_type_label = String(
    line?.case_type_label
    || caseTypeLabelFromMap(case_type, labelMap)
    || product.name
    || ""
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
