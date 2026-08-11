import { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { api, resolveMediaUrl } from "../../lib/api";
import {
  Search, Loader2, Check, X, Trash2, Star, Eye, EyeOff,
  ChevronUp, ChevronDown, Camera, Plus, Upload,
} from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminCustomerGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addFiles, setAddFiles] = useState([]);
  const [addPreviews, setAddPreviews] = useState([]);
  const [adding, setAdding] = useState(false);
  const [featured, setFeatured] = useState(false);

  const load = () =>
    api.get("/admin/gallery", { params: { status } })
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    load();
  }, [status]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.id, item.order_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, query]);

  const pending = items.filter((i) => i.status === "pending").length;

  const patch = async (id, data) => {
    setSaving(true);
    try {
      const { data: updated } = await api.patch(`/admin/gallery/${id}`, data);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (selected?.id === updated.id) setSelected(updated);
      toast.success("Updated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this gallery entry and all images?")) return;
    setSaving(true);
    try {
      await api.delete(`/admin/gallery/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const moveItem = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= shown.length) return;
    const reordered = [...shown];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    const ids = reordered.map((i) => i.id);
    try {
      await api.post("/admin/gallery/reorder", { ids });
      setItems((prev) => {
        const map = Object.fromEntries(prev.map((i) => [i.id, i]));
        return ids.map((id, idx) => ({ ...map[id], sort_order: idx }));
      });
      toast.success("Order updated");
    } catch {
      toast.error("Reorder failed");
    }
  };

  const resetAddForm = () => {
    addPreviews.forEach((src) => URL.revokeObjectURL(src));
    setAddFiles([]);
    setAddPreviews([]);
    setFeatured(false);
  };

  const onAddDrop = (accepted) => {
    const remaining = MAX_IMAGES - addFiles.length;
    const toAdd = accepted.slice(0, remaining);
    if (!toAdd.length) {
      if (accepted.length) toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }
    const newFiles = [...addFiles, ...toAdd];
    setAddFiles(newFiles);
    setAddPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeAddFile = (index) => {
    URL.revokeObjectURL(addPreviews[index]);
    setAddFiles((f) => f.filter((_, i) => i !== index));
    setAddPreviews((p) => p.filter((_, i) => i !== index));
  };

  const { getRootProps: getAddRootProps, getInputProps: getAddInputProps, isDragActive: addDragActive } = useDropzone({
    onDrop: onAddDrop,
    onDropRejected: () => toast.error("Only JPG, PNG, or WEBP images under 5 MB"),
    accept: IMAGE_ACCEPT,
    multiple: true,
    maxFiles: MAX_IMAGES,
    maxSize: MAX_FILE_SIZE,
    disabled: addFiles.length >= MAX_IMAGES,
  });

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addFiles.length) {
      toast.error("Add at least one photo");
      return;
    }

    setAdding(true);
    try {
      const body = new FormData();
      body.append("featured", featured ? "true" : "false");
      addFiles.forEach((file) => body.append("images", file));

      const { data } = await api.post("/admin/gallery", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setItems((prev) => [data, ...prev]);
      resetAddForm();
      setShowAdd(false);
      setSelected(data);
      toast.success("Photos published");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div data-testid="admin-customer-gallery">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="label-eyebrow">Community</div>
          <h1 className="font-display text-3xl mt-2">Customer Gallery</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showAdd) resetAddForm();
            setShowAdd((v) => !v);
          }}
          className="btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5 self-start"
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? "Cancel" : "Upload Photos"}
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={items.length} />
        <StatCard label="Pending review" value={pending} highlight={pending > 0} />
        <StatCard label="Approved" value={items.filter((i) => i.status === "approved").length} />
        <StatCard label="Featured" value={items.filter((i) => i.featured).length} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID or order…"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                status === tab.value
                  ? "bg-brand/15 border-brand/30 text-brand"
                  : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {showAdd && (
        <form onSubmit={submitAdd} className="glass rounded-xl p-6 mb-6 space-y-5">
          <div className="flex items-center gap-2 text-brand">
            <Upload className="w-4 h-4" />
            <h2 className="font-display text-lg">Upload photos</h2>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded border-white/20"
            />
            Feature on homepage
          </label>

          <div>
            <label className="text-xs text-white/40 font-mono uppercase tracking-wider mb-2 block">
              Photos * (images only, max 5 MB each)
            </label>
            <div
              {...getAddRootProps()}
              className={`rounded-xl p-6 text-center cursor-pointer border border-dashed transition-colors ${
                addDragActive ? "border-brand bg-brand/5" : "border-white/15 bg-white/[0.02]"
              } ${addFiles.length >= MAX_IMAGES ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input {...getAddInputProps()} />
              <Upload className="w-6 h-6 mx-auto text-brand" />
              <div className="text-sm mt-2">Drop photos or click to browse</div>
              <div className="text-xs text-white/40 mt-1">{addFiles.length} / {MAX_IMAGES}</div>
            </div>
            {addPreviews.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                {addPreviews.map((src, i) => (
                  <div key={src} className="relative aspect-[3/4] rounded-lg overflow-hidden group bg-white/[0.03] flex items-center justify-center">
                    <img src={src} alt="" className="max-w-full max-h-full object-contain p-1" />
                    <button
                      type="button"
                      onClick={() => removeAddFile(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={adding || !addFiles.length} className="btn-primary text-sm px-5 py-2">
            {adding ? "Uploading…" : "Publish to Gallery"}
          </button>
        </form>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 glass rounded-xl overflow-hidden max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-10 flex justify-center">
              <Loader2 className="w-6 h-6 text-brand animate-spin" />
            </div>
          ) : shown.length === 0 ? (
            <div className="p-10 text-center text-white/50 text-sm">No submissions</div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {shown.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full text-left p-4 hover:bg-white/[0.03] transition-colors flex gap-3 ${
                      selected?.id === item.id ? "bg-brand/10" : ""
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.03] flex items-center justify-center">
                      {item.images?.[0] && (
                        <img
                          src={resolveMediaUrl(item.images[0].thumbnail_url || item.images[0].url)}
                          alt=""
                          className="max-w-full max-h-full object-contain p-1"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs truncate">{item.id.slice(0, 8)}…</span>
                        <StatusBadge status={item.status} />
                        {item.featured && (
                          <Star className="w-3 h-3 text-brand fill-brand flex-shrink-0" />
                        )}
                        {item.hidden && (
                          <EyeOff className="w-3 h-3 text-white/40 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {(item.images || []).length} photo{(item.images || []).length === 1 ? "" : "s"}
                        {item.order_id ? ` · ${item.order_id}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }}
                        className="p-1 rounded hover:bg-white/10"
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }}
                        className="p-1 rounded hover:bg-white/10"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3">
          {!selected ? (
            <div className="glass rounded-xl p-12 text-center text-white/50">
              <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Select a submission to review
            </div>
          ) : (
            <div className="glass rounded-xl p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                {selected.status === "pending" && (
                  <>
                    <ActionBtn
                      icon={Check}
                      label="Approve"
                      onClick={() => patch(selected.id, { status: "approved" })}
                      disabled={saving}
                      primary
                    />
                    <ActionBtn
                      icon={X}
                      label="Reject"
                      onClick={() => patch(selected.id, { status: "rejected" })}
                      disabled={saving}
                      danger
                    />
                  </>
                )}
                {selected.status === "approved" && (
                  <ActionBtn
                    icon={Star}
                    label={selected.featured ? "Unfeature" : "Feature"}
                    onClick={() => patch(selected.id, { featured: !selected.featured })}
                    disabled={saving}
                    primary={!selected.featured}
                  />
                )}
                <ActionBtn
                  icon={selected.hidden ? Eye : EyeOff}
                  label={selected.hidden ? "Show" : "Hide"}
                  onClick={() => patch(selected.id, { hidden: !selected.hidden })}
                  disabled={saving}
                />
                <ActionBtn
                  icon={Trash2}
                  label="Delete"
                  onClick={() => remove(selected.id)}
                  disabled={saving}
                  danger
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(selected.images || []).map((img, i) => (
                  <a
                    key={img.id || i}
                    href={resolveMediaUrl(img.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 hover:border-brand/40 transition-colors bg-white/[0.03] flex items-center justify-center"
                  >
                    <img
                      src={resolveMediaUrl(img.thumbnail_url || img.url)}
                      alt=""
                      className="max-w-full max-h-full object-contain p-2"
                    />
                  </a>
                ))}
              </div>

              <div className="text-xs text-white/40 font-mono space-y-1">
                {selected.order_id && <div>Order: {selected.order_id}</div>}
                <div>Submitted: {new Date(selected.created_at).toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div className={`glass rounded-xl p-4 ${highlight ? "border border-brand/30" : ""}`}>
      <div className="text-xs text-white/40 font-mono uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-display mt-1 ${highlight ? "text-brand" : ""}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending: "bg-amber-500/20 text-amber-400",
    approved: "bg-brand/20 text-brand",
    rejected: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${colors[status] || ""}`}>
      {status}
    </span>
  );
}

function ActionBtn({ icon: Icon, label, onClick, disabled, primary, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors disabled:opacity-50 ${
        primary
          ? "bg-brand/15 border-brand/30 text-brand hover:bg-brand/25"
          : danger
            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
            : "border-white/10 text-white/70 hover:bg-white/[0.04]"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}
