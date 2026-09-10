import { DEFAULT_FILTERS } from "./orderConstants";

export function isRazorpayOrder(order) {
  return order?.payment_method === "razorpay" || Boolean(order?.razorpay_payment_id);
}

export function isFailedPaymentOrder(order) {
  const status = String(order?.payment_status || "").toLowerCase();
  return status === "failed" || status === "rejected";
}

export function fmtTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

export function istDayKey(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  } catch {
    return "";
  }
}

export function worklogDayLabel(iso) {
  const key = istDayKey(iso);
  const today = istDayKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = istDayKey(yesterdayDate.toISOString());
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return key || "—";
  }
}

export function failureHeadline(order) {
  const reason = String(order?.payment_failure_reason || "").toLowerCase();
  if (reason.includes("cancel") || reason.includes("closed checkout")) {
    return "Checkout cancelled";
  }
  if (reason.includes("reject")) return "Payment rejected";
  return "Payment failed";
}

export function prettify(s) {
  return String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function productLabel(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items
      .map((item) => [item.brand_name, item.model_name, item.product_name].filter(Boolean).join(" "))
      .filter(Boolean)
      .join(", ");
  }
  return [order?.brand_name, order?.model_name, order?.product_name].filter(Boolean).join(" ") || "—";
}

export function quantityOf(order) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  }
  return 1;
}

export function statusTone(value) {
  const s = String(value || "").toLowerCase();
  if (["approved", "paid", "delivered", "verified", "confirmed"].some((x) => s.includes(x))) {
    return "emerald";
  }
  if (["failed", "rejected", "cancelled"].some((x) => s.includes(x))) return "red";
  if (["refund"].some((x) => s.includes(x))) return "violet";
  if (["pending", "submitted", "verification", "unpaid"].some((x) => s.includes(x))) return "amber";
  if (["shipped", "printing", "packed", "processing"].some((x) => s.includes(x))) return "sky";
  return "zinc";
}

const TONE_CLASS = {
  emerald: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300",
  red: "bg-red-500/15 border-red-400/30 text-red-300",
  violet: "bg-violet-500/15 border-violet-400/30 text-violet-300",
  amber: "bg-amber-500/15 border-amber-400/30 text-amber-200",
  sky: "bg-sky-500/15 border-sky-400/30 text-sky-300",
  zinc: "bg-white/[0.04] border-white/10 text-white/70",
};

export function toneClass(value) {
  return TONE_CLASS[statusTone(value)] || TONE_CLASS.zinc;
}

export function recordKindLabel(kind) {
  if (kind === "confirmed") return "Confirmed";
  if (kind === "payment_failed") return "Payment Failed";
  if (kind === "payment_verification") return "Verification";
  if (kind === "refunded") return "Refunded";
  return "Payment Pending";
}

export function hasActiveFilters(filters, q) {
  if (String(q || "").trim()) return true;
  return Object.entries(filters || {}).some(([key, value]) => {
    if (key === "orderStatus") return value && value !== "all";
    return value !== "" && value != null;
  });
}

export function compactParams(filters, q, page, pageSize) {
  const params = { page, pageSize };
  const trimmedQ = String(q || "").trim();
  if (trimmedQ) params.q = trimmedQ;
  Object.entries(filters || DEFAULT_FILTERS).forEach(([key, value]) => {
    if (value === "" || value == null) return;
    if (key === "orderStatus" && value === "all") return;
    params[key] = value;
  });
  return params;
}

export function filtersWithoutChip(filters, q, key) {
  const nextFilters = { ...filters };
  let nextQ = q;
  if (key === "q") nextQ = "";
  else if (key === "amount") {
    nextFilters.amountMin = "";
    nextFilters.amountMax = "";
  } else if (key === "dateRange") {
    nextFilters.dateRange = "";
    nextFilters.dateFrom = "";
    nextFilters.dateTo = "";
  } else if (key === "orderStatus") {
    nextFilters.orderStatus = "all";
  } else if (Object.prototype.hasOwnProperty.call(nextFilters, key)) {
    nextFilters[key] = "";
  }
  return { filters: nextFilters, q: nextQ };
}

export function filenameFromDisposition(header, fallback) {
  if (!header) return fallback;
  const match = String(header).match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}
