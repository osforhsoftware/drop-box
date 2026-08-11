const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeModelCaseTypes,
  modelCaseTypeIsEnabled,
  withModelPrice,
} = require("./modelCaseTypes");

test("model case types parse multipart JSON and normalize prices", () => {
  assert.deepEqual(
    normalizeModelCaseTypes('[{"case_type_id":"case-1","price":"499.129"}]'),
    {
      value: [{ case_type_id: "case-1", price: 499.13, status: true }],
    }
  );
});

test("model case types reject duplicates and invalid prices", () => {
  assert.match(
    normalizeModelCaseTypes([
      { case_type_id: "case-1", price: 499 },
      { case_type_id: "case-1", price: 599 },
    ]).error,
    /only be configured once/
  );
  assert.match(
    normalizeModelCaseTypes([{ case_type_id: "case-1", price: -1 }]).error,
    /valid price/
  );
});

test("availability requires an enabled mapping and active case type", () => {
  assert.equal(modelCaseTypeIsEnabled({ status: true }, { is_active: true }), true);
  assert.equal(modelCaseTypeIsEnabled({ status: false }, { is_active: true }), false);
  assert.equal(modelCaseTypeIsEnabled({ status: true }, { is_active: false }), false);
});

test("configured products expose the model-specific price", () => {
  assert.deepEqual(
    withModelPrice(
      { id: "case-1", name: "Silicone" },
      { id: "mapping-1", price: 499, status: true }
    ),
    {
      id: "case-1",
      name: "Silicone",
      price: 499,
      model_case_type_id: "mapping-1",
      model_case_type_status: true,
    }
  );
});
