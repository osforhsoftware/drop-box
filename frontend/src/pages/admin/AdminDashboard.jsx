import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { TrendingUp, ShoppingBag, CheckCircle, Truck } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/admin/analytics").then((r) => setStats(r.data));
    api.get("/admin/orders").then((r) => setOrders(r.data.slice(0, 8)));
  }, []);

  if (!stats) return <div className="text-white/60">Loading…</div>;
  const tiles = [
    { label: "Total Orders", value: stats.total_orders, icon: ShoppingBag, color: "text-[#ff4f00]" },
    { label: "Pending Review", value: stats.pending, icon: TrendingUp, color: "text-amber-400" },
    { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-emerald-400" },
    { label: "Shipped", value: stats.shipped, icon: Truck, color: "text-sky-400" },
  ];

  return (
    <div data-testid="admin-dashboard">
      <div className="label-eyebrow">Overview</div>
      <h1 className="font-display text-3xl mt-2 mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tiles.map((t) => (
          <div key={t.label} className="glass rounded-xl p-5">
            <t.icon className={`w-5 h-5 ${t.color}`} />
            <div className="font-display text-3xl mt-3">{t.value}</div>
            <div className="text-xs text-white/50 mt-1">{t.label}</div>
          </div>
        ))}
        <div className="glass rounded-xl p-5 col-span-2 lg:col-span-4">
          <div className="label-eyebrow">Approved revenue</div>
          <div className="font-display text-4xl mt-2 text-[#ff4f00]">₹{stats.revenue.toFixed(0)}</div>
        </div>
      </div>

      <h2 className="font-display text-xl mb-4">Recent orders</h2>
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr><th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Phone Case</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.order_id} className="border-b border-white/[0.04]">
                <td className="p-3 font-mono text-[#ff4f00]">{o.order_id}</td>
                <td className="p-3">{o.customer_name}</td>
                <td className="p-3 text-white/70">{o.brand_name} {o.model_name}</td>
                <td className="p-3">₹{o.amount}</td>
                <td className="p-3"><Pill v={o.payment_status} /></td>
                <td className="p-3"><Pill v={o.delivery_status} /></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-white/40">No orders yet.</td></tr>
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
