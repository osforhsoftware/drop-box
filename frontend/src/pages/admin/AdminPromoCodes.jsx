import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Plus, Trash2, Pencil, X, RefreshCw } from "lucide-react";

const EMPTY_FORM = {
  code: "",
  discount_percent: "",
  min_amount: "",
  max_uses: "",
  expires_at: "",
  enabled: true,
};

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [err, setErr] = useState("");

  const load = () => api.get("/admin/promo-codes").then((r) => setCodes(r.data));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAutoGenerate(false);
    setErr("");
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setAutoGenerate(false);
    setForm({
      code: c.code,
      discount_percent: String(c.discount_percent),
      min_amount: c.min_amount != null ? String(c.min_amount) : "",
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      enabled: c.enabled,
    });
    setErr("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setAutoGenerate(false);
    setErr("");
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  const generateCode = async () => {
    setErr("");
    setGenerating(true);
    try {
      const { data } = await api.get("/admin/promo-codes/generate");
      setForm({ ...form, code: data.code });
      setAutoGenerate(false);
    } catch (e) {
      setErr(e.response?.data?.detail || "Could not generate code");
    } finally {
      setGenerating(false);
    }
  };

  const toggleAutoGenerate = (checked) => {
    setAutoGenerate(checked);
    setErr("");
    if (checked) {
      setForm({ ...form, code: "" });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const payload = {
      discount_percent: Number(form.discount_percent),
      enabled: form.enabled,
      min_amount: form.min_amount ? Number(form.min_amount) : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
    };
    if (editing) {
      payload.code = form.code.trim().toUpperCase();
    } else if (autoGenerate) {
      payload.auto_generate = true;
    } else {
      payload.code = form.code.trim().toUpperCase();
    }
    try {
      if (editing) {
        await api.patch(`/admin/promo-codes/${editing.id}`, payload);
      } else {
        await api.post("/admin/promo-codes", payload);
      }
      closeForm();
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Save failed");
    }
  };

  const toggleEnabled = async (c) => {
    await api.patch(`/admin/promo-codes/${c.id}`, { enabled: !c.enabled });
    load();
  };

  const del = async (c) => {
    if (!confirm(`Delete promo code ${c.code}?`)) return;
    try {
      await api.delete(`/admin/promo-codes/${c.id}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Delete failed");
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div data-testid="admin-promo-codes">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label-eyebrow">Marketing</div>
          <h1 className="font-display text-3xl mt-2">Promo Codes</h1>
        </div>
        <button data-testid="add-promo" onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New code
        </button>
      </div>

      <div className="glass rounded-xl overflow-hidden mt-6">
        <table className="w-full text-sm">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr>
              <th className="p-3">Code</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Uses</th>
              <th className="p-3">Min order</th>
              <th className="p-3">Expires</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-3 font-mono text-brand">{c.code}</td>
                <td className="p-3">{c.discount_percent}%</td>
                <td className="p-3">{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</td>
                <td className="p-3">{c.min_amount != null ? `₹${c.min_amount}` : "—"}</td>
                <td className="p-3">{fmtDate(c.expires_at)}</td>
                <td className="p-3">
                  <button
                    onClick={() => toggleEnabled(c)}
                    className={`px-2 py-1 rounded-md text-xs border ${c.enabled ? "border-emerald-500/40 text-emerald-400" : "border-white/10 text-white/40"}`}
                  >
                    {c.enabled ? "Active" : "Disabled"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(c)} className="text-white/60 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(c)} className="text-white/40 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-white/40">No promo codes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={closeForm}>
          <form
            data-testid="promo-form"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="glass rounded-2xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{editing ? "Edit promo code" : "New promo code"}</h2>
              <button type="button" onClick={closeForm} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="label-eyebrow block mb-2">Code</label>
              {!editing && (
                <label className="flex items-center gap-3 text-sm mb-3">
                  <input
                    type="checkbox"
                    checked={autoGenerate}
                    onChange={(e) => toggleAutoGenerate(e.target.checked)}
                    className="accent-brand"
                    data-testid="promo-auto-generate"
                  />
                  Auto-generate on save
                </label>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder={autoGenerate && !editing ? "Generated when you save" : "SUMMER20"}
                  required={!autoGenerate || !!editing}
                  disabled={autoGenerate && !editing}
                  data-testid="promo-code-input"
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                />
                {!editing && !autoGenerate && (
                  <button
                    type="button"
                    onClick={generateCode}
                    disabled={generating}
                    data-testid="promo-generate-btn"
                    className="btn-secondary px-4 flex items-center gap-2 shrink-0"
                    title="Generate random code"
                  >
                    <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                    Generate
                  </button>
                )}
              </div>
            </div>
            <Field label="Discount %" type="number" min={1} max={100} value={form.discount_percent} onChange={(v) => set("discount_percent", v)} required />
            <Field label="Minimum order (₹)" type="number" value={form.min_amount} onChange={(v) => set("min_amount", v)} placeholder="Optional" />
            <Field label="Max uses" type="number" value={form.max_uses} onChange={(v) => set("max_uses", v)} placeholder="Unlimited" />
            <Field label="Expiry date" type="date" value={form.expires_at} onChange={(v) => set("expires_at", v)} />

            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="accent-brand" />
              Enabled
            </label>

            {err && <div className="text-red-400 text-sm">{err}</div>}

            <button type="submit" className="btn-primary w-full">
              {editing ? "Save changes" : "Create code"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, min, max }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
