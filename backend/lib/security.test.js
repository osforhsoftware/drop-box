const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isValidUploadUrl, productionConfigErrors } = require("./security");

test("isValidUploadUrl accepts stored upload paths and rejects foreign or traversal URLs", () => {
  assert.equal(isValidUploadUrl("/api/uploads/designs/abc.png"), true);
  assert.equal(isValidUploadUrl("https://api.example.com/api/uploads/payments/shot.webp"), true);
  assert.equal(isValidUploadUrl("https://evil.example/api/uploads/not-a-real-file"), false);
  assert.equal(isValidUploadUrl("/api/uploads/designs/../../.env"), false);
  assert.equal(isValidUploadUrl("https://evil.example/anything"), false);
});

test("productionConfigErrors only blocks a live server with placeholder secrets", () => {
  assert.deepEqual(productionConfigErrors({ NODE_ENV: "development", JWT_SECRET: "short" }), []);
  const problems = productionConfigErrors({
    NODE_ENV: "production",
    JWT_SECRET: "replace_with_long_random_secret_32plus_chars",
    CORS_ORIGINS: "",
    ADMIN_PASSWORD: "replace_with_strong_password",
  });
  assert.equal(problems.length, 3);
  assert.deepEqual(productionConfigErrors({
    NODE_ENV: "production",
    JWT_SECRET: "a".repeat(40),
    CORS_ORIGINS: "https://caseboxstore.com",
    ADMIN_PASSWORD: "correct-horse-battery",
  }), []);
});
