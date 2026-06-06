import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Check, X, Download, MessageCircle, Eye } from "lucide-react";

const DELIVERY = ["pending_payment_verification","payment_approved","printing","packed","shipped","delivered"];
const PAYMENT = ["pending","submitted","approved","rejected"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [settings, setSettings] = useState(null);

  const load = () => api.get("/admin/orders").then((r) => setOrders(r.data));
  useEffect(() => { load(); api.get("/settings").then((r) => setSettings(r.data)); }, []);

  const update = async (orderId, patch) => {
    await api.patch(`/admin/orders/${orderId}`, patch);
    await load();
    if (selected?.order_id === orderId) {
      const fresh = (await api.get(`/orders/${orderId}`)).data;
      setSelected(fresh);
    }
  };

  const shown = orders.filter((o) =>
    filter === "all" ? true :
    filter === "pending" ? o.payment_status === "submitted" :
    filter === "approved" ? o.payment_status === "approved" :
    o.delivery_status === filter
  );

  return (
    <div data-testid="admin-orders">
      <div className="label-eyebrow">Manage</div>
      <h1 className="font-display text-3xl mt-2 mb-6">Orders</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {["all","pending","approved","printing","shipped","delivered"].map((f) => (
          <button key={f} data-testid={`filter-${f}`}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider border ${filter===f?"bg-[#ff4f00] border-[#ff4f00] text-white":"border-white/10 text-white/60 hover:text-white"}`}
          >{f}</button>
        ))}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr>
              <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Phone</th>
              <th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Delivery</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.order_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-3 font-mono text-[#ff4f00]">{o.order_id}</td>
                <td className="p-3">{o.customer_name}<div className="text-xs text-white/40">{o.phone}</div></td>
                <td className="p-3 text-white/70">{o.brand_name} {o.model_name}</td>
                <td className="p-3">₹{o.amount}</td>
                <td className="p-3"><Pill v={o.payment_status} /></td>
                <td className="p-3"><Pill v={o.delivery_status} /></td>
                <td className="p-3 text-right">
                  <button data-testid={`view-${o.order_id}`} onClick={() => setSelected(o)} className="text-white/70 hover:text-white"><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-white/40">No orders.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && (
        <div data-testid="order-modal" className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="glass rounded-2xl p-6 max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="label-eyebrow">Order details</div>
                <div className="font-mono text-2xl text-[#ff4f00] mt-1">{selected.order_id}</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <div className="label-eyebrow mb-2">Customer</div>
                <Info l="Name" v={selected.customer_name} />
                <Info l="Phone" v={selected.phone} />
                <Info l="Email" v={selected.email || "—"} />
                <Info l="Address" v={`${selected.address}, ${selected.state} - ${selected.pincode}`} />
                <Info l="Notes" v={selected.notes || "—"} />

                <div className="label-eyebrow mt-6 mb-2">Product</div>
                <Info l="Phone" v={`${selected.brand_name} ${selected.model_name}`} />
                <Info l="Case" v={selected.product_name} />
                <Info l="Amount" v={`₹${selected.amount}`} />
              </div>

              <div>
                <div className="label-eyebrow mb-2">Design</div>
                <div className="flex gap-4">
                  {selected.preview_url && <img src={selected.preview_url} className="w-24 h-40 rounded-lg object-cover border border-white/10" alt="" />}
                  <div className="flex flex-col gap-2">
                    {selected.design_url && (
                      <a data-testid="download-design" href={selected.design_url} download target="_blank" rel="noreferrer"
                        className="btn-secondary text-sm inline-flex items-center gap-2"><Download className="w-4 h-4" /> Print file</a>
                    )}
                  </div>
                </div>

                <div className="label-eyebrow mt-6 mb-2">Payment proof</div>
                {selected.payment_screenshot_url ? (
                  <div>
                    <img src={selected.payment_screenshot_url} alt="" className="rounded-lg border border-white/10 max-h-64" />
                    <div className="font-mono text-xs mt-2 text-white/70">UTR: {selected.utr}</div>
                  </div>
                ) : <div className="text-white/40 text-sm">No proof submitted.</div>}

                <div className="label-eyebrow mt-6 mb-2">Update statuses</div>
                <div className="space-y-3">
                  <Select label="Payment" value={selected.payment_status} options={PAYMENT}
                    onChange={(v) => update(selected.order_id, { payment_status: v })}
                    testid="update-payment-status" />
                  <Select label="Delivery" value={selected.delivery_status} options={DELIVERY}
                    onChange={(v) => update(selected.order_id, { delivery_status: v })}
                    testid="update-delivery-status" />
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                  <button data-testid="approve-payment"
                    onClick={() => update(selected.order_id, { payment_status: "approved", delivery_status: "payment_approved" })}
                    className="btn-primary text-sm inline-flex items-center gap-1"><Check className="w-4 h-4" /> Approve payment</button>
                  <button data-testid="reject-payment"
                    onClick={() => update(selected.order_id, { payment_status: "rejected" })}
                    className="btn-secondary text-sm inline-flex items-center gap-1"><X className="w-4 h-4" /> Reject</button>
                  {settings && (
                    <a target="_blank" rel="noreferrer" data-testid="wa-customer"
                      href={`https://wa.me/${selected.phone.replace(/[^0-9]/g,"")}?text=${encodeURIComponent(`Hi ${selected.customer_name}, regarding your FORM order ${selected.order_id}…`)}`}
                      className="btn-secondary text-sm inline-flex items-center gap-1"><MessageCircle className="w-4 h-4" /> WhatsApp customer</a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ l, v }) {
  return <div className="text-sm mb-1.5"><span className="text-white/40 inline-block w-20">{l}:</span> <span className="text-white/90">{v}</span></div>;
}
function Pill({ v }) {
  return <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs whitespace-nowrap">{(v||"").replace(/_/g," ")}</span>;
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
