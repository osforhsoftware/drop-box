const test = require("node:test");
const assert = require("node:assert/strict");
const {
  safeNextPath,
  createOAuthContext,
  readOAuthContext,
  frontendLoginUrl,
} = require("./googleAuth");

test("safeNextPath allows relative app paths and blocks open redirects", () => {
  assert.equal(safeNextPath("/checkout"), "/checkout");
  assert.equal(safeNextPath("/profile?tab=orders"), "/profile?tab=orders");
  assert.equal(safeNextPath("https://evil.example"), "/");
  assert.equal(safeNextPath("//evil.example"), "/");
  assert.equal(safeNextPath("/admin"), "/");
  assert.equal(safeNextPath("/admin/orders"), "/");
  assert.equal(safeNextPath(""), "/");
});

test("oauth state is rejected when the cookie nonce does not match", () => {
  const secret = "test-secret-that-is-at-least-32-chars";
  const ctx = createOAuthContext({ next: "/checkout", jwtSecret: secret });
  assert.equal(readOAuthContext(ctx.cookieValue, ctx.nonce, secret).next, "/checkout");
  assert.equal(readOAuthContext(ctx.cookieValue, "forged-state", secret), null);
  assert.equal(readOAuthContext(ctx.cookieValue, ctx.nonce, "other-secret-that-is-at-least-32-chars"), null);
});

test("frontend login redirect keeps next and never embeds secrets in error", () => {
  const url = frontendLoginUrl("http://localhost:3000", { next: "/checkout", error: "google" });
  assert.equal(url, "http://localhost:3000/login?error=google&next=%2Fcheckout");
});
