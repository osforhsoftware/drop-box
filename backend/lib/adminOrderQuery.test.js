const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAdminOrderFilters,
  isCustomerVisibleOrder,
  customerOrdersQuery,
  getOrderRecordKind,
  dateRangeBounds,
  decorateAdminOrder,
} = require("./adminOrderQuery");
const {
  buildExportFile,
  normalizeExportColumns,
  EXPORT_COLUMN_KEYS,
  productLabel,
  quantityOf,
} = require("./adminOrderExport");

describe("adminOrderQuery", () => {
  it("filters failed payments as their own record kind", () => {
    const parsed = parseAdminOrderFilters({ kind: "failed" });
    assert.deepEqual(parsed.mongoQuery, { payment_status: { $in: ["failed", "rejected"] } });
    assert.ok(parsed.applied.some((c) => c.key === "kind" && c.value === "Failed payments"));
  });

  it("filters unpaid records without mixing in failed payments", () => {
    const parsed = parseAdminOrderFilters({ kind: "unpaid" });
    assert.deepEqual(parsed.mongoQuery, { payment_status: { $in: ["pending", "submitted"] } });
  });

  it("hides unpaid and failed orders from the customer list", () => {
    assert.equal(isCustomerVisibleOrder({ payment_status: "approved" }), true);
    assert.equal(isCustomerVisibleOrder({ payment_status: "pending" }), false);
    assert.equal(isCustomerVisibleOrder({ payment_status: "failed" }), false);
    assert.equal(isCustomerVisibleOrder({ payment_status: "submitted" }), false);
    assert.deepEqual(customerOrdersQuery("u1"), {
      user_id: "u1",
      payment_status: "approved",
    });
  });

  it("classifies confirmed vs payment-pending records", () => {
    assert.equal(getOrderRecordKind({ payment_status: "approved" }), "confirmed");
    assert.equal(getOrderRecordKind({ payment_status: "pending" }), "payment_pending");
    assert.equal(getOrderRecordKind({ payment_status: "failed" }), "payment_failed");
    assert.equal(getOrderRecordKind({ payment_status: "submitted" }), "payment_verification");
  });

  it("combines search, status, amount, and customer filters", () => {
    const parsed = parseAdminOrderFilters({
      q: "Anita",
      orderStatus: "payment_pending",
      paymentStatus: "pending",
      deliveryStatus: "pending",
      product: "Matte",
      orderId: "FRM",
      customerName: "Anita",
      customerPhone: "98765",
      customerEmail: "a@x.com",
      amountMin: "100",
      amountMax: "500",
      kind: "unpaid",
      page: "2",
      pageSize: "10",
    });
    assert.equal(parsed.page, 2);
    assert.equal(parsed.pageSize, 10);
    assert.equal(parsed.skip, 10);
    assert.ok(parsed.mongoQuery.$and.length >= 8);
    assert.ok(parsed.applied.some((c) => c.key === "q"));
    assert.ok(parsed.applied.some((c) => c.key === "kind"));
  });

  it("builds IST date bounds for today", () => {
    const now = new Date("2026-09-10T08:00:00+05:30");
    const bounds = dateRangeBounds("today", "", "", now);
    assert.equal(bounds.from, "2026-09-09T18:30:00.000Z");
    assert.equal(bounds.to, "2026-09-10T18:30:00.000Z");
  });

  it("decorates admin orders without leaking signatures", () => {
    const decorated = decorateAdminOrder({
      order_id: "FRM-1",
      payment_status: "pending",
      delivery_status: "pending_payment_verification",
      razorpay_signature: "secret",
    });
    assert.equal(decorated.record_kind, "payment_pending");
    assert.equal(decorated.customer_visible, false);
    assert.equal(decorated.razorpay_signature, undefined);
    assert.equal(decorated.payment_verification_label, "Payment Pending");
  });
});

describe("adminOrderExport", () => {
  const sample = [
    {
      order_id: "FRM-1",
      created_at: "2026-09-10T06:00:00.000Z",
      customer_name: "Anita",
      phone: "9876543210",
      email: "a@x.com",
      brand_name: "Apple",
      model_name: "iPhone 15",
      product_name: "Matte Case",
      amount: 499,
      payment_status: "pending",
      delivery_status: "pending_payment_verification",
      formatted_address: "42 MG Road, Bengaluru",
      tracking_number: null,
    },
    {
      order_id: "FRM-2",
      created_at: "2026-09-09T06:00:00.000Z",
      customer_name: "Rahul",
      phone: "9123456789",
      email: "r@x.com",
      items: [
        { brand_name: "Samsung", model_name: "S24", product_name: "Clear", quantity: 2 },
      ],
      amount: 999,
      payment_status: "approved",
      delivery_status: "shipped",
      tracking_number: "TRK1",
    },
  ];

  it("defaults to every column and respects a subset", () => {
    assert.deepEqual(normalizeExportColumns([]), [...EXPORT_COLUMN_KEYS]);
    assert.deepEqual(normalizeExportColumns(["order_id", "nope", "amount"]), ["order_id", "amount"]);
  });

  it("flattens multi-item products", () => {
    assert.equal(productLabel(sample[1]), "Samsung S24 Clear ×2");
    assert.equal(quantityOf(sample[1]), 2);
  });

  it("prefers the selected material label over catalog product name", () => {
    assert.equal(
      productLabel({
        brand_name: "Apple",
        model_name: "iPhone 15",
        product_name: "Generic Case",
        case_type_label: "Silicone Case",
      }),
      "Apple iPhone 15 Silicone Case"
    );
  });

  it("builds csv/xlsx/pdf buffers containing requested rows only", () => {
    const csv = buildExportFile(sample, { columns: ["order_id", "amount"], format: "csv", scope: "filtered" });
    const text = csv.buffer.toString("utf8");
    assert.match(text, /FRM-1/);
    assert.match(text, /FRM-2/);
    assert.match(text, /Order ID/);
    assert.equal(csv.count, 2);
    assert.equal(csv.filename.endsWith(".csv"), true);

    const xlsx = buildExportFile(sample, { columns: ["order_id"], format: "xlsx", scope: "all" });
    assert.equal(xlsx.buffer.subarray(0, 2).toString(), "PK");
    assert.equal(xlsx.contentType.includes("spreadsheet"), true);

    const pdf = buildExportFile([sample[0]], { columns: ["order_id", "customer_name"], format: "pdf", scope: "view" });
    assert.match(pdf.buffer.toString("latin1"), /^%PDF-1.4/);
    assert.match(pdf.buffer.toString("latin1"), /FRM-1/);
    assert.doesNotMatch(pdf.buffer.toString("latin1"), /FRM-2/);
  });
});
