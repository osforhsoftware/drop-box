const { normalizePaymentMethod } = require("./razorpayPayments");
const { isFailedPaymentStatus } = require("./adminOrderQuery");

const ALLOWED_PAYMENT_STATUSES = Object.freeze([
  "pending",
  "submitted",
  "approved",
  "rejected",
  "failed",
  "refunded",
]);

const ALLOWED_DELIVERY_STATUSES = Object.freeze([
  "pending_payment_verification",
  "payment_approved",
  "printing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
]);

function isGatewayManagedPayment(order = {}) {
  return (
    normalizePaymentMethod(order.payment_method) === "razorpay" ||
    Boolean(order.razorpay_payment_id)
  );
}

function buildAdminOrderPatch(order, body = {}) {
  if (!order) {
    return { status: 404, error: "Order not found" };
  }

  if (isFailedPaymentStatus(order.payment_status)) {
    return {
      status: 403,
      error: "Failed payments cannot be updated. Status is locked.",
    };
  }

  const update = {};
  const wantsPayment = body.payment_status != null;
  const wantsDelivery = body.delivery_status != null;

  if (wantsPayment) {
    const next = String(body.payment_status);
    if (!ALLOWED_PAYMENT_STATUSES.includes(next)) {
      return { status: 400, error: "Invalid payment status" };
    }
    if (isGatewayManagedPayment(order)) {
      if (next !== order.payment_status) {
        return {
          status: 400,
          error:
            "Razorpay payments cannot be changed from the admin panel. Status updates automatically after checkout or webhook confirmation.",
        };
      }
    } else {
      update.payment_status = next;
      if (next === "approved" && order.delivery_status === "pending_payment_verification") {
        update.delivery_status = "payment_approved";
      }
    }
  }

  if (wantsDelivery) {
    const next = String(body.delivery_status);
    if (!ALLOWED_DELIVERY_STATUSES.includes(next)) {
      return { status: 400, error: "Invalid delivery status" };
    }
    update.delivery_status = next;
  }

  if (body.tracking_number != null) {
    const next = String(body.tracking_number).trim().slice(0, 80);
    update.tracking_number = next || null;
  }

  if (Object.keys(update).length === 0) {
    return { status: 400, error: "No fields to update" };
  }

  return { update };
}

module.exports = {
  ALLOWED_PAYMENT_STATUSES,
  ALLOWED_DELIVERY_STATUSES,
  isGatewayManagedPayment,
  buildAdminOrderPatch,
};
