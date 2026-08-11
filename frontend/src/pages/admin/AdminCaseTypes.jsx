import { useEffect, useRef, useState, useCallback } from "react";
import { api, resolveMediaUrl } from "../../lib/api";
import { Plus, Trash2, X, Pencil, Upload, ImageIcon } from "lucide-react";

const IMAGE_SIZE = "400 × 400 px";
const EMPTY_ITEM = { name: "", slug: "", link: "", order: "0" };

export default function AdminCaseTypes() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const res = await api.get("/case-types");
      setItems(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!file) {
      if (!editing) setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, editing]);

  const resetFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openModal = (item = null) => {
    setErr("");
    setEditing(item);
    setModal(true);
    resetFile();
    if (item) {
      setForm({ name: item.name, slug: item.slug || "", link: item.link || "", order: String(item.order || 0) });
      setPreview(item.image ? resolveMediaUrl(item.image) : null);
    } else {
      setForm(EMPTY_ITEM);
      setPreview(null);
    }
  };

  const closeModal = () => {
    setModal(false);
    setEditing(null);
    setForm(EMPTY_ITEM);
    setErr("");
    resetFile();
    setPreview(null);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const name = form.name?.trim();
      if (!name) { setErr("Name is required"); return; }
      
      const fd = new FormData();
      fd.append("name", name);
      if (form.slug) fd.append("slug", form.slug.trim());
      if (form.link) fd.append("link", form.link.trim());
      fd.append("order", form.order || "0");
      if (file) fd.append("file", file);
      
      if (editing) {
        await api.patch(`/admin/case-types/${editing.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await api.post("/admin/case-types", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await loadAll();
      closeModal();
    } catch (e) {
      setErr(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await api.delete(`/admin/case-types/${id}`);
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <div data-testid="admin-case-types">
      <div className="label-eyebrow">Catalog</div>
      <div className="flex items-start justify-between gap-4 flex-wrap mt-2 mb-6">
        <h1 className="font-display text-3xl">Case Types / Categories</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => openModal()}>
          <Plus className="w-4 h-4" /> Add Type
        </button>
      </div>

      {err && !modal && <div className="text-red-400 text-sm mb-4">{err}</div>}

      <div className="glass rounded-xl p-5 max-w-4xl">
        <div className="space-y-2 mt-4">
          {items.length === 0 && (
            <div className="text-white/40 text-sm py-4">No case types added yet.</div>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/[0.04] gap-4 bg-white/[0.02]">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center p-1">
                  {item.image ? (
                    <img src={resolveMediaUrl(item.image)} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-black/20" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-white/40 font-mono mt-0.5">{item.slug} • Order: {item.order}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => openModal(item)} className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/10">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setConfirmDelete({ id: item.id, name: item.name })} className="text-white/40 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4 overflow-y-auto" onClick={closeModal}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="glass rounded-2xl p-6 w-full max-w-md space-y-4 my-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-xl">{editing ? "Edit Case Type" : "Add Case Type"}</h2>
              <button type="button" onClick={closeModal} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <Field label="Name" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Transparent" required autoFocus />
            <Field label="Slug (optional)" value={form.slug} onChange={(v) => set("slug", v)} placeholder="e.g. transparent" />
            <Field label="Link (optional)" value={form.link} onChange={(v) => set("link", v)} placeholder="e.g. /shop?case_type=transparent" />
            <Field label="Display Order" type="number" value={form.order} onChange={(v) => set("order", v)} placeholder="0" />

            <ImageUploadField
              label="Type Image"
              sizeHint={IMAGE_SIZE}
              maxHint="4 MB"
              preview={preview}
              fileRef={fileRef}
              onFileChange={onFileChange}
              inputId="catalog-image-type"
            />

            {err && <div className="text-red-400 text-sm">{err}</div>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04]">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? "Saving…" : editing ? "Save changes" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={() => setConfirmDelete(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-5"
          >
            <h2 className="font-display text-xl">Confirm delete</h2>
            <p className="text-white/70 text-sm">Delete "{confirmDelete.name}"?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04]">
                Cancel
              </button>
              <button type="button" onClick={executeDelete} className="flex-1 px-4 py-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageUploadField({ label, sizeHint, maxHint, preview, fileRef, onFileChange, inputId }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <div className="rounded-xl border border-dashed border-white/20 p-4 text-center bg-white/[0.02]">
        {preview ? (
          <div className="bg-white rounded-lg p-2 inline-block mx-auto">
            <img src={preview} alt="Preview" className="mx-auto h-24 w-24 object-contain drop-shadow-sm" />
          </div>
        ) : (
          <div className="py-4 text-white/40">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">No image selected</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFileChange}
          className="hidden"
          id={inputId}
        />
        <label
          htmlFor={inputId}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:text-white hover:border-white/20 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          {preview ? "Replace image" : "Upload image"}
        </label>
      </div>
      <p className="mt-2 text-xs text-white/50 leading-relaxed">
        Recommended size: <strong className="text-white/70">{sizeHint}</strong> (transparent PNG).
        Max {maxHint}.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, autoFocus }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}