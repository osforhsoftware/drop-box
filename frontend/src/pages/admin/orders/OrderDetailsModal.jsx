import { Save, X, Download, MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import { resolveMediaUrl } from "../../../lib/api";
import { SHIPPING_FEE } from "../../../constants/shipping";
import { COMPANY_NAME } from "../../../constants/company";
import { PAYMENT_EDIT_OPTIONS, DELIVERY_EDIT_OPTIONS } from "./orderConstants";
import { isRazorpayOrder, isFailedPaymentOrder, prettify, fmtDate, toneClass, recordKindLabel, orderMaterialLabel, orderMaterialFinish } from "./orderHelpers";

export default function OrderDetailsModal({
  selected,
  detailLoading,
  settings,
  statusDraft,
  setStatusDraft,
  statusSaving,
  hasStatusChanges,
  onClose,
  onSave,
  trackingDraft,
  setTrackingDraft,
}) {
  const razorpayLocked = isRazorpayOrder(selected);
  const statusLocked = isFailedPaymentOrder(selected);
  const previewSrc = selected ? resolveMediaUrl(selected.preview_url) : null;
  const designSrc = selected ? resolveMediaUrl(selected.design_url) : null;
  const printSrc = selected ? resolveMediaUrl(selected.print_url) : null;
  const paymentSrc = selected ? resolveMediaUrl(selected.payment_screenshot_url) : null;
  const verifyLabel = selected?.payment_verification_label || selected?.payment_label || prettify(selected?.payment_status);

  return (
    <div data-testid="order-modal" className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4 overflow-y-auto" onClick={() => !detailLoading && onClose()}>
      <div className="glass rounded-2xl p-6 max-w-5xl w-full my-8 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {detailLoading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-white/60">
            <Loader2 className="w-8 h-8 animate-spin text-brand" />
            <div className="text-sm">Loading order details…</div>
          </div>
        ) : selected && (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="label-eyebrow">Order details</div>
                <div className="font-mono text-2xl text-brand mt-1">{selected.order_id}</div>
                <div className="text-xs text-white/45 mt-1">{fmtDate(selected.created_at)}</div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Pill value={verifyLabel} />
                  <Pill value={selected.delivery_label || selected.delivery_status} />
                  <Pill value={recordKindLabel(selected.record_kind)} />
                </div>
              </div>
              <button type="button" onClick={onClose} className="text-white/60 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
            </div>

            <PaymentVerificationBanner order={selected} />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <MetaCard label="Order date / time" value={fmtDate(selected.created_at)} />
              <MetaCard label="Last updated" value={fmtDate(selected.updated_at)} />
              <MetaCard label="Quantity" value={String(quantityFrom(selected))} />
              <MetaCard label="Total amount" value={`₹${selected.amount}`} accent />
            </div>

            <div className="glass-2 rounded-xl p-4 mb-6 text-sm">
              <div className="label-eyebrow">Price breakdown</div>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                <Info l="Subtotal" v={`₹${selected.subtotal ?? "—"}`} />
                <Info l="Shipping charge" v={`₹${selected.shipping_fee ?? SHIPPING_FEE}`} />
                {selected.promo_code && (
                  <>
                    <Info l="Promo code" v={selected.promo_code} mono />
                    <Info l="Discount" v={`−₹${selected.discount_amount} (${selected.discount_percent}%)`} />
                  </>
                )}
                <Info l="Total amount" v={`₹${selected.amount}`} />
                <Info l="Payment method" v={prettify(selected.payment_method || "—")} />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Section title="Customer information">
                  <Info l="Name" v={selected.customer_name} />
                  <Info l="Phone" v={selected.phone} />
                  <Info l="Email" v={selected.email || "—"} />
                </Section>

                <Section title="Shipping address">
                  <Info l="Complete address" v={selected.formatted_address || selected.address} />
                  {selected.house_no_flat && (
                    <>
                      <Info l="House / Flat" v={selected.house_no_flat} />
                      <Info l="Building" v={selected.building_name || "—"} />
                      <Info l="Street" v={selected.street || "—"} />
                      <Info l="Landmark" v={selected.landmark || "—"} />
                      <Info l="Post office" v={selected.post_office || "—"} />
                      <Info l="City / Area" v={selected.city_area || "—"} />
                      <Info l="District" v={selected.district || "—"} />
                      <Info l="Country" v={selected.country || "India"} />
                    </>
                  )}
                  <Info l="State" v={selected.state} />
                  <Info l="Pincode" v={selected.pincode} />
                  <Info l="Notes" v={selected.notes || "—"} />
                </Section>

                <Section title="Tracking information">
                  <Info l="Delivery status" v={selected.delivery_label || prettify(selected.delivery_status)} />
                  <Info l="Tracking number" v={selected.tracking_number || "Not added"} mono />
                  {!statusLocked && (
                    <div className="mt-3">
                      <div className="text-xs text-white/40 mb-1">Update tracking number</div>
                      <input
                        data-testid="tracking-number-input"
                        value={trackingDraft}
                        onChange={(e) => setTrackingDraft(e.target.value)}
                        placeholder="Carrier tracking ID"
                        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </Section>
              </div>

              <div className="space-y-6">
                {selected.items && selected.items.length > 0 ? (
                  <Section title={`Product information (${selected.items.length})`}>
                    <div className="space-y-6">
                      {selected.items.map((item, idx) => (
                        <div key={idx} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                          <Info l="Brand" v={item.brand_name} />
                          <Info l="Model" v={item.model_name} />
                          {item.template_product_title ? <Info l="Design" v={item.template_product_title} /> : null}
                          <Info l="Material" v={orderMaterialLabel(item) || "—"} />
                          {orderMaterialFinish(item) ? <Info l="Finish" v={orderMaterialFinish(item)} /> : null}
                          <Info l="Quantity" v={item.quantity} />
                          <Info l="Price" v={`₹${item.price}`} />
                          <ItemFiles item={item} idx={idx} />
                        </div>
                      ))}
                    </div>
                  </Section>
                ) : (
                  <>
                    <Section title="Product information">
                      <Info l="Brand" v={selected.brand_name} />
                      <Info l="Model" v={selected.model_name} />
                      {selected.template_product_title ? <Info l="Design" v={selected.template_product_title} /> : null}
                      <Info l="Material" v={orderMaterialLabel(selected) || "—"} />
                      {orderMaterialFinish(selected) ? <Info l="Finish" v={orderMaterialFinish(selected)} /> : null}
                      <Info l="Quantity" v="1" />
                      <Info l="Price" v={`₹${selected.subtotal ?? selected.amount}`} />
                    </Section>
                    <Section title="Design">
                      <div className="flex flex-wrap gap-4 items-start">
                        {previewSrc ? (
                          <a href={previewSrc} target="_blank" rel="noreferrer" className="block group">
                            <img src={previewSrc} className="w-28 h-44 rounded-lg object-cover border border-white/10 group-hover:border-brand/50" alt="Case preview" />
                            <div className="text-xs text-white/40 mt-1 flex items-center gap-1">Preview <ExternalLink className="w-3 h-3" /></div>
                          </a>
                        ) : (
                          <div className="text-white/40 text-sm">No preview image.</div>
                        )}
                        {printSrc ? (
                          <a data-testid="download-print" href={printSrc} download target="_blank" rel="noreferrer" className="btn-primary text-sm inline-flex items-center gap-2 self-center">
                            <Download className="w-4 h-4" /> Download 300 DPI print
                          </a>
                        ) : designSrc ? (
                          <a data-testid="download-design" href={designSrc} download target="_blank" rel="noreferrer" className="btn-secondary text-sm inline-flex items-center gap-2 self-center">
                            <Download className="w-4 h-4" /> Download artwork
                          </a>
                        ) : null}
                      </div>
                    </Section>
                  </>
                )}

                <Section title="Payment verification">
                  <Info l="Payment status" v={selected.payment_label || prettify(selected.payment_status)} />
                  <Info l="Verification" v={verifyLabel} />
                  <Info l="Method" v={prettify(selected.payment_method || "—")} />
                  {(selected.payment_method === "razorpay" || selected.razorpay_payment_id || selected.razorpay_order_id) && (
                    <>
                      <Info l="Razorpay order ID" v={selected.razorpay_order_id || "—"} mono />
                      <Info l="Razorpay payment ID" v={selected.razorpay_payment_id || "—"} mono />
                      <Info l="Paid via" v={prettify(selected.razorpay_method || "—")} />
                      <Info l="Verified at" v={fmtDate(selected.payment_verified_at)} />
                      <Info l="Verified via" v={prettify(selected.payment_verified_via || "—")} />
                      {selected.razorpay_amount_paise != null && (
                        <Info
                          l="Razorpay amount"
                          v={`₹${(Number(selected.razorpay_amount_paise) / 100).toFixed(2)} (${selected.razorpay_amount_paise} paise)`}
                          mono
                        />
                      )}
                    </>
                  )}
                  {selected.utr ? <Info l="UTR / Transaction ID" v={selected.utr} mono /> : null}
                  {selected.payment_failure_reason ? <Info l="Failure reason" v={selected.payment_failure_reason} /> : null}
                  {selected.payment_status !== "approved" && (
                    <p className="text-xs text-amber-200/80 mt-3 leading-relaxed">
                      This order is not marked paid from checkout alone. Payment Verified requires a Razorpay signature/webhook match (or manual UPI approval).
                    </p>
                  )}
                </Section>

                <Section title="Payment proof">
                  {paymentSrc ? (
                    <div>
                      <a href={paymentSrc} target="_blank" rel="noreferrer" className="block group">
                        <img data-testid="payment-screenshot" src={paymentSrc} alt="Payment screenshot" className="rounded-lg border border-white/10 w-full max-h-80 object-contain bg-black/30 group-hover:border-brand/50" />
                        <div className="text-xs text-brand mt-2 flex items-center gap-1">Open full screenshot <ExternalLink className="w-3 h-3" /></div>
                      </a>
                    </div>
                  ) : selected.payment_method === "razorpay" || selected.razorpay_payment_id ? (
                    <div className="text-white/40 text-sm">Paid via Razorpay — no screenshot required.</div>
                  ) : (
                    <div className="text-white/40 text-sm">No payment screenshot submitted yet.</div>
                  )}
                </Section>

                {statusLocked ? (
                  <Section title="Update statuses">
                    <div data-testid="failed-payment-locked" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3">
                      <div className="text-sm text-red-200 font-medium">Failed payment is view-only</div>
                      <p className="text-xs text-white/55 mt-1 leading-relaxed">
                        Payment status, delivery, and tracking cannot be changed on failed checkouts.
                      </p>
                    </div>
                    {settings && selected.phone && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        data-testid="wa-customer"
                        href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${selected.customer_name}, regarding your ${COMPANY_NAME} order ${selected.order_id}…`)}`}
                        className="btn-secondary text-sm inline-flex items-center gap-1 mt-4"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp customer
                      </a>
                    )}
                  </Section>
                ) : (
                <Section title="Update statuses">
                  {statusDraft && (
                    <div className="space-y-3">
                      {razorpayLocked ? (
                        <div data-testid="razorpay-payment-locked">
                          <div className="text-xs text-white/40 mb-1">Payment</div>
                          <div className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80">
                            {prettify(selected.payment_status)}
                          </div>
                          <p className="text-xs text-white/45 mt-2 leading-relaxed">
                            Razorpay updates this automatically after checkout signature verification or webhook confirmation. Manual payment edits are disabled.
                          </p>
                        </div>
                      ) : (
                        <Select
                          label="Payment"
                          value={statusDraft.payment_status}
                          options={PAYMENT_EDIT_OPTIONS}
                          onChange={(v) => setStatusDraft((d) => ({ ...d, payment_status: v }))}
                          testid="update-payment-status"
                        />
                      )}
                      <Select
                        label="Delivery"
                        value={statusDraft.delivery_status}
                        options={DELIVERY_EDIT_OPTIONS}
                        onChange={(v) => setStatusDraft((d) => ({ ...d, delivery_status: v }))}
                        testid="update-delivery-status"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 mt-4 flex-wrap">
                    <button
                      type="button"
                      data-testid="save-status-changes"
                      disabled={!hasStatusChanges}
                      onClick={onSave}
                      className="btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {statusSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save changes
                    </button>
                    {settings && selected.phone && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        data-testid="wa-customer"
                        href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${selected.customer_name}, regarding your ${COMPANY_NAME} order ${selected.order_id}…`)}`}
                        className="btn-secondary text-sm inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp customer
                      </a>
                    )}
                  </div>
                </Section>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentVerificationBanner({ order }) {
  const status = order.payment_status;
  const label = order.payment_verification_label || prettify(status);
  const detail =
    status === "approved"
      ? order.payment_verified_via
        ? `Confirmed via ${prettify(order.payment_verified_via)}${order.payment_verified_at ? ` · ${fmtDate(order.payment_verified_at)}` : ""}`
        : "Payment has been verified."
      : status === "submitted"
        ? "Manual proof received — review before marking paid."
        : status === "failed" || status === "rejected"
          ? (order.payment_failure_reason || "Gateway or verification did not confirm this payment.")
          : status === "refunded"
            ? "This order has been refunded."
            : "Checkout was started but payment is not confirmed yet. Visible to admin only.";

  return (
    <div className={`rounded-xl border px-4 py-3 mb-6 ${toneClass(status)}`} data-testid="payment-verification-banner">
      <div className="text-xs font-mono uppercase tracking-wider">{label}</div>
      <div className="text-sm mt-1 text-white/80">{detail}</div>
    </div>
  );
}

function ItemFiles({ item, idx }) {
  return (
    <div className="flex flex-wrap gap-4 items-start mt-3">
      {item.preview_url ? (
        <a href={resolveMediaUrl(item.preview_url)} target="_blank" rel="noreferrer" className="block group">
          <img src={resolveMediaUrl(item.preview_url)} className="w-20 h-32 rounded-lg object-cover border border-white/10 group-hover:border-brand/50" alt="Case preview" />
          <div className="text-xs text-white/40 mt-1 flex items-center gap-1">Preview <ExternalLink className="w-3 h-3" /></div>
        </a>
      ) : null}
      {item.print_url ? (
        <a data-testid={`download-print-${idx}`} href={resolveMediaUrl(item.print_url)} download target="_blank" rel="noreferrer" className="btn-primary text-xs px-2 py-1.5 inline-flex items-center gap-2 self-center">
          <Download className="w-3.5 h-3.5" /> Print File
        </a>
      ) : item.design_url ? (
        <a data-testid={`download-design-${idx}`} href={resolveMediaUrl(item.design_url)} download target="_blank" rel="noreferrer" className="btn-secondary text-xs px-2 py-1.5 inline-flex items-center gap-2 self-center">
          <Download className="w-3.5 h-3.5" /> Artwork
        </a>
      ) : null}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="glass-2 rounded-xl p-4">
      <div className="label-eyebrow mb-3">{title}</div>
      {children}
    </div>
  );
}

function MetaCard({ label, value, accent }) {
  return (
    <div className="glass-2 rounded-xl p-4">
      <div className="label-eyebrow">{label}</div>
      <div className={`mt-1 text-sm font-medium ${accent ? "text-brand font-mono" : "text-white/90"}`}>{value}</div>
    </div>
  );
}

function Info({ l, v, mono }) {
  return (
    <div className="text-sm mb-2 last:mb-0">
      <span className="text-white/40 inline-block w-36 align-top">{l}</span>
      <span className={`text-white/90 ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function Pill({ value }) {
  return (
    <span className={`px-2 py-1 rounded-md border text-xs whitespace-nowrap ${toneClass(value)}`}>
      {prettify(value)}
    </span>
  );
}

function Select({ label, value, options, onChange, testid }) {
  return (
    <div>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
      </select>
    </div>
  );
}

function quantityFrom(order) {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  }
  return 1;
}
