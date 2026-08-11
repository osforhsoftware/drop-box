import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Search, Users, ShoppingBag, MessageCircle, Loader2 } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/admin/users")
      .then((r) => { if (active) setUsers(r.data); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.phone, u.state, u.pincode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [users, query]);

  const withOrders = users.filter((u) => u.order_count > 0).length;

  return (
    <div data-testid="admin-users">
      <div className="label-eyebrow">Manage</div>
      <h1 className="font-display text-3xl mt-2 mb-6">Signups</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users} label="Total signups" value={users.length} />
        <StatCard icon={ShoppingBag} label="With orders" value={withOrders} />
        <StatCard icon={Users} label="No orders yet" value={users.length - withOrders} />
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          data-testid="user-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone…"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand/50"
        />
      </div>

      <div className="glass rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Location</th>
              <th className="p-3">Orders</th>
              <th className="p-3">Joined</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center text-white/50">
                <Loader2 className="w-6 h-6 animate-spin text-brand inline" />
              </td></tr>
            ) : shown.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-white/40">
                {users.length === 0 ? "No signups yet." : "No users match your search."}
              </td></tr>
            ) : (
              shown.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="p-3 text-white/90">{u.name || "—"}</td>
                  <td className="p-3 text-white/70">{u.email}</td>
                  <td className="p-3 text-white/70 font-mono">{u.phone || "—"}</td>
                  <td className="p-3 text-white/60">
                    {[u.state, u.pincode].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-md text-xs border ${u.order_count > 0 ? "bg-brand/10 border-brand/30 text-brand" : "bg-white/[0.04] border-white/10 text-white/50"}`}>
                      {u.order_count}
                    </span>
                  </td>
                  <td className="p-3 text-white/50">{fmtDate(u.created_at)}</td>
                  <td className="p-3 text-right">
                    {u.phone && (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://wa.me/${String(u.phone).replace(/[^0-9]/g, "")}`}
                        className="text-white/50 hover:text-brand inline-flex"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-2 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-brand/10 grid place-items-center text-brand">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="label-eyebrow">{label}</div>
        <div className="text-xl font-display mt-0.5">{value}</div>
      </div>
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
