import { useEffect, useRef, useState } from "react";
import { api, resolveMediaUrl } from "../../lib/api";
import { Plus, Trash2, Pencil, X, Upload, ImageIcon, ArrowUp, ArrowDown } from "lucide-react";

const EMPTY_FORM = {
  title: "",
  alt: "",
  fit: "cover",
  enabled: true,
};

const RECOMMENDED_SIZE = "1200 × 1500 px";

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get("/admin/hero-slides").then((r) => setSlides(r.data || []));
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!file) {
      if (!editing) setPreview(null);
      return undefined;
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

  const openEdit = (slide) => {
    setEditing(slide);
    setForm({
      title: slide.title || "",
      alt: slide.alt || "",
      fit: slide.fit === "contain" ? "contain" : "cover",
      enabled: slide.enabled !== false,
    });
    setFile(null);
    setPreview(resolveMediaUrl(slide.image_url));
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

  const set = (key, value) => setForm({ ...form, [key]: value });

  const submit = async (event) => {
    event.preventDefault();
    setErr("");
    if (!editing && !file) {
      setErr("Please upload an image");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("alt", form.alt.trim() || form.title.trim());
    fd.append("fit", form.fit);
    fd.append("enabled", String(form.enabled));
    if (file) fd.append("file", file);

    try {
      if (editing) {
        await api.patch(`/admin/hero-slides/${editing.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/admin/hero-slides", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      closeForm();
      load();
    } catch (error) {
      setErr(error.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (slide) => {
    await api.patch(`/admin/hero-slides/${slide.id}`, { enabled: !slide.enabled });
    load();
  };

  const move = async (slide, direction) => {
    await api.post(`/admin/hero-slides/${slide.id}/move`, { direction });
    load();
  };

  const del = async (slide) => {
    if (!confirm(`Delete hero image "${slide.title}"?`)) return;
    try {
      await api.delete(`/admin/hero-slides/${slide.id}`);
      load();
    } catch (error) {
      alert(error.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div data-testid="admin-hero-slides">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="label-eyebrow">Homepage</div>
          <h1 className="font-display text-3xl mt-2">Hero Slider</h1>
          <p className="text-sm text-white/50 mt-2 max-w-xl">
            Images shown on the homepage right-side auto slider. Enabled images play in order, with no arrows.
            Recommended size: {RECOMMENDED_SIZE}.
          </p>
        </div>
        <button data-testid="add-hero-slide" onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Upload image
        </button>
      </div>

      <div className="glass rounded-xl overflow-x-auto mt-6">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="text-left text-white/50 border-b border-white/[0.06]">
            <tr>
              <th className="p-3">Preview</th>
              <th className="p-3">Title</th>
              <th className="p-3">Fit</th>
              <th className="p-3">Order</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {slides.map((slide, index) => (
              <tr key={slide.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-3">
                  <img
                    src={resolveMediaUrl(slide.image_url)}
                    alt={slide.title}
                    className="w-16 h-16 object-cover rounded-md border border-white/10 bg-black/30"
                  />
                </td>
                <td className="p-3">
                  <div className="font-medium">{slide.title}</div>
                  {slide.alt && slide.alt !== slide.title && (
                    <div className="text-xs text-white/40 mt-1">{slide.alt}</div>
                  )}
                </td>
                <td className="p-3 text-white/60 capitalize">{slide.fit || "cover"}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(slide, "up")}
                      disabled={index === 0}
                      className="p-1.5 rounded-md border border-white/10 text-white/60 hover:text-white disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(slide, "down")}
                      disabled={index === slides.length - 1}
                      className="p-1.5 rounded-md border border-white/10 text-white/60 hover:text-white disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleEnabled(slide)}
                    className={`px-2 py-1 rounded-md text-xs border ${slide.enabled ? "border-emerald-500/40 text-emerald-400" : "border-white/10 text-white/40"}`}
                  >
                    {slide.enabled ? "Active" : "Disabled"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(slide)} className="text-white/60 hover:text-white">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(slide)} className="text-white/40 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {slides.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-white/40">No hero images yet. Upload the first slide.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4 overflow-y-auto" onClick={closeForm}>
          <form
            data-testid="hero-slide-form"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="glass rounded-2xl p-6 w-full max-w-md space-y-4 my-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{editing ? "Edit hero image" : "Upload hero image"}</h2>
              <button type="button" onClick={closeForm} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <Field label="Title" value={form.title} onChange={(v) => set("title", v)} placeholder="Couple cases" required />
            <Field label="Alt text (optional)" value={form.alt} onChange={(v) => set("alt", v)} placeholder="Shown to screen readers" />

            <div>
              <label className="label-eyebrow block mb-2">Hero image {!editing && "*"}</label>
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
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const next = e.target.files?.[0];
                    if (next) setFile(next);
                  }}
                  className="hidden"
                  id="hero-image-input"
                />
                <label
                  htmlFor="hero-image-input"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:text-white hover:border-white/20 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {preview ? "Replace image" : "Upload image"}
                </label>
              </div>
              <p className="mt-2 text-xs text-white/50 leading-relaxed">
                Recommended size: <strong className="text-white/70">{RECOMMENDED_SIZE}</strong>. JPG, PNG, or WEBP. Max 12 MB.
              </p>
            </div>

            <div>
              <label className="label-eyebrow block mb-2">Image fit</label>
              <select
                value={form.fit}
                onChange={(e) => set("fit", e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="cover">Fill the banner</option>
                <option value="contain">Show the full image</option>
              </select>
            </div>

            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="accent-brand" />
              Show on homepage slider
            </label>

            {err && <div className="text-red-400 text-sm">{err}</div>}

            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Saving…" : editing ? "Save changes" : "Add to slider"}
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
