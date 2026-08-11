import { useEffect, useRef, useState } from "react";
import { api, resolveMediaUrl } from "../../lib/api";
import { Plus, Trash2, Pencil, X, Upload, ImageIcon } from "lucide-react";

const EMPTY_FORM = {
  title: "",
  link_url: "",
  starts_at: "",
  ends_at: "",
  enabled: true,
};

const RECOMMENDED_SIZE = "800 × 1000 px";

export default function AdminPopupOffers() {
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get("/admin/popup-offers").then((r) => setOffers(r.data));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!file) {
      if (!editing) setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, editing]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setPreview(null);
    setErr("");
    setShowForm(true);
  };

  const openEdit = (o) => {
    setEditing(o);
    setForm({
      title: o.title,
      link_url: o.link_url || "",
      starts_at: o.starts_at ? o.starts_at.slice(0, 10) : "",
      ends_at: o.ends_at ? o.ends_at.slice(0, 10) : "",
      enabled: o.enabled,
    });
    setFile(null);
    setPreview(resolveMediaUrl(o.image_url));
    setErr("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFile(null);
    setPreview(null);
    setErr("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!editing && !file) {
      setErr("Please upload an image");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("link_url", form.link_url.trim());
    fd.append("enabled", String(form.enabled));
    if (form.starts_at) fd.append("starts_at", new Date(`${form.starts_at}T00:00:00`).toISOString());
    else fd.append("starts_at", "");
    if (form.ends_at) fd.append("ends_at", new Date(`${form.ends_at}T23:59:59`).toISOString());
    else fd.append("ends_at", "");
    if (file) fd.append("file", file);

    try {
      if (editing) {
        await api.patch(`/admin/popup-offers/${editing.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/admin/popup-offers", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      closeForm();
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (o) => {
    await api.patch(`/admin/popup-offers/${o.id}`, { enabled: !o.enabled });
    load();
  };

  const del = async (o) => {
    if (!confirm(`Delete popup offer "${o.title}"?`)) return;
    try {
      await api.delete(`/admin/popup-offers/${o.id}`);
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
    <div data-testid="admin-popup-offers">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label-eyebrow">Marketing</div>
          <h1 className="font-display text-3xl mt-2">Popup Offers</h1>
          <p className="text-sm text-white/50 mt-2 max-w-xl">
            Promotional image shown on the homepage. Recommended size: {RECOMMENDED_SIZE} (4:5 portrait).
          </p>
        </div>
        <button data-testid="add-popup-offer" onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New popup
        </button>
      </div>

      <div className="glass rounded-xl overflow-x-auto mt-6">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr>
              <th className="p-3">Preview</th>
              <th className="p-3">Title</th>
              <th className="p-3">Link</th>
              <th className="p-3">Schedule</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-3">
                  <img
                    src={resolveMediaUrl(o.image_url)}
                    alt={o.title}
                    className="w-12 h-14 object-cover rounded-md border border-white/10"
                  />
                </td>
                <td className="p-3 font-medium">{o.title}</td>
                <td className="p-3 text-white/60 font-mono text-xs max-w-[140px] truncate">
                  {o.link_url || "—"}
                </td>
                <td className="p-3 text-white/60 text-xs">
                  {fmtDate(o.starts_at)} → {fmtDate(o.ends_at)}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleEnabled(o)}
                    className={`px-2 py-1 rounded-md text-xs border ${o.enabled ? "border-emerald-500/40 text-emerald-400" : "border-white/10 text-white/40"}`}
                  >
                    {o.enabled ? "Active" : "Disabled"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(o)} className="text-white/60 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(o)} className="text-white/40 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-white/40">No popup offers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4 overflow-y-auto" onClick={closeForm}>
          <form
            data-testid="popup-offer-form"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="glass rounded-2xl p-6 w-full max-w-md space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{editing ? "Edit popup offer" : "New popup offer"}</h2>
              <button type="button" onClick={closeForm} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <Field label="Title" value={form.title} onChange={(v) => set("title", v)} placeholder="Summer Sale" required />

            <div>
              <label className="label-eyebrow block mb-2">Popup image {!editing && "*"}</label>
              <div className="rounded-xl border border-dashed border-white/20 p-4 text-center">
                {preview ? (
                  <img src={preview} alt="Preview" className="mx-auto max-h-48 w-auto rounded-lg object-contain" />
                ) : (
                  <div className="py-8 text-white/40">
                    <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">No image selected</div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onFileChange}
                  className="hidden"
                  id="popup-image-input"
                />
                <label
                  htmlFor="popup-image-input"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:text-white hover:border-white/20 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {preview ? "Replace image" : "Upload image"}
                </label>
              </div>
              <p className="mt-2 text-xs text-white/50 leading-relaxed">
                Recommended image size: <strong className="text-white/70">{RECOMMENDED_SIZE}</strong> (4:5 portrait).
                Formats: JPG, PNG, or WEBP. Max 12 MB. Image scales down on smaller screens.
              </p>
            </div>

            <Field label="Link URL (optional)" value={form.link_url} onChange={(v) => set("link_url", v)} placeholder="/customize" />
            <Field label="Start date" type="date" value={form.starts_at} onChange={(v) => set("starts_at", v)} />
            <Field label="End date" type="date" value={form.ends_at} onChange={(v) => set("ends_at", v)} />

            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="accent-brand" />
              Enabled
            </label>

            {err && <div className="text-red-400 text-sm">{err}</div>}

            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Saving…" : editing ? "Save changes" : "Create popup"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
