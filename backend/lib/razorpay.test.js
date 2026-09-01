const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const {
  getRazorpayConfig,
  rupeesToPaise,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  publicSettings,
  settingsUpdateFromBody,
  paidUpdateFromPayment,
  webhookPaymentEntity,
} = require("./razorpay");

test("rupeesToPaise rounds to integer paise", () => {
  assert.equal(rupeesToPaise(579), 57900);
  assert.equal(rupeesToPaise("499.5"), 49950);
  assert.equal(rupeesToPaise(0), null);
  assert.equal(rupeesToPaise(-10), null);
});

test("getRazorpayConfig treats placeholder secrets as unset", () => {
  const cfg = getRazorpayConfig({
    RAZORPAY_KEY_ID: "rzp_test_abc",
    RAZORPAY_KEY_SECRET: "change_me_razorpay_key_secret",
    RAZORPAY_WEBHOOK_SECRET: "change_me_webhook_secret",
  });
  assert.equal(cfg.configured, false);
  assert.equal(cfg.webhookConfigured, false);
});

test("getRazorpayConfig is ready when live-style keys are present", () => {
  const cfg = getRazorpayConfig({
    RAZORPAY_KEY_ID: "rzp_test_abc",
    RAZORPAY_KEY_SECRET: "real_secret_value",
    RAZORPAY_WEBHOOK_SECRET: "whsec_real",
  });
  assert.equal(cfg.configured, true);
  assert.equal(cfg.webhookConfigured, true);
});

test("checkout signature matches Razorpay HMAC format", () => {
  const keySecret = "test_secret";
  const razorpay_order_id = "order_ABC";
  const razorpay_payment_id = "pay_XYZ";
  const razorpay_signature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  assert.equal(
    verifyCheckoutSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret }),
    true
  );
  assert.equal(
    verifyCheckoutSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: "0".repeat(64),
      keySecret,
    }),
    false
  );
});

test("webhook signature is HMAC of the raw body", () => {
  const secret = "whsec";
  const raw = Buffer.from('{"event":"payment.captured"}');
  const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifyWebhookSignature(raw, signature, secret), true);
  assert.equal(verifyWebhookSignature(raw, "deadbeef", secret), false);
});

test("publicSettings overlays env key id and never exposes secrets", () => {
  const out = publicSettings(
    { upi_id: "a@upi", payment_method: "razorpay", razorpay_key_secret: "leak" },
    { RAZORPAY_KEY_ID: "rzp_live_from_env", RAZORPAY_KEY_SECRET: "hidden" }
  );
  assert.equal(out.razorpay_key_id, "rzp_live_from_env");
  assert.equal(out.payment_method, "razorpay");
  assert.equal(out.razorpay_key_secret, undefined);
});

test("settings PUT ignores client key id when env already has one", () => {
  const update = settingsUpdateFromBody(
    { payment_method: "razorpay", razorpay_key_id: "rzp_client", razorpay_key_secret: "nope" },
    { RAZORPAY_KEY_ID: "rzp_env", RAZORPAY_KEY_SECRET: "hidden" }
  );
  assert.equal(update.payment_method, "razorpay");
  assert.equal(update.razorpay_key_id, undefined);
  assert.equal(update.razorpay_key_secret, undefined);
});

test("paidUpdateFromPayment advances delivery only from pending verification", () => {
  const pending = paidUpdateFromPayment(
    { delivery_status: "pending_payment_verification", razorpay_order_id: "order_1" },
    { id: "pay_1", order_id: "order_1", method: "upi", amount: 57900, status: "captured" }
  );
  assert.equal(pending.payment_status, "approved");
  assert.equal(pending.delivery_status, "payment_approved");

  const later = paidUpdateFromPayment(
    { delivery_status: "shipped" },
    { id: "pay_1", order_id: "order_1", method: "card", amount: 100, status: "captured" }
  );
  assert.equal(later.delivery_status, undefined);
  assert.equal(later.payment_status, "approved");
});

test("webhookPaymentEntity reads nested Razorpay payload", () => {
  const entity = webhookPaymentEntity({
    payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
  });
  assert.equal(entity.id, "pay_1");
});
