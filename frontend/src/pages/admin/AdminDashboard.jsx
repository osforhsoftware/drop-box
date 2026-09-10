import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { TrendingUp, ShoppingBag, CheckCircle, Truck, Mail, CircleAlert } from "lucide-react";
import { fmtDate, productLabel } from "./orders/orderHelpers";

const RECENT_LIMIT = 8;
const POLL_MS = 15000;
const NEW_WITHIN_MS = 24 * 60 * 60 * 1000;

function isNewOrder(iso) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < NEW_WITHIN_MS;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const load = useCallback(() => {
    api.get("/admin/analytics").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/orders", { params: { page: 1, pageSize: RECENT_LIMIT } }).then((r) => {
      const payload = r.data;
      const items = Array.isArray(payload) ? payload : (payload.items || []);
      setOrders(items.slice(0, RECENT_LIMIT));
    }).catch(() => setOrders([]));
    api.get("/admin/contact-messages").then((r) => {
      const list = Array.isArray(r.data) ? r.data : [];
      setEnquiries(list.slice(0, 6));
    }).catch(() => setEnquiries([]));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (!stats) return <div className="text-white/60">Loading…</div>;
  const tiles = [
    { label: "Total Orders", value: stats.total_orders, icon: ShoppingBag, color: "text-brand", link: "/admin/orders" },
    { label: "Pending Review", value: stats.pending, icon: TrendingUp, color: "text-brand-light", link: "/admin/orders" },
    { label: "Failed payments", value: stats.failed ?? 0, icon: CircleAlert, color: "text-red-400", link: "/admin/failed-payments" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-emerald-400", link: "/admin/orders" },
    { label: "Shipped", value: stats.shipped, icon: Truck, color: "text-sky-400", link: "/admin/orders" },
    { label: "Contact enquiries", value: stats.contact_total ?? 0, icon: Mail, color: "text-violet-400", link: "/admin/contact" },
    { label: "Unread messages", value: stats.contact_unread ?? 0, icon: Mail, color: stats.contact_unread ? "text-brand" : "text-white/50", link: "/admin/contact" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <div className="label-eyebrow">Overview</div>
      <h1 className="font-display text-3xl mt-2 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tiles.map((t) => {
          const inner = (
            <>
              <t.icon className={`w-5 h-5 ${t.color}`} />
              <div className="font-display text-3xl mt-3">{t.value}</div>
              <div className="text-xs text-white/50 mt-1">{t.label}</div>
            </>
          );
          return t.link ? (
            <Link key={t.label} to={t.link} className="glass rounded-xl p-5 hover:border-brand/30 transition-colors block">
              {inner}
            </Link>
          ) : (
            <div key={t.label} className="glass rounded-xl p-5">{inner}</div>
          );
        })}
        <div className="glass rounded-xl p-5 col-span-2 lg:col-span-3">
          <div className="label-eyebrow">Approved revenue</div>
          <div className="font-display text-4xl mt-2 text-brand">₹{stats.revenue.toFixed(0)}</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="label-eyebrow">Promo orders</div>
          <div className="font-display text-3xl mt-2">{stats.promo_orders ?? 0}</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="label-eyebrow">Total discounts given</div>
          <div className="font-display text-3xl mt-2 text-emerald-400">₹{(stats.total_discount_given ?? 0).toFixed(0)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">Recent orders</h2>
        <Link to="/admin/orders" className="text-sm text-brand-light hover:text-brand-accent transition-colors">
          View all →
        </Link>
      </div>
      <div className="glass rounded-xl overflow-hidden mb-8" data-testid="dashboard-recent-orders">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="text-left text-white/50 border-b border-white/[0.06]">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Product</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const fresh = isNewOrder(o.created_at);
                return (
                  <tr key={o.order_id} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="p-3">
                      <Link to={`/admin/orders?order=${encodeURIComponent(o.order_id)}`} className="font-mono text-brand hover:underline">
                        {o.order_id}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-white/35">{fmtDate(o.created_at)}</span>
                        {fresh && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide bg-brand/15 border border-brand/30 text-brand">
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div>{o.customer_name}</div>
                      <div className="text-xs text-white/40">{o.phone || o.email || ""}</div>
                    </td>
                    <td className="p-3 text-white/70 max-w-[220px] truncate">{productLabel(o)}</td>
                    <td className="p-3">₹{o.amount}</td>
                    <td className="p-3"><Pill v={o.payment_label || o.payment_status} /></td>
                    <td className="p-3"><Pill v={o.delivery_label || o.delivery_status} /></td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-white/40">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-xl">Recent enquiries</h2>
        <Link to="/admin/contact" className="text-sm text-brand-light hover:text-brand-accent transition-colors">
          View all →
        </Link>
      </div>
      <div className="glass rounded-xl overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr>
              <th className="p-3">From</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.map((m) => (
              <tr key={m.id} className="border-b border-white/[0.04]">
                <td className="p-3">
                  <div className="text-white/90">{m.name}</div>
                  <div className="text-xs text-white/45">{m.email}</div>
                </td>
                <td className="p-3 text-white/70 max-w-[200px] truncate">{m.subject}</td>
                <td className="p-3 text-white/60 font-mono">{m.phone || "—"}</td>
                <td className="p-3 text-white/50">{fmtDate(m.created_at)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-md text-xs border ${m.read ? "bg-white/[0.04] border-white/10 text-white/50" : "bg-brand/10 border-brand/30 text-brand"}`}>
                    {m.read ? "Read" : "New"}
                  </span>
                </td>
              </tr>
            ))}
            {enquiries.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-white/40">No contact enquiries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pill({ v }) {
  return <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs">{(v||"").replace(/_/g," ")}</span>;
}
