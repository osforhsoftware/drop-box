import { useEffect, useState } from "react";
import { api, resolveMediaUrl } from "../../lib/api";
import { Save, X, Download, MessageCircle, Eye, ExternalLink, Loader2 } from "lucide-react";
import { SHIPPING_FEE } from "../../constants/shipping";

const DELIVERY = ["pending_payment_verification","payment_approved","printing","packed","shipped","delivered"];
const PAYMENT = ["pending","submitted","approved","rejected"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [statusDraft, setStatusDraft] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); api.get("/settings").then((r) => setSettings(r.data)); }, []);

  useEffect(() => {
    if (!selected) {
      setStatusDraft(null);
      setStatusConfirm(false);
      return;
    }
    setStatusDraft({
      payment_status: selected.payment_status,
      delivery_status: selected.delivery_status,
    });
    setStatusConfirm(false);
  }, [selected]);

  const openOrder = async (orderId) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setSelected(data);
    } catch {
      const fallback = orders.find((o) => o.order_id === orderId);
      if (fallback) setSelected(fallback);
    } finally {
      setDetailLoading(false);
    }
  };

  const update = async (orderId, patch) => {
    await api.patch(`/admin/orders/${orderId}`, patch);
    await load();
    if (selected?.order_id === orderId) {
      const fresh = (await api.get(`/orders/${orderId}`)).data;
      setSelected(fresh);
    }
  };

  const hasStatusChanges = statusDraft && selected && (
    statusDraft.payment_status !== selected.payment_status ||
    statusDraft.delivery_status !== selected.delivery_status
  );

  const applyStatusSave = async () => {
    if (!statusDraft || !selected || !hasStatusChanges) return;
    setStatusSaving(true);
    try {
      await update(selected.order_id, {
        payment_status: statusDraft.payment_status,
        delivery_status: statusDraft.delivery_status,
      });
      setStatusConfirm(false);
    } finally {
      setStatusSaving(false);
    }
  };

  const shown = orders.filter((o) =>
    filter === "all" ? true :
    filter === "pending" ? o.payment_status === "submitted" :
    filter === "approved" ? o.payment_status === "approved" :
    o.delivery_status === filter
  );

  const previewSrc = selected ? resolveMediaUrl(selected.preview_url) : null;
  const designSrc = selected ? resolveMediaUrl(selected.design_url) : null;
  const printSrc = selected ? resolveMediaUrl(selected.print_url) : null;
  const paymentSrc = selected ? resolveMediaUrl(selected.payment_screenshot_url) : null;

  return (
    <div data-testid="admin-orders">
      <div className="label-eyebrow">Manage</div>
      <h1 className="font-display text-3xl mt-2 mb-6">Orders</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {["all","pending","approved","printing","shipped","delivered"].map((f) => (
          <button key={f} data-testid={`filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border ${filter===f?"bg-brand-gradient border-brand text-white":"border-white/10 text-white/60 hover:text-white"}`}
          >{f}</button>
        ))}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr>
              <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Product</th>
              <th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Delivery</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.order_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-3 font-mono text-brand">{o.order_id}</td>
                <td className="p-3">{o.customer_name}<div className="text-xs text-white/40">{o.phone}</div></td>
                <td className="p-3 text-white/70">{o.brand_name} {o.model_name}</td>
                <td className="p-3">₹{o.amount}</td>
                <td className="p-3"><Pill v={o.payment_status} /></td>
                <td className="p-3"><Pill v={o.delivery_status} /></td>
                <td className="p-3 text-right">
                  <button data-testid={`view-${o.order_id}`} onClick={() => openOrder(o.order_id)} className="text-white/70 hover:text-white"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-white/40">No orders.</td></tr>}
          </tbody>
        </table>
      </div>

      {(detailLoading || selected) && (
        <div data-testid="order-modal" className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4 overflow-y-auto" onClick={() => !detailLoading && setSelected(null)}>
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
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Pill v={selected.payment_status} />
                      <Pill v={selected.delivery_status} />
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white shrink-0"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <MetaCard label="Placed on" value={fmtDate(selected.created_at)} />
                  <MetaCard label="Last updated" value={fmtDate(selected.updated_at)} />
                  <MetaCard label="Amount" value={`₹${selected.amount}`} accent />
                </div>

                <div className="glass-2 rounded-xl p-4 mb-6 text-sm space-y-1">
                  <div className="label-eyebrow">Order total</div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                    <span>Subtotal: ₹{selected.subtotal}</span>
                    <span>Shipping: ₹{selected.shipping_fee ?? SHIPPING_FEE}</span>
                    {selected.promo_code && (
                      <>
                        <span>Code: <span className="font-mono text-brand">{selected.promo_code}</span></span>
                        <span className="text-emerald-400">Discount: −₹{selected.discount_amount} ({selected.discount_percent}%)</span>
                      </>
                    )}
                    <span className="font-medium text-white">Total: ₹{selected.amount}</span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <Section title="Customer">
                      <Info l="Name" v={selected.customer_name} />
                      <Info l="Phone" v={selected.phone} />
                      <Info l="Email" v={selected.email || "—"} />
                    </Section>

                    <Section title="Shipping">
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
                  </div>

                  <div className="space-y-6">
                    {selected.items && selected.items.length > 0 ? (
                      <Section title={`Products (${selected.items.length})`}>
                        <div className="space-y-6">
                          {selected.items.map((item, idx) => (
                            <div key={idx} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                              <Info l="Brand" v={item.brand_name} />
                              <Info l="Model" v={item.model_name} />
                              <Info l="Case type" v={item.product_name} />
                              <Info l="Quantity" v={item.quantity} />
                              <Info l="Price" v={`₹${item.price}`} />
                              
                              <div className="flex flex-wrap gap-4 items-start mt-3">
                                {item.preview_url ? (
                                  <a href={resolveMediaUrl(item.preview_url)} target="_blank" rel="noreferrer" className="block group">
                                    <img src={resolveMediaUrl(item.preview_url)} className="w-20 h-32 rounded-lg object-cover border border-white/10 group-hover:border-brand/50" alt="Case preview" />
                                    <div className="text-xs text-white/40 mt-1 flex items-center gap-1">Preview <ExternalLink className="w-3 h-3" /></div>
                                  </a>
                                ) : null}
                                {item.print_url ? (
                                  <a data-testid={`download-print-${idx}`} href={resolveMediaUrl(item.print_url)} download target="_blank" rel="noreferrer"
                                    className="btn-primary text-xs px-2 py-1.5 inline-flex items-center gap-2 self-center">
                                    <Download className="w-3.5 h-3.5" /> Print File
                                  </a>
                                ) : item.design_url ? (
                                  <a data-testid={`download-design-${idx}`} href={resolveMediaUrl(item.design_url)} download target="_blank" rel="noreferrer"
                                    className="btn-secondary text-xs px-2 py-1.5 inline-flex items-center gap-2 self-center">
                                    <Download className="w-3.5 h-3.5" /> Artwork
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Section>
                    ) : (
                      <>
                        <Section title="Product">
                          <Info l="Brand" v={selected.brand_name} />
                          <Info l="Model" v={selected.model_name} />
                          <Info l="Case type" v={selected.product_name} />
                          {selected.promo_code ? (
                            <>
                              <Info l="Subtotal" v={`₹${selected.subtotal}`} />
                              <Info l="Shipping" v={`₹${selected.shipping_fee ?? SHIPPING_FEE}`} />
                              <Info l="Promo code" v={`${selected.promo_code} (−${selected.discount_percent}%)`} />
                              <Info l="Discount" v={`−₹${selected.discount_amount}`} />
                              <Info l="Total" v={`₹${selected.amount}`} />
                            </>
                          ) : (
                            <>
                              <Info l="Subtotal" v={`₹${selected.subtotal}`} />
                              <Info l="Shipping" v={`₹${selected.shipping_fee ?? SHIPPING_FEE}`} />
                              <Info l="Total" v={`₹${selected.amount}`} />
                            </>
                          )}
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
                              <a data-testid="download-print" href={printSrc} download target="_blank" rel="noreferrer"
                                className="btn-primary text-sm inline-flex items-center gap-2 self-center">
                                <Download className="w-4 h-4" /> Download 300 DPI print
                              </a>
                            ) : designSrc ? (
                              <a data-testid="download-design" href={designSrc} download target="_blank" rel="noreferrer"
                                className="btn-secondary text-sm inline-flex items-center gap-2 self-center">
                                <Download className="w-4 h-4" /> Download artwork
                              </a>
                            ) : null}
                          </div>
                        </Section>
                      </>
                    )}

                    <Section title="Payment proof">
                      {paymentSrc ? (
                        <div>
                          <a href={paymentSrc} target="_blank" rel="noreferrer" className="block group">
                            <img
                              data-testid="payment-screenshot"
                              src={paymentSrc}
                              alt="Payment screenshot"
                              className="rounded-lg border border-white/10 w-full max-h-80 object-contain bg-black/30 group-hover:border-brand/50"
                            />
                            <div className="text-xs text-brand mt-2 flex items-center gap-1">Open full screenshot <ExternalLink className="w-3 h-3" /></div>
                          </a>
                          <Info l="UTR / Transaction ID" v={selected.utr || "—"} mono />
                          <Info l="Payment status" v={prettify(selected.payment_status)} />
                        </div>
                      ) : (
                        <div className="text-white/40 text-sm">No payment screenshot submitted yet.</div>
                      )}
                    </Section>

                    <Section title="Update statuses">
                      {statusDraft && (
                        <div className="space-y-3">
                          <Select label="Payment" value={statusDraft.payment_status} options={PAYMENT}
                            onChange={(v) => setStatusDraft((d) => ({ ...d, payment_status: v }))}
                            testid="update-payment-status" />
                          <Select label="Delivery" value={statusDraft.delivery_status} options={DELIVERY}
                            onChange={(v) => setStatusDraft((d) => ({ ...d, delivery_status: v }))}
                            testid="update-delivery-status" />
                        </div>
                      )}

                      <div className="flex gap-2 mt-4 flex-wrap">
                        <button
                          type="button"
                          data-testid="save-status-changes"
                          disabled={!hasStatusChanges}
                          onClick={() => setStatusConfirm(true)}
                          className="btn-primary text-sm inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4" /> Save changes
                        </button>
                        {settings && (
                          <a target="_blank" rel="noreferrer" data-testid="wa-customer"
                            href={`https://wa.me/${selected.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Hi ${selected.customer_name}, regarding your FORM order ${selected.order_id}…`)}`}
                            className="btn-secondary text-sm inline-flex items-center gap-1"><MessageCircle className="w-4 h-4" /> WhatsApp customer</a>
                        )}
                      </div>
                    </Section>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {statusConfirm && selected && statusDraft && (
        <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-4" onClick={() => !statusSaving && setStatusConfirm(false)}>
          <div
            data-testid="order-status-confirm"
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-5"
          >
            <div>
              <div className="label-eyebrow">Update statuses</div>
              <h2 className="font-display text-xl mt-1">Save changes?</h2>
              <p className="text-white/50 text-sm mt-1 font-mono">{selected.order_id}</p>
            </div>

            <div className="glass-2 rounded-xl p-4 text-sm space-y-3">
              {statusDraft.payment_status !== selected.payment_status && (
                <StatusChangeRow
                  label="Payment"
                  from={selected.payment_status}
                  to={statusDraft.payment_status}
                />
              )}
              {statusDraft.delivery_status !== selected.delivery_status && (
                <StatusChangeRow
                  label="Delivery"
                  from={selected.delivery_status}
                  to={statusDraft.delivery_status}
                />
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => setStatusConfirm(false)}
                className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-status-update"
                disabled={statusSaving}
                onClick={applyStatusSave}
                className="flex-1 px-4 py-3 rounded-lg bg-brand-gradient bg-brand-gradient-hover text-white inline-flex items-center justify-center gap-1 disabled:opacity-40"
              >
                {statusSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="w-4 h-4" /> Save</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
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
      <span className="text-white/40 inline-block w-36">{l}</span>
      <span className={`text-white/90 ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function Pill({ v }) {
  return <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs whitespace-nowrap">{(v||"").replace(/_/g," ")}</span>;
}

function StatusChangeRow({ label, from, to }) {
  return (
    <div>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs">{prettify(from)}</span>
        <span className="text-white/30">→</span>
        <span className="px-2 py-1 rounded-md bg-brand/10 border border-brand/30 text-xs text-brand">{prettify(to)}</span>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange, testid }) {
  return (
    <div>
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g," ")}</option>)}
      </select>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function prettify(s) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
