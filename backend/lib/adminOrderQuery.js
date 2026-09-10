/**
 * Admin order list filters, pagination, and customer-visibility rules.
 *
 * Unpaid / failed / abandoned checkout records stay in the admin backend.
 * Customers only see orders after payment is confirmed (payment_status === "approved"),
 * which is set by Razorpay verification/webhook or manual UPI admin approval.
 */

const CUSTOMER_VISIBLE_PAYMENT_STATUS = "approved";

const ORDER_STATUS_VALUES = Object.freeze([
  "all",
  "pending",
  "approved",
  "printing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_pending",
  "payment_verified",
  "payment_failed",
]);

const PAYMENT_STATUS_FILTERS = Object.freeze([
  "pending",
  "paid",
  "failed",
  "refunded",
  "verification_required",
]);

const DELIVERY_STATUS_FILTERS = Object.freeze([
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

const DATE_RANGE_VALUES = Object.freeze([
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "custom",
]);

const RECORD_KIND_VALUES = Object.freeze(["confirmed", "unpaid", "failed"]);
const FAILED_PAYMENT_STATUSES = Object.freeze(["failed", "rejected"]);
const PENDING_PAYMENT_STATUSES = Object.freeze(["pending", "submitted"]);

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 10000;

const PAYMENT_STATUS_LABELS = Object.freeze({
  pending: "Payment Pending",
  submitted: "Payment Verification Required",
  approved: "Paid",
  failed: "Payment Failed",
  rejected: "Payment Failed",
  refunded: "Refunded",
});

const PAYMENT_VERIFICATION_LABELS = Object.freeze({
  pending: "Payment Pending",
  submitted: "Payment Verification Required",
  approved: "Payment Verified",
  failed: "Payment Failed",
  rejected: "Payment Failed",
  refunded: "Refunded",
});

const DELIVERY_STATUS_LABELS = Object.freeze({
  pending_payment_verification: "Pending",
  payment_approved: "Processing",
  printing: "Printing",
  packed: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
});

function isCustomerVisibleOrder(order = {}) {
  return order.payment_status === CUSTOMER_VISIBLE_PAYMENT_STATUS;
}

function customerOrdersQuery(userId) {
  return { user_id: userId, payment_status: CUSTOMER_VISIBLE_PAYMENT_STATUS };
}

function isFailedPaymentStatus(status) {
  return FAILED_PAYMENT_STATUSES.includes(String(status || ""));
}

function failedPaymentClause() {
  return { payment_status: { $in: [...FAILED_PAYMENT_STATUSES] } };
}

function pendingPaymentClause() {
  return { payment_status: { $in: [...PENDING_PAYMENT_STATUSES] } };
}

function getOrderRecordKind(order = {}) {
  if (order.payment_status === "approved") return "confirmed";
  if (order.payment_status === "refunded") return "refunded";
  if (isFailedPaymentStatus(order.payment_status)) return "payment_failed";
  if (order.payment_status === "submitted") return "payment_verification";
  return "payment_pending";
}

function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] || String(status || "—").replace(/_/g, " ");
}

function paymentVerificationLabel(status) {
  return PAYMENT_VERIFICATION_LABELS[status] || paymentStatusLabel(status);
}

function deliveryStatusLabel(status) {
  return DELIVERY_STATUS_LABELS[status] || String(status || "—").replace(/_/g, " ");
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsRegex(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  return { $regex: escapeRegex(trimmed), $options: "i" };
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseAmount(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function ymdInTimeZone(date, timeZone = "Asia/Kolkata") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function addDaysYmd(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function istMidnightIso(ymd) {
  return new Date(`${ymd}T00:00:00+05:30`).toISOString();
}

function dateRangeBounds(range, dateFrom, dateTo, now = new Date()) {
  if (!range) return null;
  const today = ymdInTimeZone(now);
  if (range === "today") {
    return { from: istMidnightIso(today), to: istMidnightIso(addDaysYmd(today, 1)) };
  }
  if (range === "yesterday") {
    const y = addDaysYmd(today, -1);
    return { from: istMidnightIso(y), to: istMidnightIso(today) };
  }
  if (range === "last_7_days") {
    return { from: istMidnightIso(addDaysYmd(today, -6)), to: istMidnightIso(addDaysYmd(today, 1)) };
  }
  if (range === "last_30_days") {
    return { from: istMidnightIso(addDaysYmd(today, -29)), to: istMidnightIso(addDaysYmd(today, 1)) };
  }
  if (range === "this_month") {
    const monthStart = `${today.slice(0, 7)}-01`;
    return { from: istMidnightIso(monthStart), to: istMidnightIso(addDaysYmd(today, 1)) };
  }
  if (range === "custom") {
    const from = String(dateFrom || "").trim();
    const to = String(dateTo || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
    const end = addDaysYmd(to, 1);
    if (from > to) {
      return { from: istMidnightIso(to), to: istMidnightIso(addDaysYmd(from, 1)) };
    }
    return { from: istMidnightIso(from), to: istMidnightIso(end) };
  }
  return null;
}

function orderStatusClause(value) {
  switch (value) {
    case "pending":
      return {
        $or: [
          { payment_status: { $in: ["pending", "submitted", "failed"] } },
          { delivery_status: "pending_payment_verification" },
        ],
      };
    case "approved":
      return { payment_status: "approved" };
    case "printing":
      return { delivery_status: "printing" };
    case "shipped":
      return { delivery_status: "shipped" };
    case "delivered":
      return { delivery_status: "delivered" };
    case "cancelled":
      return { delivery_status: "cancelled" };
    case "payment_pending":
      return { payment_status: "pending" };
    case "payment_verified":
      return { payment_status: "approved" };
    case "payment_failed":
      return failedPaymentClause();
    default:
      return null;
  }
}

function paymentStatusClause(value) {
  switch (value) {
    case "pending":
      return { payment_status: "pending" };
    case "paid":
      return { payment_status: "approved" };
    case "failed":
      return failedPaymentClause();
    case "refunded":
      return { payment_status: "refunded" };
    case "verification_required":
      return { payment_status: "submitted" };
    default:
      return null;
  }
}

function deliveryStatusClause(value) {
  switch (value) {
    case "pending":
      return { delivery_status: "pending_payment_verification" };
    case "processing":
      return { delivery_status: { $in: ["payment_approved", "printing", "packed"] } };
    case "shipped":
      return { delivery_status: "shipped" };
    case "delivered":
      return { delivery_status: "delivered" };
    case "cancelled":
      return { delivery_status: "cancelled" };
    default:
      return null;
  }
}

function productSearchClause(value) {
  const rx = containsRegex(value);
  if (!rx) return null;
  return {
    $or: [
      { product_name: rx },
      { brand_name: rx },
      { model_name: rx },
      { "items.product_name": rx },
      { "items.brand_name": rx },
      { "items.model_name": rx },
    ],
  };
}

function globalSearchClause(value) {
  const rx = containsRegex(value);
  if (!rx) return null;
  return {
    $or: [
      { order_id: rx },
      { customer_name: rx },
      { phone: rx },
      { email: rx },
      { product_name: rx },
      { brand_name: rx },
      { model_name: rx },
      { "items.product_name": rx },
      { "items.brand_name": rx },
      { "items.model_name": rx },
    ],
  };
}

function pick(input, ...keys) {
  for (const key of keys) {
    if (input[key] != null && input[key] !== "") return input[key];
  }
  return "";
}

function parseAdminOrderFilters(input = {}) {
  const src = input && typeof input === "object" ? input : {};
  const q = String(pick(src, "q", "search")).trim();
  const orderStatusRaw = String(pick(src, "orderStatus", "order_status", "filter")).trim() || "all";
  const orderStatus = ORDER_STATUS_VALUES.includes(orderStatusRaw) ? orderStatusRaw : "all";
  const paymentStatusRaw = String(pick(src, "paymentStatus", "payment_status")).trim();
  const paymentStatus = PAYMENT_STATUS_FILTERS.includes(paymentStatusRaw) ? paymentStatusRaw : "";
  const deliveryStatusRaw = String(pick(src, "deliveryStatus", "delivery_status")).trim();
  const deliveryStatus = DELIVERY_STATUS_FILTERS.includes(deliveryStatusRaw) ? deliveryStatusRaw : "";
  const dateRangeRaw = String(pick(src, "dateRange", "date_range")).trim();
  const dateRange = DATE_RANGE_VALUES.includes(dateRangeRaw) ? dateRangeRaw : "";
  const dateFrom = String(pick(src, "dateFrom", "date_from")).trim();
  const dateTo = String(pick(src, "dateTo", "date_to")).trim();
  const customerName = String(pick(src, "customerName", "customer_name")).trim();
  const customerPhone = String(pick(src, "customerPhone", "phone")).trim();
  const customerEmail = String(pick(src, "customerEmail", "email")).trim();
  const product = String(pick(src, "product", "productName", "product_name")).trim();
  const orderId = String(pick(src, "orderId", "order_id")).trim();
  const amountMin = parseAmount(pick(src, "amountMin", "amount_min"));
  const amountMax = parseAmount(pick(src, "amountMax", "amount_max"));
  const kindRaw = String(pick(src, "kind", "recordKind", "record_kind")).trim();
  const kind = RECORD_KIND_VALUES.includes(kindRaw) ? kindRaw : "";

  const page = clampInt(src.page, 1, 1_000_000, 1);
  const pageSize = clampInt(src.pageSize ?? src.page_size, 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);

  const clauses = [];
  const applied = [];

  if (q) {
    clauses.push(globalSearchClause(q));
    applied.push({ key: "q", label: "Search", value: q });
  }
  if (orderStatus && orderStatus !== "all") {
    const clause = orderStatusClause(orderStatus);
    if (clause) {
      clauses.push(clause);
      applied.push({
        key: "orderStatus",
        label: "Order status",
        value: orderStatus.replace(/_/g, " "),
      });
    }
  }
  if (paymentStatus) {
    clauses.push(paymentStatusClause(paymentStatus));
    applied.push({
      key: "paymentStatus",
      label: "Payment",
      value: paymentStatus.replace(/_/g, " "),
    });
  }
  if (deliveryStatus) {
    clauses.push(deliveryStatusClause(deliveryStatus));
    applied.push({
      key: "deliveryStatus",
      label: "Delivery",
      value: deliveryStatus.replace(/_/g, " "),
    });
  }
  if (kind === "confirmed") {
    clauses.push({ payment_status: "approved" });
    applied.push({ key: "kind", label: "Records", value: "Confirmed orders" });
  } else if (kind === "unpaid") {
    clauses.push(pendingPaymentClause());
    applied.push({ key: "kind", label: "Records", value: "Payment pending" });
  } else if (kind === "failed") {
    clauses.push(failedPaymentClause());
    applied.push({ key: "kind", label: "Records", value: "Failed payments" });
  }
  const bounds = dateRangeBounds(dateRange, dateFrom, dateTo);
  if (bounds) {
    clauses.push({ created_at: { $gte: bounds.from, $lt: bounds.to } });
    const rangeLabel =
      dateRange === "custom" ? `${dateFrom} → ${dateTo}` : dateRange.replace(/_/g, " ");
    applied.push({ key: "dateRange", label: "Date", value: rangeLabel });
  }
  if (customerName) {
    clauses.push({ customer_name: containsRegex(customerName) });
    applied.push({ key: "customerName", label: "Customer", value: customerName });
  }
  if (customerPhone) {
    clauses.push({ phone: containsRegex(customerPhone) });
    applied.push({ key: "customerPhone", label: "Phone", value: customerPhone });
  }
  if (customerEmail) {
    clauses.push({ email: containsRegex(customerEmail) });
    applied.push({ key: "customerEmail", label: "Email", value: customerEmail });
  }
  if (product) {
    clauses.push(productSearchClause(product));
    applied.push({ key: "product", label: "Product", value: product });
  }
  if (orderId) {
    clauses.push({ order_id: containsRegex(orderId) });
    applied.push({ key: "orderId", label: "Order ID", value: orderId });
  }
  if (amountMin != null || amountMax != null) {
    const amount = {};
    if (amountMin != null) amount.$gte = amountMin;
    if (amountMax != null) amount.$lte = amountMax;
    clauses.push({ amount });
    const lo = amountMin != null ? `₹${amountMin}` : "";
    const hi = amountMax != null ? `₹${amountMax}` : "";
    applied.push({
      key: "amount",
      label: "Amount",
      value: [lo, hi].filter(Boolean).join(" – ") || "set",
    });
  }

  const mongoQuery = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { $and: clauses };

  return {
    mongoQuery,
    applied,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    values: {
      q,
      orderStatus,
      paymentStatus,
      deliveryStatus,
      dateRange,
      dateFrom,
      dateTo,
      customerName,
      customerPhone,
      customerEmail,
      product,
      orderId,
      amountMin,
      amountMax,
      kind,
    },
  };
}

function decorateAdminOrder(order, stripSecrets) {
  const base = typeof stripSecrets === "function" ? stripSecrets(order) : { ...order };
  delete base.razorpay_signature;
  return {
    ...base,
    record_kind: getOrderRecordKind(order),
    payment_label: paymentStatusLabel(order.payment_status),
    payment_verification_label: paymentVerificationLabel(order.payment_status),
    delivery_label: deliveryStatusLabel(order.delivery_status),
    customer_visible: isCustomerVisibleOrder(order),
  };
}

module.exports = {
  CUSTOMER_VISIBLE_PAYMENT_STATUS,
  ORDER_STATUS_VALUES,
  PAYMENT_STATUS_FILTERS,
  DELIVERY_STATUS_FILTERS,
  DATE_RANGE_VALUES,
  RECORD_KIND_VALUES,
  FAILED_PAYMENT_STATUSES,
  PENDING_PAYMENT_STATUSES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_EXPORT_ROWS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_VERIFICATION_LABELS,
  DELIVERY_STATUS_LABELS,
  isCustomerVisibleOrder,
  isFailedPaymentStatus,
  failedPaymentClause,
  pendingPaymentClause,
  customerOrdersQuery,
  getOrderRecordKind,
  paymentStatusLabel,
  paymentVerificationLabel,
  deliveryStatusLabel,
  escapeRegex,
  dateRangeBounds,
  parseAdminOrderFilters,
  decorateAdminOrder,
};
