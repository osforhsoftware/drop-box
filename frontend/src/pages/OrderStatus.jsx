import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, resolveMediaUrl } from "../lib/api";
import { Check, Clock, Package, Truck, Sparkles, MessageCircle } from "lucide-react";
import { SHIPPING_FEE } from "../constants/shipping";

const STATUS_STEPS = [
  { key: "pending_payment_verification", label: "Payment Verification", icon: Clock },
  { key: "payment_approved", label: "Payment Approved", icon: Check },
  { key: "printing", label: "Printing", icon: Sparkles },
  { key: "packed", label: "Packed", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Check },
];

export default function OrderStatus() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [input, setInput] = useState(orderId || "");
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState(null);

  useEffect(() => { api.get("/settings").then((r) => setSettings(r.data)); }, []);
  useEffect(() => { if (orderId) load(orderId); }, [orderId]);

  const load = async (id) => {
    setErr("");
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch {
      setErr("Order not found"); setOrder(null);
    }
  };

  const search = (e) => {
    e.preventDefault();
    if (input.trim()) navigate(`/track/${input.trim()}`);
  };

  const currentIdx = order ? STATUS_STEPS.findIndex((s) => s.key === order.delivery_status) : -1;

  return (
    <div data-testid="track-page" className="max-w-4xl mx-auto px-6 lg:px-10 py-12">
      <div className="label-eyebrow">Track Order</div>
      <h1 className="font-display text-4xl lg:text-5xl mt-3 mb-8">Where's my case?</h1>

      <form onSubmit={search} className="flex gap-3 max-w-xl">
        <input data-testid="track-input"
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your order ID (e.g. FRM-..)"
          className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand font-mono"
        />
        <button data-testid="track-search" className="btn-primary">Track</button>
      </form>
      {err && <div className="text-red-400 mt-4">{err}</div>}

      {order && (
        <div className="mt-10">
          <div className="glass rounded-2xl p-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="label-eyebrow">Order ID</div>
                <div className="font-mono text-2xl text-brand">{order.order_id}</div>
                {!order.items && (
                  <div className="text-white/60 mt-2 text-sm">
                    {order.brand_name} · {order.model_name} · {order.product_name}
                  </div>
                )}
              </div>
              {!order.items && order.preview_url && (
                <img src={resolveMediaUrl(order.preview_url)} alt="" className="w-20 h-32 object-cover rounded-lg border border-white/10" />
              )}
            </div>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <Card label="Payment status" value={prettify(order.payment_status)} />
              <Card label="Delivery status" value={prettify(order.delivery_status)} />
              <Card label="Total Amount" value={`₹${order.amount}`} />
            </div>

            {order.items && order.items.length > 0 && (
              <div className="mt-8">
                <div className="label-eyebrow mb-4">Items ({order.items.length})</div>
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="glass-2 rounded-xl p-4 flex gap-4">
                      {item.preview_url ? (
                        <img src={resolveMediaUrl(item.preview_url)} alt="" className="w-16 h-24 object-cover rounded-lg border border-white/10 shrink-0" />
                      ) : (
                        <div className="w-16 h-24 bg-zinc-900 rounded-lg shrink-0" />
                      )}
                      <div className="flex-1 text-sm">
                        <div className="font-medium text-white/90">{item.product_name}</div>
                        <div className="text-white/60 mt-1">{item.brand_name} · {item.model_name}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-white/40">Qty: {item.quantity}</span>
                          <span className="font-mono text-brand">₹{item.price * item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 glass-2 rounded-xl p-4 text-sm space-y-1 text-white/70">
              <div className="label-eyebrow">Order total</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>₹{order.shipping_fee ?? SHIPPING_FEE}</span>
                </div>
                {order.promo_code && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({order.discount_percent}%)</span>
                    <span>−₹{order.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-white pt-2 border-t border-white/10">
                  <span>Total</span>
                  <span>₹{order.amount}</span>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="label-eyebrow mb-4">Progress</div>
              <div className="space-y-3">
                {STATUS_STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const done = i <= currentIdx;
                  return (
                    <div key={s.key} className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full grid place-items-center border ${done ? "bg-brand-gradient border-brand text-white" : "bg-white/[0.04] border-white/10 text-white/40"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={`text-sm ${done ? "text-white" : "text-white/40"}`}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {settings && (
              <a href={`https://wa.me/${settings.whatsapp_number.replace(/[^0-9]/g,"")}?text=${encodeURIComponent("Hi, I need an update on order " + order.order_id)}`}
                target="_blank" rel="noreferrer"
                data-testid="track-whatsapp"
                className="btn-secondary mt-8 inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> Contact us on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="glass-2 rounded-xl p-4">
      <div className="label-eyebrow">{label}</div>
      <div className="mt-2 font-medium">{value}</div>
    </div>
  );
}

function prettify(s) {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
