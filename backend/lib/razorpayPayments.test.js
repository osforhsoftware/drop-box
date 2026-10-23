const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

describe("razorpayPayments", () => {
  const prev = { ...process.env };

  before(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_example";
    process.env.RAZORPAY_KEY_SECRET = "test_secret_key_123";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test_secret";
  });

  after(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in prev)) delete process.env[key];
    }
    Object.assign(process.env, prev);
  });

  it("verifies checkout signatures and rejects tampering", () => {
    // Re-require after env is set
    delete require.cache[require.resolve("./razorpayPayments")];
    const {
      verifyCheckoutSignature,
      amountToPaise,
      toPublicSettings,
      sanitizeSettingsUpdate,
      stripOrderSecrets,
    } = require("./razorpayPayments");

    const razorpay_order_id = "order_ABC";
    const razorpay_payment_id = "pay_XYZ";
    const razorpay_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    assert.equal(
      verifyCheckoutSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }),
      true
    );
    assert.equal(
      verifyCheckoutSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature: "deadbeef",
      }),
      false
    );
    assert.equal(amountToPaise(299.5), 29950);

    const pub = toPublicSettings({
      payment_method: "razorpay",
      razorpay_key_secret: "should_not_leak",
      razorpay_webhook_secret: "should_not_leak",
    });
    assert.equal(pub.razorpay_key_secret, undefined);
    assert.equal(pub.razorpay_webhook_secret, undefined);
    assert.equal(pub.razorpay_key_id, "rzp_test_example");

    const sanitized = sanitizeSettingsUpdate({
      payment_method: "razorpay",
      razorpay_key_secret: "evil",
      razorpay_webhook_secret: "evil",
      upi_id: "shop@upi",
    });
    assert.equal(sanitized.razorpay_key_secret, undefined);
    assert.equal(sanitized.razorpay_webhook_secret, undefined);
    assert.equal(sanitized.upi_id, "shop@upi");
    assert.equal(sanitized.payment_method, "razorpay");

    const stripped = stripOrderSecrets({
      order_id: "FRM-1",
      razorpay_payment_id: "pay_1",
      razorpay_signature: "secret_hash",
    });
    assert.equal(stripped.razorpay_signature, undefined);
    assert.equal(stripped.razorpay_payment_id, "pay_1");

    const {
      toPublicTrackingOrder,
      capturedPaymentMatchesOrder,
    } = require("./razorpayPayments");
    const tracked = toPublicTrackingOrder({
      order_id: "FRM-1",
      amount: 100,
      customer_name: "Asha",
      phone: "9876543210",
      email: "a@example.com",
      house_no_flat: "12",
      razorpay_signature: "secret",
    });
    assert.equal(tracked.order_id, "FRM-1");
    assert.equal(tracked.customer_name, undefined);
    assert.equal(tracked.phone, undefined);
    assert.equal(tracked.email, undefined);
    assert.equal(tracked.house_no_flat, undefined);
    assert.equal(tracked.razorpay_signature, undefined);

    const order = { amount: 299, currency: "INR" };
    assert.equal(capturedPaymentMatchesOrder({
      status: "captured",
      amount: 29900,
      currency: "INR",
    }, order), true);
    assert.equal(capturedPaymentMatchesOrder({
      status: "captured",
      currency: "INR",
    }, order), false);
    assert.equal(capturedPaymentMatchesOrder({
      status: "authorized",
      amount: 29900,
      currency: "INR",
    }, order), false);
  });

  it("verifies webhook signatures", () => {
    delete require.cache[require.resolve("./razorpayPayments")];
    const { verifyWebhookSignature } = require("./razorpayPayments");
    const raw = Buffer.from(JSON.stringify({ id: "evt_1", event: "payment.captured" }));
    const sig = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");
    assert.equal(verifyWebhookSignature(raw, sig), true);
    assert.equal(verifyWebhookSignature(raw, "bad"), false);
  });
});
