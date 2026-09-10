const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildAdminOrderPatch, isGatewayManagedPayment } = require("./adminOrderUpdate");

describe("adminOrderUpdate", () => {
  it("treats Razorpay orders as gateway-managed even before capture", () => {
    assert.equal(isGatewayManagedPayment({ payment_method: "razorpay" }), true);
    assert.equal(isGatewayManagedPayment({ razorpay_payment_id: "pay_1" }), true);
    assert.equal(isGatewayManagedPayment({ payment_method: "manual_upi" }), false);
  });

  it("rejects payment status changes on Razorpay orders", () => {
    const result = buildAdminOrderPatch(
      { payment_method: "razorpay", payment_status: "approved", delivery_status: "payment_approved" },
      { payment_status: "pending" }
    );
    assert.equal(result.status, 400);
    assert.match(result.error, /Razorpay/i);
  });

  it("allows delivery-only updates on Razorpay orders", () => {
    const result = buildAdminOrderPatch(
      { payment_method: "razorpay", payment_status: "approved", delivery_status: "payment_approved" },
      { payment_status: "approved", delivery_status: "printing" }
    );
    assert.deepEqual(result.update, { delivery_status: "printing" });
  });

  it("lets admins approve manual UPI and advances delivery from pending verification", () => {
    const result = buildAdminOrderPatch(
      { payment_method: "manual_upi", payment_status: "submitted", delivery_status: "pending_payment_verification" },
      { payment_status: "approved" }
    );
    assert.deepEqual(result.update, {
      payment_status: "approved",
      delivery_status: "payment_approved",
    });
  });

  it("rejects unknown statuses", () => {
    const pay = buildAdminOrderPatch(
      { payment_method: "manual_upi", payment_status: "pending" },
      { payment_status: "paid_offline" }
    );
    assert.equal(pay.status, 400);
    const del = buildAdminOrderPatch(
      { payment_method: "manual_upi", payment_status: "pending", delivery_status: "printing" },
      { delivery_status: "lost" }
    );
    assert.equal(del.status, 400);
  });

  it("locks all admin updates on failed payments", () => {
    const result = buildAdminOrderPatch(
      { payment_method: "razorpay", payment_status: "failed", delivery_status: "pending_payment_verification" },
      { delivery_status: "cancelled", tracking_number: "X1" }
    );
    assert.equal(result.status, 403);
    assert.match(result.error, /Failed payments cannot be updated/i);
  });

  it("allows refunded, cancelled, and tracking number updates", () => {
    const refund = buildAdminOrderPatch(
      { payment_method: "manual_upi", payment_status: "approved", delivery_status: "delivered" },
      { payment_status: "refunded" }
    );
    assert.deepEqual(refund.update, { payment_status: "refunded" });

    const cancel = buildAdminOrderPatch(
      { payment_method: "manual_upi", payment_status: "approved", delivery_status: "printing" },
      { delivery_status: "cancelled" }
    );
    assert.deepEqual(cancel.update, { delivery_status: "cancelled" });

    const tracking = buildAdminOrderPatch(
      { payment_method: "razorpay", payment_status: "approved", delivery_status: "shipped" },
      { tracking_number: "  BLUEDART123  " }
    );
    assert.deepEqual(tracking.update, { tracking_number: "BLUEDART123" });
  });
});
