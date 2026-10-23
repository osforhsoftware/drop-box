import assert from "node:assert/strict";
import test from "node:test";
import {
  CUSTOMIZE_STEP_KEYS,
  buildCustomizeSearch,
  canGoBackInHistory,
  maxReachableStep,
  parseCustomizeStep,
} from "./customizeNavigation.js";

test("parses customizer step query values", () => {
  assert.equal(parseCustomizeStep(), 0);
  assert.equal(parseCustomizeStep("brand"), 0);
  assert.equal(parseCustomizeStep("MODEL"), 1);
  assert.equal(parseCustomizeStep("finish"), 2);
  assert.equal(parseCustomizeStep("case-type"), 2);
  assert.equal(parseCustomizeStep("design"), 3);
  assert.equal(parseCustomizeStep("unknown"), 0);
});

test("clamps reachable steps to selected catalog data", () => {
  assert.equal(maxReachableStep(null, null, null), 0);
  assert.equal(maxReachableStep({ id: 1 }, null, null), 1);
  assert.equal(maxReachableStep({ id: 1 }, { id: 2 }, null), 2);
  assert.equal(maxReachableStep({ id: 1 }, { id: 2 }, { id: 3 }), 3);
});

test("builds history-friendly step search params", () => {
  assert.equal(buildCustomizeSearch("", 0), "?step=brand");
  assert.equal(buildCustomizeSearch("?step=brand", 1), "?step=model");
  assert.equal(buildCustomizeSearch("?step=model", 2), "?step=finish");
  assert.equal(buildCustomizeSearch("?step=finish", 3), "?step=design");
  assert.deepEqual(CUSTOMIZE_STEP_KEYS, ["brand", "model", "finish", "design"]);
});

test("detects whether browser history can pop a customizer step", () => {
  assert.equal(canGoBackInHistory({ state: { idx: 0 }, length: 4 }), false);
  assert.equal(canGoBackInHistory({ state: { idx: 2 }, length: 3 }), true);
  assert.equal(canGoBackInHistory({ state: {}, length: 2 }), true);
});
