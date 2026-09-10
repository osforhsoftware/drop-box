export const DEFAULT_FILTERS = {
  orderStatus: "all",
  paymentStatus: "",
  deliveryStatus: "",
  dateRange: "",
  dateFrom: "",
  dateTo: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  product: "",
  orderId: "",
  amountMin: "",
  amountMax: "",
  kind: "",
};

export const ORDER_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "printing", label: "Printing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "payment_pending", label: "Payment Pending" },
  { value: "payment_verified", label: "Payment Verified" },
  { value: "payment_failed", label: "Payment Failed" },
];

export const QUICK_STATUS_TABS = [
  "all",
  "pending",
  "approved",
  "printing",
  "shipped",
  "delivered",
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "verification_required", label: "Payment Verification Required" },
];

export const DELIVERY_STATUS_OPTIONS = [
  { value: "", label: "Any" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export const DATE_RANGE_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "custom", label: "Custom Date Range" },
];

export const PAYMENT_EDIT_OPTIONS = [
  "pending",
  "submitted",
  "approved",
  "rejected",
  "failed",
  "refunded",
];

export const DELIVERY_EDIT_OPTIONS = [
  "pending_payment_verification",
  "payment_approved",
  "printing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
];

export const EXPORT_COLUMNS = [
  { key: "order_id", label: "Order ID" },
  { key: "created_at", label: "Order Date" },
  { key: "customer_name", label: "Customer Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "product", label: "Product" },
  { key: "quantity", label: "Quantity" },
  { key: "amount", label: "Amount" },
  { key: "payment_status", label: "Payment Status" },
  { key: "delivery_status", label: "Delivery Status" },
  { key: "order_status", label: "Order Status" },
  { key: "shipping_address", label: "Shipping Address" },
  { key: "tracking_number", label: "Tracking Number" },
];

export const EXPORT_SCOPES = [
  { value: "view", label: "Export Current View", hint: "Only the rows on this page" },
  { value: "filtered", label: "Export Filtered Orders", hint: "Every order matching the active filters" },
  { value: "all", label: "Export All Orders", hint: "The full admin order book, including unpaid" },
];

export const EXPORT_FORMATS = [
  { value: "csv", label: "CSV" },
  { value: "xlsx", label: "Excel (.xlsx)" },
  { value: "pdf", label: "PDF" },
];

export const PAGE_SIZE = 25;
