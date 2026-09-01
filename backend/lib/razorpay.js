const crypto = require("crypto");

const RAZORPAY_API = "https://api.razorpay.com/v1";
const PLACEHOLDER_SECRET_RE = /^change_me/i;

function getRazorpayConfig(env = process.env) {
  const keyId = String(env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = String(env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  const secretUsable = Boolean(keySecret) && !PLACEHOLDER_SECRET_RE.test(keySecret);
  const webhookUsable = Boolean(webhookSecret) && !PLACEHOLDER_SECRET_RE.test(webhookSecret);
  return {
    keyId,
    keySecret,
    webhookSecret,
    configured: Boolean(keyId && secretUsable),
    webhookConfigured: webhookUsable,
  };
}

function rupeesToPaise(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyCheckoutSignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  keySecret,
}) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !keySecret) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  return timingSafeEqualString(expected, razorpay_signature);
}

function verifyWebhookSignature(rawBody, signature, webhookSecret) {
  if (!rawBody || !signature || !webhookSecret) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), "utf8");
  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  return timingSafeEqualString(expected, signature);
}

function basicAuthHeader(keyId, keySecret) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function razorpayApiError(data, fallback, status) {
  const err = new Error(data?.error?.description || fallback);
  err.status = status;
  return err;
}

async function createRazorpayOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes,
  keyId,
  keySecret,
  fetchImpl = fetch,
}) {
  const res = await fetchImpl(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: String(receipt || "").slice(0, 40),
      notes: notes || {},
    }),
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw razorpayApiError(data, "Could not create Razorpay order", res.status >= 400 && res.status < 500 ? 400 : 502);
  }
  if (!data.id) {
    throw razorpayApiError(data, "Razorpay did not return an order id", 502);
  }
  return data;
}

async function fetchRazorpayPayment(paymentId, { keyId, keySecret, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: basicAuthHeader(keyId, keySecret) },
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw razorpayApiError(data, "Could not fetch Razorpay payment", 502);
  }
  return data;
}

function publicSettings(doc = {}, env = process.env) {
  const cfg = getRazorpayConfig(env);
  return {
    id: "main",
    upi_id: doc.upi_id || "",
    merchant_name: doc.merchant_name || "CASEBOX",
    whatsapp_number: doc.whatsapp_number || "",
    currency: doc.currency || "INR",
    payment_method: doc.payment_method === "razorpay" ? "razorpay" : "manual_upi",
    razorpay_key_id: cfg.keyId || doc.razorpay_key_id || "",
  };
}

function settingsUpdateFromBody(body = {}, env = process.env) {
  const update = {};
  if (body.upi_id != null) update.upi_id = String(body.upi_id).trim();
  if (body.merchant_name != null) update.merchant_name = String(body.merchant_name).trim();
  if (body.whatsapp_number != null) update.whatsapp_number = String(body.whatsapp_number).trim();
  if (body.currency != null) update.currency = String(body.currency).trim().slice(0, 8) || "INR";
  if (body.payment_method != null) {
    update.payment_method = body.payment_method === "razorpay" ? "razorpay" : "manual_upi";
  }
  const cfg = getRazorpayConfig(env);
  if (!cfg.keyId && body.razorpay_key_id) {
    update.razorpay_key_id = String(body.razorpay_key_id).trim();
  }
  return update;
}

function paidUpdateFromPayment(order, payment, extras = {}) {
  const set = {
    payment_status: "approved",
    payment_method: "razorpay",
    razorpay_order_id: payment.order_id || extras.razorpay_order_id || order.razorpay_order_id,
    razorpay_payment_id: payment.id || extras.razorpay_payment_id,
    razorpay_method: payment.method || extras.razorpay_method || null,
    razorpay_amount_paise: payment.amount ?? extras.amountPaise ?? order.razorpay_amount_paise,
    razorpay_status: payment.status || "captured",
  };
  if (order.delivery_status === "pending_payment_verification") {
    set.delivery_status = "payment_approved";
  }
  return set;
}

function webhookPaymentEntity(payload) {
  return payload?.payload?.payment?.entity || null;
}

module.exports = {
  getRazorpayConfig,
  rupeesToPaise,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  createRazorpayOrder,
  fetchRazorpayPayment,
  publicSettings,
  settingsUpdateFromBody,
  paidUpdateFromPayment,
  webhookPaymentEntity,
};
