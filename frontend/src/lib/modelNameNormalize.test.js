import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeModelKey,
  remapModelsToCatalog,
  resolveCatalogModelName,
} from "../constants/templateProducts.js";

describe("model name normalize helpers", () => {
  const catalog = [
    { id: "1", name: "Pixel 7 a" },
    { id: "2", name: "Pixel 8" },
    { id: "3", name: "Pixel 8 a" },
  ];

  it("normalizes spaced and unspaced suffixes the same way", () => {
    assert.equal(normalizeModelKey("Pixel 7a"), normalizeModelKey("Pixel 7 a"));
  });

  it("select-all style remap keeps only catalog models and canonical names", () => {
    const selected = remapModelsToCatalog(
      ["Pixel 7a", "Pixel 8", "Ghost Phone", "Pixel 8"],
      catalog
    );
    assert.deepEqual(selected, ["Pixel 7 a", "Pixel 8"]);
  });

  it("resolves catalog names for checkbox toggles", () => {
    assert.equal(resolveCatalogModelName("pixel 8a", catalog), "Pixel 8 a");
  });
});
