export const CUSTOMIZE_STEP_KEYS = ["brand", "model", "finish", "design"];

const STEP_ALIASES = {
  brand: 0,
  model: 1,
  finish: 2,
  case: 2,
  "case-type": 2,
  casetype: 2,
  product: 2,
  design: 3,
  customize: 3,
};

export function parseCustomizeStep(value) {
  const key = String(value || "").trim().toLowerCase();
  return STEP_ALIASES[key] ?? 0;
}

export function maxReachableStep(brand, model, product) {
  if (!brand) return 0;
  if (!model) return 1;
  if (!product) return 2;
  return 3;
}

export function canGoBackInHistory(historyLike = globalThis.history) {
  const index = historyLike?.state?.idx;
  return typeof index === "number" ? index > 0 : (historyLike?.length || 0) > 1;
}

export function buildCustomizeSearch(search, stepIndex) {
  const nextIndex = Math.max(0, Math.min(CUSTOMIZE_STEP_KEYS.length - 1, stepIndex));
  const nextParams = new URLSearchParams(search);
  nextParams.set("step", CUSTOMIZE_STEP_KEYS[nextIndex]);
  return `?${nextParams.toString()}`;
}
