import { useState } from "react";
import { Save, X, Download, MessageCircle, ExternalLink, Loader2 } from "lucide-react";
import { resolveMediaUrl } from "../../../lib/api";
import { SHIPPING_FEE } from "../../../constants/shipping";
import { COMPANY_NAME } from "../../../constants/company";
import { PAYMENT_EDIT_OPTIONS, DELIVERY_EDIT_OPTIONS } from "./orderConstants";
import { isRazorpayOrder, isFailedPaymentOrder, prettify, fmtDate, toneClass, recordKindLabel, orderMaterialLabel, orderMaterialFinish } from "./orderHelpers";

/** Download the original file bytes (no re-encode) so admin keeps full customer resolution. */
async function downloadOriginalFile(url, filename) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename || filenameFromUrl(url) || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

function filenameFromUrl(url) {
  try {
    const path = new URL(url, window.location.origin).pathname;
    const base = path.split("/").pop();
    return base && base.includes(".") ? decodeURIComponent(base) : null;
  } catch {
    return null;
  }
}

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
                          <ItemFiles item={item} idx={idx} orderId={selected.order_id} />
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
                      <DesignAssets
                        designUrl={selected.design_url}
                        previewUrl={selected.preview_url}
                        printUrl={selected.print_url}
                        orderId={selected.order_id}
                        testIdPrefix="order"
                      />
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

function ItemFiles({ item, idx, orderId }) {
  return (
    <div className="mt-3">
      <DesignAssets
        designUrl={item.design_url}
        previewUrl={item.preview_url}
        printUrl={item.print_url}
        orderId={orderId}
        testIdPrefix={`item-${idx}`}
        compact
      />
    </div>
  );
}

function DesignAssets({ designUrl, previewUrl, printUrl, orderId, testIdPrefix, compact }) {
  const designSrc = resolveMediaUrl(designUrl);
  const previewSrc = resolveMediaUrl(previewUrl);
  const printSrc = resolveMediaUrl(printUrl);
  const thumb = compact ? "w-20 h-32" : "w-28 h-44";
  const btn = compact ? "btn-secondary text-xs px-2 py-1.5" : "btn-secondary text-sm";
  const btnPrimary = compact ? "btn-primary text-xs px-2 py-1.5" : "btn-primary text-sm";
  const hasAny = designSrc || previewSrc || printSrc;

  if (!hasAny) {
    return <div className="text-white/40 text-sm">No design files for this item.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 items-start">
        {designSrc ? (
          <a href={designSrc} target="_blank" rel="noreferrer" className="block group" data-testid={`${testIdPrefix}-design-thumb`}>
            <img
              src={designSrc}
              className={`${thumb} rounded-lg object-contain bg-black/30 border border-white/10 group-hover:border-brand/50`}
              alt="Customer uploaded artwork"
            />
            <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
              Customer original <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        ) : null}
        {previewSrc ? (
          <a href={previewSrc} target="_blank" rel="noreferrer" className="block group" data-testid={`${testIdPrefix}-preview-thumb`}>
            <img
              src={previewSrc}
              className={`${thumb} rounded-lg object-cover border border-white/10 group-hover:border-brand/50`}
              alt="Case mockup preview"
            />
            <div className="text-xs text-white/40 mt-1 flex items-center gap-1">
              Case mockup <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {designSrc ? (
          <DownloadButton
            testId={`${testIdPrefix}-download-design`}
            className={btn}
            url={designSrc}
            filename={`customer-original-${orderId || "design"}${extFromUrl(designSrc)}`}
            label="Download original"
          />
        ) : null}
        {previewSrc ? (
          <DownloadButton
            testId={`${testIdPrefix}-download-preview`}
            className={btn}
            url={previewSrc}
            filename={`case-mockup-${orderId || "preview"}${extFromUrl(previewSrc)}`}
            label="Download mockup"
          />
        ) : null}
        {printSrc ? (
          <DownloadButton
            testId={`${testIdPrefix}-download-print`}
            className={btnPrimary}
            url={printSrc}
            filename={`print-300dpi-${orderId || "print"}${extFromUrl(printSrc) || ".png"}`}
            label={compact ? "Print file" : "Download 300 DPI print"}
          />
        ) : null}
      </div>
      {designSrc ? (
        <p className="text-[11px] text-white/35 leading-relaxed">
          Original is the exact file the customer uploaded (no compression). Mockup is the on-case preview.
        </p>
      ) : null}
    </div>
  );
}

function DownloadButton({ url, filename, label, className, testId }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const onClick = async () => {
    setErr("");
    setBusy(true);
    try {
      await downloadOriginalFile(url, filename);
    } catch {
      // Fallback: open full-quality file in a new tab if blob download is blocked
      setErr("Opened in new tab — use Save As for the full file.");
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        data-testid={testId}
        disabled={busy}
        onClick={onClick}
        className={`${className} inline-flex items-center gap-2 self-start disabled:opacity-50`}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {label}
      </button>
      {err ? <span className="text-[10px] text-amber-200/80">{err}</span> : null}
    </div>
  );
}

function extFromUrl(url) {
  const name = filenameFromUrl(url);
  if (!name) return "";
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
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
