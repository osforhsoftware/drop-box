const crypto = require("crypto");
const Razorpay = require("razorpay");
const { resolveImageSettings } = require("./imageSettings");

const PAYMENT_METHODS = Object.freeze(["manual_upi", "razorpay"]);
const SECRET_SETTINGS_KEYS = Object.freeze([
  "razorpay_key_secret",
  "razorpay_webhook_secret",
  "razorpay_secret",
  "key_secret",
  "webhook_secret",
]);

function getRazorpayKeyId() {
  return String(process.env.RAZORPAY_KEY_ID || "").trim();
}

function getRazorpayKeySecret() {
  return String(process.env.RAZORPAY_KEY_SECRET || "").trim();
}

function getRazorpayWebhookSecret() {
  return String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
}

function isRazorpayConfigured() {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

function getRazorpayClient() {
  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();
  if (!key_id || !key_secret) {
    const err = new Error("Razorpay is not configured on the server");
    err.status = 503;
    err.code = "RAZORPAY_NOT_CONFIGURED";
    throw err;
  }
  return new Razorpay({ key_id, key_secret });
}

/** Convert INR amount (rupees) to paise for Razorpay. */
function amountToPaise(amountInr) {
  const n = Number(amountInr);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function normalizePaymentMethod(value) {
  const method = String(value || "").trim().toLowerCase();
  return PAYMENT_METHODS.includes(method) ? method : "manual_upi";
}

/** Strip secrets and shape settings for API responses. */
function toPublicSettings(doc = {}) {
  const out = { ...doc };
  for (const key of SECRET_SETTINGS_KEYS) {
    delete out[key];
  }
  out.payment_method = normalizePaymentMethod(out.payment_method);
  // Public key only — prefer env, fall back to stored public key_id
  const envKeyId = getRazorpayKeyId();
  if (envKeyId) {
    out.razorpay_key_id = envKeyId;
  } else if (out.razorpay_key_id) {
    out.razorpay_key_id = String(out.razorpay_key_id).trim();
  } else {
    out.razorpay_key_id = null;
  }
  return { ...out, ...resolveImageSettings(out) };
}

/** Whitelist fields admins may update; never persist secrets from the client. */
function sanitizeSettingsUpdate(body = {}) {
  const update = {};
  if (body.upi_id != null) update.upi_id = String(body.upi_id).trim();
  if (body.merchant_name != null) update.merchant_name = String(body.merchant_name).trim();
  if (body.whatsapp_number != null) update.whatsapp_number = String(body.whatsapp_number).trim();
  if (body.currency != null) update.currency = String(body.currency).trim().toUpperCase() || "INR";
  if (body.payment_method != null) {
    update.payment_method = normalizePaymentMethod(body.payment_method);
  }
  // Public key_id only — ignore any secret fields the client might send
  if (body.razorpay_key_id != null) {
    update.razorpay_key_id = String(body.razorpay_key_id).trim();
  }
  return update;
}

function defaultSettings() {
  return {
    id: "main",
    upi_id: "merchant@upi",
    merchant_name: "CASEBOX",
    whatsapp_number: "+919999999999",
    currency: "INR",
    payment_method: "manual_upi",
    razorpay_key_id: getRazorpayKeyId() || null,
    ...resolveImageSettings({}),
  };
}

async function createRazorpayOrderForAppOrder(appOrder) {
  const amountPaise = amountToPaise(appOrder.amount);
  if (amountPaise < 100) {
    const err = new Error("Order amount must be at least ₹1.00");
    err.status = 400;
    throw err;
  }

  const currency = String(appOrder.currency || "INR").toUpperCase();
  const client = getRazorpayClient();

  try {
    const rzOrder = await client.orders.create({
      amount: amountPaise,
      currency,
      receipt: String(appOrder.order_id).slice(0, 40),
      notes: {
        order_id: appOrder.order_id,
        app_order_uuid: appOrder.id,
      },
    });
    return {
      razorpay_order_id: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      key_id: getRazorpayKeyId(),
      receipt: rzOrder.receipt,
    };
  } catch (err) {
    const statusCode = err?.statusCode || err?.status;
    const wrapped = new Error(err?.error?.description || err.message || "Razorpay order creation failed");
    if (statusCode === 401 || statusCode === 403) {
      wrapped.status = 401;
    } else {
      wrapped.status = 500;
    }
    wrapped.cause = err;
    throw wrapped;
  }
}

function safeTimingEqualHex(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (!left || !right || left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
  } catch {
    return false;
  }
}

/**
 * Verify Checkout success callback signature.
 * HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 */
function verifyCheckoutSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const secret = getRazorpayKeySecret();
  if (!secret) return false;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return safeTimingEqualHex(expected, razorpay_signature);
}

/** Verify X-Razorpay-Signature for webhook raw body. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = getRazorpayWebhookSecret();
  if (!secret) {
    const err = new Error("Razorpay webhook secret is not configured");
    err.status = 503;
    err.code = "WEBHOOK_SECRET_MISSING";
    throw err;
  }
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return safeTimingEqualHex(expected, signatureHeader);
}

/**
 * Second independent check: fetch payment from Razorpay and confirm
 * status/amount/currency against our order (never trust client alone).
 */
async function fetchAndConfirmPayment(razorpay_payment_id, appOrder) {
  const client = getRazorpayClient();
  let payment;
  try {
    payment = await client.payments.fetch(razorpay_payment_id);
  } catch (err) {
    const wrapped = new Error(err?.error?.description || err.message || "Could not fetch payment from Razorpay");
    wrapped.status = err?.statusCode === 401 || err?.statusCode === 403 ? 401 : 502;
    wrapped.code = "RAZORPAY_FETCH_FAILED";
    wrapped.cause = err;
    throw wrapped;
  }

  const expectedPaise = amountToPaise(appOrder.amount);
  const expectedCurrency = String(appOrder.currency || "INR").toUpperCase();
  const paidAmount = Number(payment.amount);
  const paidCurrency = String(payment.currency || "").toUpperCase();
  const status = String(payment.status || "").toLowerCase();

  if (status !== "captured") {
    const err = new Error(`Payment status is "${status}", expected "captured"`);
    err.status = 400;
    err.code = "PAYMENT_NOT_CAPTURED";
    err.payment = payment;
    throw err;
  }
  if (paidCurrency !== expectedCurrency) {
    const err = new Error(`Payment currency mismatch (got ${paidCurrency}, expected ${expectedCurrency})`);
    err.status = 400;
    err.code = "CURRENCY_MISMATCH";
    err.payment = payment;
    throw err;
  }
  if (paidAmount !== expectedPaise) {
    const err = new Error(
      `Payment amount mismatch (got ${paidAmount} paise, expected ${expectedPaise} paise)`
    );
    err.status = 400;
    err.code = "AMOUNT_MISMATCH";
    err.payment = payment;
    throw err;
  }
  if (appOrder.razorpay_order_id && payment.order_id && payment.order_id !== appOrder.razorpay_order_id) {
    const err = new Error("Payment does not belong to this Razorpay order");
    err.status = 400;
    err.code = "ORDER_ID_MISMATCH";
    err.payment = payment;
    throw err;
  }

  return {
    id: payment.id,
    order_id: payment.order_id || null,
    amount: paidAmount,
    currency: paidCurrency,
    status,
    method: payment.method || null,
    email: payment.email || null,
    contact: payment.contact || null,
    captured_at: payment.captured_at || null,
    raw: payment,
  };
}

/** Fields safe to return to customers (never leak HMAC signature). */
function toPublicOrderPayment(order = {}) {
  return {
    payment_method: order.payment_method || null,
    payment_status: order.payment_status || null,
    payment_verified_at: order.payment_verified_at || null,
    payment_verified_via: order.payment_verified_via || null,
    razorpay_order_id: order.razorpay_order_id || null,
    razorpay_payment_id: order.razorpay_payment_id || null,
    razorpay_method: order.razorpay_method || null,
    razorpay_amount_paise: order.razorpay_amount_paise ?? null,
  };
}

/** Strip audit-only secrets from customer-facing order payloads. */
function stripOrderSecrets(order) {
  if (!order || typeof order !== "object") return order;
  const { razorpay_signature, ...rest } = order;
  return rest;
}

const TRACKING_PRIVATE_KEYS = [
  "id",
  "user_id",
  "customer_name",
  "phone",
  "email",
  "notes",
  "address",
  "formatted_address",
  "house_no_flat",
  "building_name",
  "street",
  "landmark",
  "country",
  "state",
  "district",
  "city_area",
  "post_office",
  "pincode",
  "utr",
  "payment_screenshot_url",
  "razorpay_signature",
];

/** Order tracking page: status and product info, without shipping or payment proof. */
function toPublicTrackingOrder(order) {
  const safe = stripOrderSecrets(order);
  if (!safe || typeof safe !== "object") return safe;
  const out = { ...safe };
  for (const key of TRACKING_PRIVATE_KEYS) delete out[key];
  return out;
}

/**
 * Webhook payment.captured must include a captured status, matching currency,
 * and the exact paise amount. A missing amount is not a match.
 */
function capturedPaymentMatchesOrder(paymentEntity, order) {
  const status = String(paymentEntity?.status || "").toLowerCase();
  const paidAmount = Number(paymentEntity?.amount);
  const paidCurrency = String(paymentEntity?.currency || "").toUpperCase();
  const expectedPaise = amountToPaise(order?.amount);
  const expectedCurrency = String(order?.currency || "INR").toUpperCase();
  return status === "captured"
    && Number.isFinite(paidAmount)
    && paidAmount === expectedPaise
    && paidCurrency === expectedCurrency;
}

module.exports = {
  PAYMENT_METHODS,
  SECRET_SETTINGS_KEYS,
  getRazorpayKeyId,
  getRazorpayKeySecret,
  getRazorpayWebhookSecret,
  isRazorpayConfigured,
  getRazorpayClient,
  amountToPaise,
  normalizePaymentMethod,
  toPublicSettings,
  sanitizeSettingsUpdate,
  defaultSettings,
  createRazorpayOrderForAppOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  fetchAndConfirmPayment,
  toPublicOrderPayment,
  stripOrderSecrets,
  toPublicTrackingOrder,
  capturedPaymentMatchesOrder,
};
