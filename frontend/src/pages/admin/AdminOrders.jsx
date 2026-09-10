import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Filter, Download, Search, Eye, Loader2, X, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { api } from "../../lib/api";
import FilterPanel from "./orders/FilterPanel";
import ExportPanel from "./orders/ExportPanel";
import OrderDetailsModal from "./orders/OrderDetailsModal";
import {
  DEFAULT_FILTERS,
  QUICK_STATUS_TABS,
  EXPORT_COLUMNS,
  PAGE_SIZE,
} from "./orders/orderConstants";
import {
  isRazorpayOrder,
  isFailedPaymentOrder,
  prettify,
  fmtDate,
  productLabel,
  quantityOf,
  toneClass,
  recordKindLabel,
  hasActiveFilters,
  compactParams,
  filtersWithoutChip,
  filenameFromDisposition,
} from "./orders/orderHelpers";

export default function AdminOrders() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [unpaid, setUnpaid] = useState(0);
  const [failed, setFailed] = useState(0);
  const [appliedChips, setAppliedChips] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState("filtered");
  const [exportFormat, setExportFormat] = useState("csv");
  const [exportColumns, setExportColumns] = useState(() => EXPORT_COLUMNS.map((c) => c.key));
  const [exporting, setExporting] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [statusDraft, setStatusDraft] = useState(null);
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState("");

  const filterRef = useRef(null);
  const exportRef = useRef(null);

  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(1);
  }, [q, filters]);

  const params = useMemo(
    () => compactParams(filters, q, page, PAGE_SIZE),
    [filters, q, page]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/orders", { params });
      setOrders(data.items || []);
      setTotal(data.total || 0);
      setConfirmed(data.confirmed || 0);
      setUnpaid(data.unpaid || 0);
      setFailed(data.failed || 0);
      setAppliedChips(data.applied || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onDoc = (e) => {
      if (e.target.closest("[data-testid='orders-filter-btn']") || e.target.closest("[data-testid='orders-export-btn']")) {
        return;
      }
      if (filterOpen && filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen, exportOpen]);

  useEffect(() => {
    if (!selected) {
      setStatusDraft(null);
      setStatusConfirm(false);
      setTrackingDraft("");
      return;
    }
    setStatusDraft({
      payment_status: selected.payment_status,
      delivery_status: selected.delivery_status,
    });
    setTrackingDraft(selected.tracking_number || "");
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

  const urlOrderId = searchParams.get("order");
  useEffect(() => {
    if (!urlOrderId) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setSelected(null);
      try {
        const { data } = await api.get(`/orders/${urlOrderId}`);
        if (!cancelled) setSelected(data);
      } catch {
        if (!cancelled) setSelected(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [urlOrderId]);

  const update = async (orderId, patch) => {
    await api.patch(`/admin/orders/${orderId}`, patch);
    await load();
    if (selected?.order_id === orderId) {
      const fresh = (await api.get(`/orders/${orderId}`)).data;
      setSelected(fresh);
    }
  };

  const razorpayLocked = isRazorpayOrder(selected);
  const statusLocked = isFailedPaymentOrder(selected);
  const trackingChanged = selected && trackingDraft.trim() !== (selected.tracking_number || "");
  const hasStatusChanges = Boolean(
    statusDraft && selected && !statusLocked && (
      (!razorpayLocked && statusDraft.payment_status !== selected.payment_status) ||
      statusDraft.delivery_status !== selected.delivery_status ||
      trackingChanged
    )
  );

  const applyStatusSave = async () => {
    if (!statusDraft || !selected || !hasStatusChanges) return;
    setStatusSaving(true);
    try {
      const patch = { delivery_status: statusDraft.delivery_status };
      if (!isRazorpayOrder(selected)) patch.payment_status = statusDraft.payment_status;
      if (trackingChanged) patch.tracking_number = trackingDraft.trim();
      await update(selected.order_id, patch);
      setStatusConfirm(false);
      toast.success("Order updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update order status");
    } finally {
      setStatusSaving(false);
    }
  };

  const applyDraftFilters = () => {
    setFilters({ ...draft });
    setFilterOpen(false);
    setPage(1);
  };

  const resetDraft = () => setDraft({ ...DEFAULT_FILTERS });

  const clearAll = () => {
    setDraft({ ...DEFAULT_FILTERS });
    setFilters({ ...DEFAULT_FILTERS });
    setQ("");
    setQInput("");
    setPage(1);
    setFilterOpen(false);
  };

  const removeChip = (key) => {
    const next = filtersWithoutChip(filters, q, key);
    setFilters(next.filters);
    setDraft(next.filters);
    setQ(next.q);
    if (key === "q") setQInput("");
    setPage(1);
  };

  const setQuickStatus = (value) => {
    const next = { ...filters, orderStatus: value };
    setFilters(next);
    setDraft(next);
    setPage(1);
  };

  const setKind = (value) => {
    if (value === "failed") {
      navigate("/admin/failed-payments");
      return;
    }
    const next = { ...filters, kind: value };
    setFilters(next);
    setDraft(next);
    setPage(1);
  };

  const toggleExportColumn = (key) => {
    setExportColumns((cols) => (
      cols.includes(key) ? cols.filter((c) => c !== key) : [...cols, key]
    ));
  };

  const selectAllColumns = () => {
    setExportColumns((cols) => (
      cols.length === EXPORT_COLUMNS.length ? [] : EXPORT_COLUMNS.map((c) => c.key)
    ));
  };

  const runExport = async () => {
    if (exportColumns.length === 0) {
      toast.error("Select at least one column");
      return;
    }
    setExporting(true);
    try {
      const payload = {
        ...compactParams(filters, q, page, PAGE_SIZE),
        scope: exportScope,
        format: exportFormat,
        columns: exportColumns,
      };
      const res = await api.post("/admin/orders/export", payload, { responseType: "blob" });
      const filename = filenameFromDisposition(
        res.headers["content-disposition"],
        `orders-${exportScope}.${exportFormat}`
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const count = res.headers["x-export-count"];
      toast.success(count ? `Exported ${count} orders` : "Export downloaded");
      setExportOpen(false);
    } catch (err) {
      let message = "Export failed";
      const data = err.response?.data;
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text());
          message = parsed.detail || message;
        } catch { /* keep default */ }
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      }
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtersOn = hasActiveFilters(filters, q);

  return (
    <div data-testid="admin-orders">
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="label-eyebrow">Manage</div>
          <h1 className="font-display text-3xl mt-2">Orders</h1>
          <Link to="/admin/failed-payments" className="inline-block text-xs text-red-300/80 hover:text-red-200 mt-2">
            Failed payments worklog →
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative sm:w-72">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              data-testid="orders-search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search ID, customer, phone, email, product"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand/50"
            />
          </div>
          <button
            type="button"
            data-testid="orders-filter-btn"
            onClick={() => { setFilterOpen((v) => !v); setExportOpen(false); setDraft(filters); }}
            className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border ${filterOpen || filtersOn ? "bg-brand/15 border-brand/40 text-brand" : "border-white/10 text-white/70 hover:text-white"}`}
          >
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button
            type="button"
            data-testid="orders-export-btn"
            onClick={() => { setExportOpen((v) => !v); setFilterOpen(false); }}
            className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border ${exportOpen ? "bg-brand/15 border-brand/40 text-brand" : "border-white/10 text-white/70 hover:text-white"}`}
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {filterOpen && (
        <div className="mb-5" ref={filterRef}>
          <FilterPanel
            draft={draft}
            onChange={setDraft}
            onApply={applyDraftFilters}
            onReset={resetDraft}
            onClearAll={clearAll}
          />
        </div>
      )}
      {exportOpen && (
        <div className="mb-5" ref={exportRef}>
          <ExportPanel
            scope={exportScope}
            format={exportFormat}
            columns={exportColumns}
            exporting={exporting}
            onScope={setExportScope}
            onFormat={setExportFormat}
            onToggleColumn={toggleExportColumn}
            onSelectAll={selectAllColumns}
            onExport={runExport}
          />
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden relative">
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.08]"
          role="tablist"
          aria-label="Order records"
        >
          {[
            { value: "", label: "All records" },
            { value: "confirmed", label: "Confirmed Orders" },
            { value: "unpaid", label: "Payment Pending" },
            { value: "failed", label: "Failed" },
          ].map((opt) => (
            <SegmentButton
              key={opt.value || "all-kind"}
              testId={`kind-${opt.value || "all"}`}
              active={filters.kind === opt.value}
              onClick={() => setKind(opt.value)}
            >
              {opt.label}
            </SegmentButton>
          ))}
        </div>

        <div
          className="grid grid-cols-3 lg:grid-cols-6 gap-px bg-white/[0.08] border-t border-white/[0.08]"
          role="tablist"
          aria-label="Order status"
        >
          {QUICK_STATUS_TABS.map((f) => (
            <SegmentButton
              key={f}
              testId={`filter-${f}`}
              active={filters.orderStatus === f}
              onClick={() => setQuickStatus(f)}
            >
              {f}
            </SegmentButton>
          ))}
        </div>

        {appliedChips.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-white/[0.08] bg-white/[0.02]"
            data-testid="active-filter-chips"
          >
            {appliedChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeChip(chip.key)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-brand/10 border border-brand/30 text-brand-light"
              >
                <span className="text-white/45">{chip.label}:</span> {chip.value}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="ml-auto text-xs text-white/50 hover:text-white">
              Clear All
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-y border-white/[0.08] text-sm text-white/50">
          <div data-testid="orders-result-count">
            {loading ? "Loading orders…" : (
              <>
                <span className="text-white/80">{total}</span> matching {total === 1 ? "order" : "orders"}
                {total > 0 && <> · showing {from}–{to}</>}
                <span className="text-white/35"> · {confirmed} confirmed · {unpaid} pending · {failed} failed</span>
              </>
            )}
          </div>
        </div>

        {exporting && (
          <div className="absolute inset-0 z-10 bg-black/50 grid place-items-center" data-testid="export-progress">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-brand" /> Preparing export…
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="text-left text-white/50 border-b border-white/[0.06]">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Product</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Delivery</th>
                <th className="p-3">Record</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-16 text-center text-white/50">
                    <Loader2 className="w-6 h-6 animate-spin text-brand inline mb-2" />
                    <div className="text-sm">Loading orders…</div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-14 text-center text-white/45" data-testid="orders-empty">
                    <Inbox className="w-8 h-8 mx-auto mb-3 text-white/25" />
                    <div className="text-sm text-white/70">No orders match these filters.</div>
                    <div className="text-xs mt-1">Payment-pending checkouts still appear here until you filter them out.</div>
                    {filtersOn && (
                      <button type="button" onClick={clearAll} className="mt-4 text-xs text-brand-light hover:text-brand">
                        Clear All filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.order_id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="font-mono text-brand">{o.order_id}</div>
                      <div className="text-[11px] text-white/35 mt-0.5">{fmtDate(o.created_at)}</div>
                    </td>
                    <td className="p-3">
                      {o.customer_name}
                      <div className="text-xs text-white/40">{o.phone}</div>
                    </td>
                    <td className="p-3 text-white/70 max-w-[220px] truncate">{productLabel(o)}</td>
                    <td className="p-3 text-white/70">{quantityOf(o)}</td>
                    <td className="p-3">₹{o.amount}</td>
                    <td className="p-3"><Pill value={o.payment_label || o.payment_status} /></td>
                    <td className="p-3"><Pill value={o.delivery_label || o.delivery_status} /></td>
                    <td className="p-3"><Pill value={recordKindLabel(o.record_kind)} /></td>
                    <td className="p-3 text-right">
                      <button data-testid={`view-${o.order_id}`} onClick={() => openOrder(o.order_id)} className="text-white/70 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 gap-3" data-testid="orders-pagination">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <div className="text-xs text-white/45 font-mono">Page {page} of {pageCount}</div>
          <button
            type="button"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-sm text-white/70 disabled:opacity-30"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {(detailLoading || selected) && (
        <OrderDetailsModal
          selected={selected}
          detailLoading={detailLoading}
          settings={settings}
          statusDraft={statusDraft}
          setStatusDraft={setStatusDraft}
          statusSaving={statusSaving}
          hasStatusChanges={hasStatusChanges}
          trackingDraft={trackingDraft}
          setTrackingDraft={setTrackingDraft}
          onClose={() => !detailLoading && setSelected(null)}
          onSave={() => setStatusConfirm(true)}
        />
      )}

      {statusConfirm && selected && statusDraft && (
        <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-4" onClick={() => !statusSaving && setStatusConfirm(false)}>
          <div data-testid="order-status-confirm" onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-6 w-full max-w-sm space-y-5">
            <div>
              <div className="label-eyebrow">Update statuses</div>
              <h2 className="font-display text-xl mt-1">Save changes?</h2>
              <p className="text-white/50 text-sm mt-1 font-mono">{selected.order_id}</p>
            </div>
            <div className="glass-2 rounded-xl p-4 text-sm space-y-3">
              {!razorpayLocked && statusDraft.payment_status !== selected.payment_status && (
                <StatusChangeRow label="Payment" from={selected.payment_status} to={statusDraft.payment_status} />
              )}
              {statusDraft.delivery_status !== selected.delivery_status && (
                <StatusChangeRow label="Delivery" from={selected.delivery_status} to={statusDraft.delivery_status} />
              )}
              {trackingChanged && (
                <StatusChangeRow label="Tracking" from={selected.tracking_number || "—"} to={trackingDraft.trim() || "—"} />
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" disabled={statusSaving} onClick={() => setStatusConfirm(false)} className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04] disabled:opacity-40">
                Cancel
              </button>
              <button type="button" data-testid="confirm-status-update" disabled={statusSaving} onClick={applyStatusSave} className="flex-1 px-4 py-3 rounded-lg bg-brand-gradient bg-brand-gradient-hover text-white inline-flex items-center justify-center gap-1 disabled:opacity-40">
                {statusSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentButton({ active, onClick, testId, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={testId}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 w-full min-w-0 px-3 py-3 text-xs font-mono uppercase tracking-wider transition-colors ${
        active
          ? "bg-brand-gradient text-white"
          : "bg-[#222] text-white/55 hover:text-white hover:bg-[#2a2a2a]"
      }`}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

function Pill({ value }) {
  return (
    <span className={`px-2 py-1 rounded-md border text-xs whitespace-nowrap ${toneClass(value)}`}>
      {prettify(value)}
    </span>
  );
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
