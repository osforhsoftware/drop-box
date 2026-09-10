import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { api, resolveMediaUrl } from "../../lib/api";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_COLLECTIONS,
  TEMPLATE_PHONE_BRANDS,
  TEMPLATE_PRODUCT_TYPES,
  formatPrice,
  displayTemplateTitle,
  productTypeLabel,
  normalizeProductType,
  TEMPLATE_THUMB_SPEC,
  TEMPLATE_TAG_SUGGESTIONS,
} from "../../constants/templateProducts";
import {
  Plus, Trash2, Pencil, Copy, Star, Eye, EyeOff, Globe, Search, X, Check, RotateCcw,
} from "lucide-react";
import TemplateQuickView from "../../components/TemplateQuickView";
import TagSelect from "../../components/TagSelect";
import LogoColorSelect from "../../components/LogoColorSelect";
import { isColorTag, partitionTags } from "../../constants/colorSwatch";

const EMPTY = {
  title: "",
  slug: "",
  description: "",
  short_description: "",
  product_type: "customized",
  phone_brand: "Apple",
  phone_models: [],
  category: "Minimal",
  collection: "Essentials",
  case_type: "",
  material: "",
  price: "",
  sale_price: "",
  stock: "10",
  sku: "",
  tags: [],
  featured: false,
  best_seller: false,
  new_arrival: true,
  status: "published",
  rating: "4.5",
  review_count: "0",
  meta_title: "",
  meta_description: "",
  keywords: "",
};

const NON_COLOR_TAG_SUGGESTIONS = TEMPLATE_TAG_SUGGESTIONS.filter((t) => !isColorTag(t));

function mergeColorAndOtherTags(colorTags, otherTags) {
  return [...colorTags, ...otherTags];
}

export default function AdminTemplateProducts() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState("active");
  const [selected, setSelected] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [thumbnail, setThumbnail] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [preview, setPreview] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [caseTypes, setCaseTypes] = useState([]);
  const thumbRef = useRef(null);
  const galleryRef = useRef(null);

  const isTrashView = viewMode === "trash";

  useEffect(() => {
    api
      .get("/case-types")
      .then((r) => setCaseTypes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCaseTypes([]));
  }, []);

  const load = useCallback((p = 1) => {
    setLoading(true);
    const params = { page: p, limit: 20, status: statusFilter };
    if (search) params.search = search;
    if (typeFilter !== "all") params.product_type = typeFilter;
    if (viewMode === "trash") params.trash = "true";
    api
      .get("/admin/template-products", { params })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [statusFilter, search, typeFilter, viewMode]);

  useEffect(() => {
    const t = setTimeout(() => load(1), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const set = (k, v) => setForm({ ...form, [k]: v });

  useEffect(() => {
    const urls = gallery.map((f) => URL.createObjectURL(f));
    setGalleryPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [gallery]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, case_type: caseTypes[0]?.slug || "" });
    setThumbnail(null);
    setGallery([]);
    setPreview(null);
    setExistingImages([]);
    setRemoveImages([]);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: displayTemplateTitle(item.title),
      slug: item.slug,
      description: item.description || "",
      short_description: item.short_description || "",
      product_type: normalizeProductType(item.product_type),
      phone_brand: item.phone_brand || "Apple",
      phone_models: [...(item.phone_models || [])],
      category: item.category || "Minimal",
      collection: item.collection || "Essentials",
      case_type: item.case_type || caseTypes[0]?.slug || "",
      material: item.material || "",
      price: String(item.price),
      sale_price: item.sale_price != null ? String(item.sale_price) : "",
      stock: String(item.stock ?? 0),
      sku: item.sku || "",
      tags: [...(item.tags || [])],
      featured: item.featured,
      best_seller: item.best_seller,
      new_arrival: item.new_arrival,
      status: item.status,
      rating: String(item.rating ?? 4.5),
      review_count: String(item.review_count ?? 0),
      meta_title: item.seo?.meta_title || "",
      meta_description: item.seo?.meta_description || "",
      keywords: item.seo?.keywords || "",
    });
    setThumbnail(null);
    setGallery([]);
    setPreview(resolveMediaUrl(item.thumbnail));
    setExistingImages(item.images || []);
    setRemoveImages([]);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    if (thumbRef.current) thumbRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const onThumbnailChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnail(f);
    setPreview(URL.createObjectURL(f));
  };

  const onGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGallery((prev) => [...prev, ...files]);
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const removeExistingImage = (url) => {
    setExistingImages((prev) => {
      const next = prev.filter((u) => u !== url);
      if (!thumbnail && preview && resolveMediaUrl(url) === preview) {
        setPreview(next[0] ? resolveMediaUrl(next[0]) : null);
      }
      return next;
    });
    setRemoveImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const removeNewGalleryFile = (index) => {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const clearThumbnail = () => {
    setThumbnail(null);
    if (thumbRef.current) thumbRef.current.value = "";
    if (editing?.thumbnail && existingImages.includes(editing.thumbnail)) {
      removeExistingImage(editing.thumbnail);
      return;
    }
    if (editing?.thumbnail) {
      setPreview(resolveMediaUrl(editing.thumbnail));
      return;
    }
    setPreview(null);
  };

  const requestRemoveThumbnail = () => {
    if (!preview && !thumbnail) return;
    setConfirmAction({
      type: "removeThumbnail",
      message: "Remove the thumbnail image?",
      destructive: true,
    });
  };

  const requestRemoveExistingImage = (url) => {
    setConfirmAction({
      type: "removeGalleryExisting",
      url,
      message: "Remove this gallery image?",
      destructive: true,
    });
  };

  const requestRemoveNewGalleryFile = (index) => {
    setConfirmAction({
      type: "removeGalleryNew",
      index,
      message: "Remove this new image?",
      destructive: true,
    });
  };

  const buildFormData = () => {
    const fd = new FormData();
    const skip = new Set(["phone_models", "tags"]);
    Object.entries(form).forEach(([k, v]) => {
      if (skip.has(k)) return;
      if (typeof v === "boolean") fd.append(k, String(v));
      else if (Array.isArray(v)) return;
      else fd.append(k, v ?? "");
    });
    fd.append("phone_models", JSON.stringify(form.phone_models));
    fd.append("tags", JSON.stringify(form.tags));
    if (thumbnail) fd.append("thumbnail", thumbnail);
    gallery.forEach((f) => fd.append("gallery", f));
    if (removeImages.length) fd.append("remove_images", JSON.stringify(removeImages));
    return fd;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && !thumbnail) {
      toast.error("Thumbnail image is required");
      return;
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      if (editing) {
        await api.put(`/admin/template-products/${editing.id}`, fd);
      } else {
        await api.post("/admin/template-products", fd);
      }
      toast.success(editing ? "Phone case updated" : "Phone case created");
      closeForm();
      load(data.page);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === data.items.length) setSelected(new Set());
    else setSelected(new Set(data.items.map((i) => i.id)));
  };

  const bulk = async (action) => {
    if (!selected.size) return;
    if (action === "trash") {
      setConfirmAction({
        type: "bulk",
        bulkAction: "trash",
        message: `Move ${selected.size} phone case(s) to trash?`,
      });
      return;
    }
    if (action === "purge") {
      setConfirmAction({
        type: "bulk",
        bulkAction: "purge",
        message: `Permanently delete ${selected.size} phone case(s)? This cannot be undone.`,
        destructive: true,
      });
      return;
    }
    await api.post("/admin/template-products/bulk", {
      ids: [...selected],
      action,
    });
    toast.success("Bulk action completed");
    setSelected(new Set());
    load(data.page);
  };

  const requestToggleStatus = (item) => {
    const nextStatus = item.status === "published" ? "draft" : "published";
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "status",
      item,
      nextStatus,
      message:
        nextStatus === "draft"
          ? `Unpublish "${label}"? It will be hidden from the shop.`
          : `Publish "${label}"? It will appear on the shop.`,
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, item, nextStatus, url, index, bulkAction } = confirmAction;
    setConfirmAction(null);
    try {
      if (type === "status") {
        await api.patch(`/admin/template-products/${item.id}/status`, { status: nextStatus });
        toast.success(nextStatus === "published" ? "Phone case published" : "Phone case unpublished");
        load(data.page);
      } else if (type === "trash") {
        await api.patch(`/admin/template-products/${item.id}/trash`);
        toast.success("Moved to trash");
        load(data.page);
      } else if (type === "purge") {
        await api.delete(`/admin/template-products/${item.id}`);
        toast.success("Permanently deleted");
        load(data.page);
      } else if (type === "restore") {
        await api.patch(`/admin/template-products/${item.id}/restore`);
        toast.success("Phone case restored");
        load(data.page);
      } else if (type === "feature") {
        await api.patch(`/admin/template-products/${item.id}/feature`, {
          featured: !item.featured,
        });
        toast.success(item.featured ? "Removed from featured" : "Added to featured");
        load(data.page);
      } else if (type === "bulk") {
        await api.post("/admin/template-products/bulk", {
          ids: [...selected],
          action: bulkAction,
        });
        const labels = {
          trash: "Moved to trash",
          purge: "Permanently deleted",
          restore: "Phone cases restored",
        };
        toast.success(labels[bulkAction] || "Bulk action completed");
        setSelected(new Set());
        load(data.page);
      } else if (type === "removeThumbnail") {
        clearThumbnail();
      } else if (type === "removeGalleryExisting") {
        removeExistingImage(url);
      } else if (type === "removeGalleryNew") {
        removeNewGalleryFile(index);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action failed");
    }
  };

  const requestToggleFeature = (item) => {
    const label = displayTemplateTitle(item.title);
    if (!item.featured && item.status !== "published") {
      toast.error("Publish the phone case before featuring it on the homepage");
      return;
    }
    setConfirmAction({
      type: "feature",
      item,
      message: item.featured
        ? `Remove "${label}" from featured? It will disappear from the homepage slider.`
        : `Feature "${label}"? It will appear on the homepage slider.`,
    });
  };

  const requestMoveToTrash = (item) => {
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "trash",
      item,
      message: `Move "${label}" to trash? You can restore it later from the Trash tab.`,
    });
  };

  const requestPermanentDelete = (item) => {
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "purge",
      item,
      message: `Permanently delete "${label}"? This cannot be undone.`,
      destructive: true,
    });
  };

  const requestRestore = (item) => {
    const label = displayTemplateTitle(item.title);
    setConfirmAction({
      type: "restore",
      item,
      message: `Restore "${label}" to your product list?`,
    });
  };

  const duplicate = async (item) => {
    await api.post(`/admin/template-products/${item.id}/duplicate`);
    toast.success("Phone case duplicated");
    load(1);
  };

  return (
    <div data-testid="admin-template-products">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="label-eyebrow">Catalog</div>
          <h1 className="font-display text-3xl mt-2">Phone Cases</h1>
          <p className="text-sm text-white/50 mt-2">
            Manage pre-designed phone cases for the shop.
          </p>
        </div>
        <button
          data-testid="add-template-product"
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
          disabled={isTrashView}
        >
          <Plus className="w-4 h-4" /> Add Phone Case
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => { setViewMode("active"); setSelected(new Set()); }}
          className={`px-4 py-2 rounded-xl text-sm ${viewMode === "active" ? "bg-brand text-white" : "glass-2 text-white/60"}`}
        >
          Active phone cases
        </button>
        <button
          type="button"
          onClick={() => { setViewMode("trash"); setSelected(new Set()); setStatusFilter("all"); }}
          className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${viewMode === "trash" ? "bg-red-600 text-white" : "glass-2 text-white/60"}`}
          data-testid="trash-view-tab"
        >
          <Trash2 className="w-4 h-4" /> Trash
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone cases…"
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm"
          />
        </div>
        {!isTrashView && (
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm"
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm"
              data-testid="filter-product-type"
            >
              <option value="all">All phone case types</option>
              {TEMPLATE_PRODUCT_TYPES.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label}</option>
              ))}
            </select>
          </>
        )}
        {selected.size > 0 && (
          <div className="flex gap-2">
            {isTrashView ? (
              <>
                <button onClick={() => bulk("restore")} className="btn-secondary text-xs py-2">Restore</button>
                <button onClick={() => bulk("purge")} className="btn-secondary text-xs py-2 text-red-400">Delete permanently</button>
              </>
            ) : (
              <>
                <button onClick={() => bulk("publish")} className="btn-secondary text-xs py-2">Publish</button>
                <button onClick={() => bulk("unpublish")} className="btn-secondary text-xs py-2">Unpublish</button>
                <button onClick={() => bulk("feature")} className="btn-secondary text-xs py-2">Feature</button>
                <button onClick={() => bulk("trash")} className="btn-secondary text-xs py-2 text-red-400">Move to trash</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/50">
                <th className="p-4 w-10">
                  <input type="checkbox" checked={selected.size === data.items.length && data.items.length > 0} onChange={toggleAll} />
                </th>
                <th className="p-4">Image</th>
                <th className="p-4">Title</th>
                <th className="p-4">Case Type</th>
                <th className="p-4">Brand</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Featured</th>
                <th className="p-4">Status</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-white/40">Loading…</td></tr>
              ) : data.items.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-white/40">{isTrashView ? "Trash is empty" : "No phone cases yet"}</td></tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-4">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="p-4">
                      <img
                        src={resolveMediaUrl(item.thumbnail)}
                        alt=""
                        className="w-10 h-12 object-cover rounded-lg"
                      />
                    </td>
                    <td className="p-4 font-medium max-w-[180px] truncate" title={item.title}>
                      {displayTemplateTitle(item.title)}
                    </td>
                    <td className="p-4 text-white/60 text-xs max-w-[120px]">
                      {productTypeLabel(normalizeProductType(item.product_type))}
                    </td>
                    <td className="p-4 text-white/60">{item.phone_brand}</td>
                    <td className="p-4 text-white/60">{item.category}</td>
                    <td className="p-4">{formatPrice(item.sale_price || item.price)}</td>
                    <td className="p-4">{item.stock}</td>
                    <td className="p-4">
                      {isTrashView ? (
                        <span className="text-white/20">—</span>
                      ) : (
                        <button
                          onClick={() => requestToggleFeature(item)}
                          className={item.featured ? "text-brand" : "text-white/30"}
                          title={item.featured ? "Remove from featured" : "Add to featured"}
                        >
                          <Star className={`w-4 h-4 ${item.featured ? "fill-current" : ""}`} />
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      {isTrashView ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">trashed</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.status === "published"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-white/10 text-white/50"
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {isTrashView ? (
                          <>
                            <button onClick={() => requestRestore(item)} className="p-1.5 rounded hover:bg-white/10 text-emerald-400" title="Restore">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => requestPermanentDelete(item)} className="p-1.5 rounded hover:bg-white/10 text-red-400" title="Delete permanently">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => requestMoveToTrash(item)} className="p-1.5 rounded hover:bg-white/10 text-red-400" title="Move to trash">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => requestToggleFeature(item)} className={`p-1.5 rounded hover:bg-white/10 ${item.featured ? "text-brand" : "text-white/50"}`} title={item.featured ? "Remove from featured" : "Add to featured"}>
                              <Star className={`w-3.5 h-3.5 ${item.featured ? "fill-current" : ""}`} />
                            </button>
                            <button onClick={() => setPreviewItem(item)} className="p-1.5 rounded hover:bg-white/10" title="Preview">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-white/10" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => duplicate(item)} className="p-1.5 rounded hover:bg-white/10" title="Duplicate">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => requestToggleStatus(item)} className="p-1.5 rounded hover:bg-white/10" title={item.status === "published" ? "Unpublish" : "Publish"}>
                              {item.status === "published" ? <EyeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data.pages > 1 && (
          <div className="p-4 flex justify-center gap-2">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => load(p)}
                className={`w-8 h-8 rounded text-xs ${p === data.page ? "bg-brand text-white" : "glass-2"}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {previewItem && (
        <TemplateQuickView
          item={previewItem}
          adminPreview
          onClose={() => setPreviewItem(null)}
        />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-4" onClick={() => setConfirmAction(null)}>
          <div
            data-testid="template-status-confirm"
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-5"
          >
            <h2 className="font-display text-xl">Confirm</h2>
            <p className="text-white/70 text-sm break-words">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-3 rounded-lg border border-white/10 text-white/70 hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmAction}
                className={`flex-1 px-4 py-3 rounded-lg text-white ${
                  confirmAction.destructive
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-brand-gradient bg-brand-gradient-hover text-white"
                }`}
              >
                {confirmAction.destructive ? (confirmAction.type === "purge" || confirmAction.bulkAction === "purge" ? "Delete forever" : "Delete") : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/80" onClick={closeForm} />
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 glass rounded-2xl w-full max-w-2xl my-8 p-6 lg:p-8 space-y-6"
            data-testid="template-product-form"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{editing ? "Edit Phone Case" : "Add Phone Case"}</h2>
              <button type="button" onClick={closeForm} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>

            <fieldset className="space-y-4">
              <legend className="label-eyebrow mb-2">Basic Information</legend>
              <Field label="Product name" required>
                <input required placeholder="e.g. Midnight Matte Case" value={form.title} onChange={(e) => set("title", e.target.value)} className="form-field" />
              </Field>
              <Field label="Slug" hint="Leave empty to auto-generate from the product name.">
                <input placeholder="auto-generated if empty" value={form.slug} onChange={(e) => set("slug", e.target.value)} className="form-field" />
              </Field>
              <Field label="Description">
                <textarea placeholder="Full product description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className="form-field" />
              </Field>
              <Field label="Short description">
                <input placeholder="Shown on cards and listings" value={form.short_description} onChange={(e) => set("short_description", e.target.value)} className="form-field" />
              </Field>
              <Field
                label="Phone case type"
                required
                hint="Customized cases show in the first shop row; original blank cases show in the second row and home slider."
              >
                <select
                  value={form.product_type}
                  onChange={(e) => set("product_type", e.target.value)}
                  className="form-field"
                  data-testid="product-type-select"
                >
                  {TEMPLATE_PRODUCT_TYPES.map((t) => (
                    <option key={t.slug} value={t.slug}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select value={form.category} onChange={(e) => set("category", e.target.value)} className="form-field">
                    {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Collection">
                  <select value={form.collection} onChange={(e) => set("collection", e.target.value)} className="form-field">
                    {TEMPLATE_COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
              <LogoColorSelect
                label="Logo & case colors"
                value={partitionTags(form.tags).colors}
                onChange={(colors) => {
                  const { other } = partitionTags(form.tags);
                  set("tags", mergeColorAndOtherTags(colors, other));
                }}
                hint="Choose a color or paste its hex code, then select Add color."
                testId="phone-case-colors"
              />
              <TagSelect
                label="Tags"
                value={partitionTags(form.tags).other}
                onChange={(other) => {
                  const { colors } = partitionTags(form.tags);
                  set("tags", mergeColorAndOtherTags(colors, other));
                }}
                suggestions={NON_COLOR_TAG_SUGGESTIONS}
                placeholder="Type a tag and press Enter"
                hint="Pick a quick suggestion or type your own tag."
                testId="phone-case-tags"
              />
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="label-eyebrow mb-2">Compatibility</legend>
              <Field label="Phone brand">
                <select value={form.phone_brand} onChange={(e) => set("phone_brand", e.target.value)} className="form-field">
                  {TEMPLATE_PHONE_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <TagSelect
                label="Phone models"
                value={form.phone_models}
                onChange={(phone_models) => set("phone_models", phone_models)}
                placeholder="Type a model name and press Enter"
                hint="Add each phone model separately — they appear below as selected tags."
                testId="phone-case-models"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Case type" required>
                  <select
                    required
                    value={form.case_type}
                    onChange={(e) => set("case_type", e.target.value)}
                    className="form-field"
                    data-testid="case-type-select"
                  >
                    <option value="" disabled>
                      {caseTypes.length ? "Select case type" : "No case types yet"}
                    </option>
                    {caseTypes.map((c) => (
                      <option key={c.id || c.slug} value={c.slug}>{c.name}</option>
                    ))}
                    {form.case_type && !caseTypes.some((c) => c.slug === form.case_type) && (
                      <option value={form.case_type}>{form.case_type}</option>
                    )}
                  </select>
                </Field>
                <Field label="Material">
                  <input placeholder="e.g. TPU, PC, Leather" value={form.material} onChange={(e) => set("material", e.target.value)} className="form-field" />
                </Field>
              </div>
              {caseTypes.length === 0 && (
                <p className="text-[11px] text-amber-400/80">
                  Add case types under Catalog → Case Types / Categories first.
                </p>
              )}
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="label-eyebrow mb-2">Pricing & stock</legend>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Regular price" required>
                  <input required type="number" min="0" step="1" placeholder="399" value={form.price} onChange={(e) => set("price", e.target.value)} className="form-field" />
                </Field>
                <Field label="Sale price">
                  <input type="number" min="0" step="1" placeholder="Optional offer price" value={form.sale_price} onChange={(e) => set("sale_price", e.target.value)} className="form-field" />
                </Field>
                <Field label="Stock quantity" hint="Units available. Set 0 to mark as out of stock.">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={form.stock}
                    onChange={(e) => set("stock", e.target.value)}
                    className="form-field"
                    data-testid="stock-quantity"
                  />
                </Field>
                <Field label="SKU">
                  <input placeholder="Stock keeping unit" value={form.sku} onChange={(e) => set("sku", e.target.value)} className="form-field" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="label-eyebrow mb-2">Reviews</legend>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rating" hint="Shown on shop cards. 0 to 5.">
                  <input type="number" min="0" max="5" step="0.1" placeholder="4.5" value={form.rating} onChange={(e) => set("rating", e.target.value)} className="form-field" />
                </Field>
                <Field label="Review count">
                  <input type="number" min="0" step="1" placeholder="0" value={form.review_count} onChange={(e) => set("review_count", e.target.value)} className="form-field" />
                </Field>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="label-eyebrow mb-2">Media</legend>
              {preview && (
                <div className="relative inline-block">
                  <img src={preview} alt="" className="w-24 h-32 object-contain rounded-lg bg-[#0a0a0c]" />
                  <button
                    type="button"
                    onClick={requestRemoveThumbnail}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full grid place-items-center hover:bg-red-600"
                    aria-label="Remove thumbnail"
                    title="Remove thumbnail"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div>
                <label className="text-xs text-white/50 block mb-1">Thumbnail *</label>
                <p className="text-[11px] text-white/35 mb-2">
                  Recommended: {TEMPLATE_THUMB_SPEC.width} × {TEMPLATE_THUMB_SPEC.height} px ({TEMPLATE_THUMB_SPEC.ratio}) · {TEMPLATE_THUMB_SPEC.formats} · max {TEMPLATE_THUMB_SPEC.maxSize}
                </p>
                <p className="text-[11px] text-white/30 mb-2">{TEMPLATE_THUMB_SPEC.hint}</p>
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  onChange={onThumbnailChange}
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs file:cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 block mb-1">Gallery images</label>
                <p className="text-[11px] text-white/35 mb-2">Same size as thumbnail — {TEMPLATE_THUMB_SPEC.width} × {TEMPLATE_THUMB_SPEC.height} px ({TEMPLATE_THUMB_SPEC.ratio})</p>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onGalleryChange}
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white file:text-xs file:cursor-pointer"
                />
              </div>
              {(existingImages.length > 0 || galleryPreviews.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {existingImages.map((url) => (
                    <div key={url} className="relative">
                      <img src={resolveMediaUrl(url)} alt="" className="w-16 h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => requestRemoveExistingImage(url)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full grid place-items-center hover:bg-red-600"
                        aria-label="Remove image"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {galleryPreviews.map((src, i) => (
                    <div key={src} className="relative">
                      <img src={src} alt="" className="w-16 h-20 object-cover rounded ring-1 ring-brand/50" />
                      <button
                        type="button"
                        onClick={() => requestRemoveNewGalleryFile(i)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full grid place-items-center hover:bg-red-600"
                        aria-label="Remove new image"
                        title="Remove new image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="label-eyebrow mb-2">Visibility</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                {[
                  ["featured", "Featured"],
                  ["best_seller", "Best Seller"],
                  ["new_arrival", "New Arrival"],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
                    {label}
                  </label>
                ))}
                <Field label="Status">
                  <select value={form.status} onChange={(e) => set("status", e.target.value)} className="form-field w-auto">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </Field>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="label-eyebrow mb-2">SEO</legend>
              <Field label="Meta title">
                <input placeholder="Search title" value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} className="form-field" />
              </Field>
              <Field label="Meta description">
                <textarea placeholder="Search description" value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} rows={2} className="form-field" />
              </Field>
              <Field label="Keywords">
                <input placeholder="Comma-separated keywords" value={form.keywords} onChange={(e) => set("keywords", e.target.value)} className="form-field" />
              </Field>
            </fieldset>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeForm} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? "Saving…" : <><Check className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="text-xs text-white/50 block mb-1">
        {label}{required ? " *" : ""}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-white/35 mt-1">{hint}</p> : null}
    </div>
  );
}
