import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  DATE_RANGE_OPTIONS,
} from "./orderConstants";

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider font-mono text-white/40 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

const inputClass =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand/50 placeholder:text-white/30";

export default function FilterPanel({
  draft,
  onChange,
  onApply,
  onReset,
  onClearAll,
}) {
  const set = (key, value) => onChange({ ...draft, [key]: value });

  return (
    <div
      data-testid="orders-filter-panel"
      className="w-full glass rounded-2xl border border-white/10 p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="label-eyebrow">Filters</div>
          <div className="text-sm text-white/60 mt-1">Combine any fields, then apply.</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Records">
          <select className={inputClass} value={draft.kind} onChange={(e) => set("kind", e.target.value)} data-testid="filter-kind">
            <option value="">All records</option>
            <option value="confirmed">Confirmed Orders</option>
            <option value="unpaid">Payment Pending</option>
            <option value="failed">Failed payments</option>
          </select>
        </Field>
        <Field label="Order Status">
          <select className={inputClass} value={draft.orderStatus} onChange={(e) => set("orderStatus", e.target.value)} data-testid="filter-order-status">
            {ORDER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Payment Status">
          <select className={inputClass} value={draft.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)} data-testid="filter-payment-status">
            {PAYMENT_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "any"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Delivery Status">
          <select className={inputClass} value={draft.deliveryStatus} onChange={(e) => set("deliveryStatus", e.target.value)} data-testid="filter-delivery-status">
            {DELIVERY_STATUS_OPTIONS.map((o) => (
              <option key={o.value || "any"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Date Range">
          <select className={inputClass} value={draft.dateRange} onChange={(e) => set("dateRange", e.target.value)} data-testid="filter-date-range">
            {DATE_RANGE_OPTIONS.map((o) => (
              <option key={o.value || "any"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
        {draft.dateRange === "custom" && (
          <>
            <Field label="From">
              <input type="date" className={inputClass} value={draft.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} data-testid="filter-date-from" />
            </Field>
            <Field label="To">
              <input type="date" className={inputClass} value={draft.dateTo} onChange={(e) => set("dateTo", e.target.value)} data-testid="filter-date-to" />
            </Field>
          </>
        )}
        <Field label="Customer name">
          <input className={inputClass} value={draft.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Search name" data-testid="filter-customer-name" />
        </Field>
        <Field label="Phone number">
          <input className={inputClass} value={draft.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="Search phone" data-testid="filter-customer-phone" />
        </Field>
        <Field label="Email">
          <input className={inputClass} value={draft.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} placeholder="Search email" data-testid="filter-customer-email" />
        </Field>
        <Field label="Product">
          <input className={inputClass} value={draft.product} onChange={(e) => set("product", e.target.value)} placeholder="Product, brand, or model" data-testid="filter-product" />
        </Field>
        <Field label="Order ID">
          <input className={inputClass} value={draft.orderId} onChange={(e) => set("orderId", e.target.value)} placeholder="Exact or partial ID" data-testid="filter-order-id" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min amount">
            <input type="number" min="0" className={inputClass} value={draft.amountMin} onChange={(e) => set("amountMin", e.target.value)} placeholder="₹" data-testid="filter-amount-min" />
          </Field>
          <Field label="Max amount">
            <input type="number" min="0" className={inputClass} value={draft.amountMax} onChange={(e) => set("amountMax", e.target.value)} placeholder="₹" data-testid="filter-amount-max" />
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/[0.06]">
        <button type="button" data-testid="apply-filters" onClick={onApply} className="btn-primary text-sm">
          Apply Filters
        </button>
        <button type="button" data-testid="reset-filters" onClick={onReset} className="btn-secondary text-sm">
          Reset Filters
        </button>
        <button type="button" data-testid="clear-all-filters" onClick={onClearAll} className="px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white border border-white/10">
          Clear All
        </button>
      </div>
    </div>
  );
}
