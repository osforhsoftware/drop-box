import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Loader2, CircleAlert, Eye, Lock } from "lucide-react";
import { api } from "../../lib/api";
import OrderDetailsModal from "./orders/OrderDetailsModal";
import {
  fmtTime,
  istDayKey,
  worklogDayLabel,
  failureHeadline,
  productLabel,
  prettify,
} from "./orders/orderHelpers";

const PAGE_SIZE = 40;

function groupByDay(orders) {
  const groups = [];
  const index = new Map();
  orders.forEach((order) => {
    const stamp = order.payment_failed_at || order.updated_at || order.created_at;
    const key = istDayKey(stamp);
    if (!index.has(key)) {
      const group = { key, label: worklogDayLabel(stamp), items: [] };
      index.set(key, group);
      groups.push(group);
    }
    index.get(key).items.push(order);
  });
  return groups;
}

export default function AdminFailedPayments() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [settings, setSettings] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/orders", {
        params: { kind: "failed", q, page, pageSize: PAGE_SIZE },
      });
      setOrders(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => groupByDay(orders), [orders]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  return (
    <div data-testid="admin-failed-payments">
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="label-eyebrow">Worklog</div>
          <h1 className="font-display text-3xl mt-2">Failed payments</h1>
          <p className="text-sm text-white/45 mt-2 max-w-xl">
            Cancelled checkouts and gateway failures, newest first. These records are view-only.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              data-testid="failed-search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search ID, customer, phone…"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand/50"
            />
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center justify-center px-3 py-2.5 rounded-lg text-sm border border-white/10 text-white/70 hover:text-white"
          >
            All orders
          </Link>
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.08]" role="tablist" aria-label="Order records">
          {[
            { to: "/admin/orders", label: "All records" },
            { to: "/admin/orders", label: "Confirmed Orders" },
            { to: "/admin/orders", label: "Payment Pending" },
            { to: "/admin/failed-payments", label: "Failed", active: true },
          ].map((opt) => (
            opt.active ? (
              <div
                key={opt.label}
                role="tab"
                aria-selected="true"
                className="flex items-center justify-center gap-2 w-full min-w-0 px-3 py-3 text-xs font-mono uppercase tracking-wider bg-brand-gradient text-white"
              >
                {opt.label}
              </div>
            ) : (
              <Link
                key={opt.label}
                to={opt.to}
                role="tab"
                aria-selected="false"
                className="flex items-center justify-center gap-2 w-full min-w-0 px-3 py-3 text-xs font-mono uppercase tracking-wider bg-[#222] text-white/55 hover:text-white hover:bg-[#2a2a2a]"
              >
                {opt.label}
              </Link>
            )
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-xl p-5">
          <CircleAlert className="w-5 h-5 text-red-400" />
          <div className="font-display text-3xl mt-3" data-testid="failed-count">{total}</div>
          <div className="text-xs text-white/50 mt-1">Failed records</div>
        </div>
        <div className="glass rounded-xl p-5">
          <Lock className="w-5 h-5 text-white/40" />
          <div className="font-display text-3xl mt-3">Locked</div>
          <div className="text-xs text-white/50 mt-1">No status edits</div>
        </div>
        <div className="glass rounded-xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wider font-mono">Source</div>
          <div className="text-sm text-white/70 mt-3 leading-relaxed">
            Razorpay cancel / close, or a declined card, UPI, or netbanking attempt.
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="label-eyebrow">Activity</div>
            <h2 className="font-display text-xl mt-1">Payment failure log</h2>
          </div>
          <div className="text-xs text-white/40 font-mono">
            {loading ? "Loading…" : `${total} ${total === 1 ? "entry" : "entries"}`}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-white/50">
            <Loader2 className="w-6 h-6 animate-spin text-brand inline" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-white/45" data-testid="failed-empty">
            <CircleAlert className="w-8 h-8 mx-auto mb-3 text-white/25" />
            <div className="text-sm text-white/70">No failed payments yet.</div>
            <div className="text-xs mt-1">Cancelled or declined checkouts will appear here as a worklog.</div>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="sticky top-0 z-10 mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#1a1a1a] px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-white/55">
                  {group.label}
                </div>
                <div className="worklog pl-1">
                  <div className="worklog-rail" aria-hidden="true" />
                  <ul className="space-y-4">
                    {group.items.map((order) => {
                      const stamp = order.payment_failed_at || order.updated_at || order.created_at;
                      return (
                        <li key={order.order_id} className="relative pl-10">
                          <span className="worklog-dot" aria-hidden="true" />
                          <button
                            type="button"
                            data-testid={`failed-entry-${order.order_id}`}
                            onClick={() => openOrder(order.order_id)}
                            className="worklog-card w-full text-left glass-2 rounded-2xl border border-white/10 px-4 py-4 sm:px-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-mono text-white/40">{fmtTime(stamp)}</span>
                                  <span className="font-mono text-sm text-brand">{order.order_id}</span>
                                  <span className="px-2 py-0.5 rounded-md border border-red-400/30 bg-red-500/15 text-[10px] uppercase tracking-wide text-red-300">
                                    {failureHeadline(order)}
                                  </span>
                                </div>
                                <div className="text-sm text-white/85 mt-2">
                                  {order.payment_failure_reason || "Payment was not completed."}
                                </div>
                                <div className="text-xs text-white/45 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                  <span>{order.customer_name || "Customer"}</span>
                                  {order.phone ? <span>{order.phone}</span> : null}
                                  <span>{productLabel(order)}</span>
                                  <span className="font-mono text-white/70">₹{order.amount}</span>
                                  {order.payment_method ? <span>{prettify(order.payment_method)}</span> : null}
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1 text-xs text-white/45 shrink-0">
                                <Eye className="w-3.5 h-3.5" /> View
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ))}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-6 gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-30"
            >
              Previous
            </button>
            <div className="text-xs text-white/45 font-mono">Page {page} of {pageCount}</div>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {(detailLoading || selected) && (
        <OrderDetailsModal
          selected={selected}
          detailLoading={detailLoading}
          settings={settings}
          statusDraft={selected ? {
            payment_status: selected.payment_status,
            delivery_status: selected.delivery_status,
          } : null}
          setStatusDraft={() => {}}
          statusSaving={false}
          hasStatusChanges={false}
          trackingDraft={selected?.tracking_number || ""}
          setTrackingDraft={() => {}}
          onClose={() => !detailLoading && setSelected(null)}
          onSave={() => {}}
        />
      )}
    </div>
  );
}
