import { useEffect, useRef, useState, useCallback } from "react";
import { api, resolveMediaUrl } from "../../lib/api";
import CatalogImage, { DEFAULT_MODEL_MOCKUP } from "../../components/CatalogImage";
import { Plus, Trash2, X, Pencil, Upload, ImageIcon } from "lucide-react";

const BRAND_LOGO_SIZE = "128 × 128 px";
const MODEL_IMAGE_SIZE = "400 × 400 px";
const PRODUCT_IMAGE_SIZE = "400 × 400 px";

const EMPTY_BRAND = { name: "" };
const EMPTY_MODEL = { name: "", case_types: [] };
const EMPTY_PRODUCT = { name: "", description: "", is_active: true };

export default function AdminCatalog() {
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileRef = useRef(null);

  const loadAll = useCallback(async () => {
    const [b, p] = await Promise.all([api.get("/brands"), api.get("/admin/products")]);
    setBrands(b.data);
    setProducts(p.data);
    setSelectedBrand((prev) => {
      if (!prev) return prev;
      const match = b.data.find((x) => x.id === prev.id);
      if (!match) return null;
      if (
        match.name !== prev.name
        || match.logo_url !== prev.logo_url
      ) return match;
      return prev;
    });
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    if (selectedBrand) api.get(`/models?brand_id=${selectedBrand.id}`).then((r) => setModels(r.data));
    else setModels([]);
  }, [selectedBrand]);

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

  const openModal = async (type, item = null) => {
    setErr("");
    setEditing(item);
    setModal(type);
    resetFile();
    if (type === "brand") {
      setForm(item ? { name: item.name } : EMPTY_BRAND);
      setPreview(item?.logo_url ? resolveMediaUrl(item.logo_url) : null);
    } else if (type === "model") {
      let caseTypes = [];
      if (item) {
        try {
          const response = await api.get(`/admin/models/${item.id}/case-types`);
          caseTypes = response.data;
        } catch (e) {
          setErr(e.response?.data?.detail || "Could not load model pricing");
        }
      }
      setForm(item ? { name: item.name, case_types: caseTypes } : EMPTY_MODEL);
      setPreview(item?.image_url ? resolveMediaUrl(item.image_url) : DEFAULT_MODEL_MOCKUP);
    } else if (type === "product") {
      setForm(item
        ? {
            name: item.name,
            description: item.description || "",
            is_active: item.is_active !== false,
          }
        : EMPTY_PRODUCT);
      setPreview(item?.image_url ? resolveMediaUrl(item.image_url) : null);
    }
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setForm({});
    setErr("");
    resetFile();
    setPreview(null);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleModelCaseType = (caseTypeId) => {
    setForm((current) => {
      const configured = current.case_types || [];
      const exists = configured.some((item) => item.case_type_id === caseTypeId);
      return {
        ...current,
        case_types: exists
          ? configured.filter((item) => item.case_type_id !== caseTypeId)
          : [...configured, { case_type_id: caseTypeId, price: "", status: true }],
      };
    });
  };

  const setModelCaseTypePrice = (caseTypeId, price) => {
    setForm((current) => ({
      ...current,
      case_types: (current.case_types || []).map((item) => (
        item.case_type_id === caseTypeId ? { ...item, price } : item
      )),
    }));
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      if (modal === "brand") {
        const name = form.name?.trim();
        if (!name) { setErr("Brand name is required"); return; }
        if (editing) {
          const fd = new FormData();
          fd.append("name", name);
          if (file) fd.append("file", file);
          await api.patch(`/brands/${editing.id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          const fd = new FormData();
          fd.append("name", name);
          if (file) fd.append("file", file);
          await api.post("/brands", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        await loadAll();
      } else if (modal === "model") {
        const name = form.name?.trim();
        if (!name) { setErr("Model name is required"); return; }
        const caseTypes = form.case_types || [];
        if (caseTypes.some((item) => item.price === "" || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
          setErr("Enter a valid price for every selected case type");
          return;
        }
        if (editing) {
          const fd = new FormData();
          fd.append("name", name);
          fd.append("case_types", JSON.stringify(caseTypes));
          if (file) fd.append("file", file);
          await api.patch(`/models/${editing.id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          const fd = new FormData();
          fd.append("name", name);
          fd.append("brand_id", selectedBrand.id);
          fd.append("case_types", JSON.stringify(caseTypes));
          if (file) fd.append("file", file);
          await api.post("/models", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        const r = await api.get(`/models?brand_id=${selectedBrand.id}`);
        setModels(r.data);
      } else if (modal === "product") {
        const name = form.name?.trim();
        if (!name) { setErr("Case type name is required"); return; }
        const description = form.description?.trim() || "";
        const fd = new FormData();
        fd.append("name", name);
        fd.append("description", description);
        fd.append("is_active", String(form.is_active !== false));
        if (file) fd.append("file", file);
        if (editing) {
          await api.patch(`/products/${editing.id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          await api.post("/products", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        await loadAll();
      }
      closeModal();
    } catch (e) {
      setErr(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (type, id, message) => setConfirmDelete({ type, id, message });

  const toggleProductActive = async (product) => {
    setErr("");
    try {
      const fd = new FormData();
      fd.append("is_active", String(product.is_active === false));
      await api.patch(`/products/${product.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadAll();
    } catch (e) {
      setErr(e.response?.data?.detail || "Status update failed");
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      if (type === "brand") {
        await api.delete(`/brands/${id}`);
        setSelectedBrand(null);
        await loadAll();
      } else if (type === "model") {
        await api.delete(`/models/${id}`);
        const r = await api.get(`/models?brand_id=${selectedBrand.id}`);
        setModels(r.data);
      } else if (type === "product") {
        await api.delete(`/products/${id}`);
        await loadAll();
      }
    } catch (e) {
      setErr(e.response?.data?.detail || "Delete failed");
    }
  };

  const modalTitle = {
    brand: editing ? "Edit brand" : "Add brand",
    model: editing
      ? `Edit model${selectedBrand ? ` — ${selectedBrand.name}` : ""}`
      : `Add model${selectedBrand ? ` — ${selectedBrand.name}` : ""}`,
    product: editing ? "Edit case type" : "Add case type",
  };

  const imageHint = modal === "brand"
    ? { size: BRAND_LOGO_SIZE, max: "2 MB", label: "Brand logo (optional)" }
    : modal === "model"
      ? { size: MODEL_IMAGE_SIZE, max: "4 MB", label: "Model image (optional)" }
      : modal === "product"
        ? { size: PRODUCT_IMAGE_SIZE, max: "4 MB", label: "Case type image (optional)" }
        : null;

  return (
    <div data-testid="admin-catalog">
      <div className="label-eyebrow">Catalog</div>
      <div className="flex items-start justify-between gap-4 flex-wrap mt-2 mb-6">
        <h1 className="font-display text-3xl">Brands, Models & Products</h1>
      </div>

      {err && !modal && <div className="text-red-400 text-sm mb-4">{err}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-xl p-5">
          <Header title="Brands" onAdd={() => openModal("brand")} testid="add-brand" />
          <div className="space-y-2 mt-4">
            {brands.map((b) => (
              <div key={b.id} onClick={() => setSelectedBrand(b)}
                data-testid={`brand-row-${b.id}`}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer gap-2 ${selectedBrand?.id === b.id ? "bg-brand/10 border border-brand/30":"hover:bg-white/[0.04]"}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <CatalogImage type="brand" url={b.logo_url} name={b.name} className="h-8 w-8 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{b.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openModal("brand", b); }} className="text-white/40 hover:text-white p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); requestDelete("brand", b.id, "Delete this brand and all its models?"); }} className="text-white/40 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <Header title={selectedBrand ? `${selectedBrand.name} Models` : "Models"} onAdd={() => openModal("model")} testid="add-model" disabled={!selectedBrand} />
          <div className="space-y-2 mt-4">
            {!selectedBrand && <div className="text-white/40 text-sm">Pick a brand to view models.</div>}
            {models.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04] gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CatalogImage type="model" url={m.image_url} name={m.name} className="h-8 w-8 shrink-0 rounded-md" />
                  <span className="text-sm truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openModal("model", m)} className="text-white/40 hover:text-white p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => requestDelete("model", m.id, "Delete this model?")} className="text-white/40 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <Header title="Case Types" onAdd={() => openModal("product")} testid="add-product" />
          <div className="space-y-2 mt-4">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/[0.04] gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CatalogImage type="product" url={p.image_url} name={p.name} slug={p.slug} className="h-8 w-8 shrink-0 rounded-md" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{p.name}</div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span className={p.is_active === false ? "text-amber-400" : "text-emerald-400"}>
                        {p.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.is_active !== false}
                    title={p.is_active === false ? "Activate case type" : "Deactivate case type"}
                    onClick={() => toggleProductActive(p)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${p.is_active === false ? "bg-white/15" : "bg-emerald-500/70"}`}
                  >
                    <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${p.is_active === false ? "left-0.5" : "left-[18px]"}`} />
                  </button>
                  <button onClick={() => openModal("product", p)} className="text-white/40 hover:text-white p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => requestDelete("product", p.id, "Delete this case type?")} className="text-white/40 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={closeModal}>
          <form
            data-testid={`catalog-form-${modal}`}
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className={`glass rounded-2xl p-6 w-full ${modal === "model" ? "max-w-lg" : "max-w-md"} space-y-4 max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{modalTitle[modal]}</h2>
              <button type="button" onClick={closeModal} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modal === "brand" && (
              <Field label="Brand name" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Apple" required autoFocus />
            )}

            {modal === "model" && (
              <>
                <Field label="Model name" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. iPhone 15 Pro" required autoFocus />
                <div>
                  <label className="label-eyebrow block mb-2">Supported case types and prices</label>
                  <div className="rounded-xl border border-white/10 divide-y divide-white/[0.06] max-h-72 overflow-y-auto">
                    {products.map((product) => {
                      const configuration = (form.case_types || []).find(
                        (item) => item.case_type_id === product.id
                      );
                      const checked = Boolean(configuration);
                      const inactive = product.is_active === false;
                      return (
                        <div key={product.id} className={`px-3 py-3 ${inactive ? "opacity-50" : ""}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={inactive && !checked}
                              onChange={() => toggleModelCaseType(product.id)}
                              className="accent-brand"
                            />
                            <CatalogImage type="product" url={product.image_url} name={product.name} slug={product.slug} className="h-8 w-8 rounded-md" />
                            <span className="text-sm flex-1">{product.name}</span>
                            {inactive && <span className="text-xs text-amber-400">Inactive</span>}
                          </div>
                          {checked && (
                            <div className="mt-2 ml-11">
                              <label className="text-xs text-white/50 block mb-1">Price (₹)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={configuration.price}
                                onChange={(event) => setModelCaseTypePrice(product.id, event.target.value)}
                                placeholder="499"
                                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {products.length === 0 && (
                      <div className="px-3 py-4 text-sm text-white/40">Add a case type first.</div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-white/45">Only selected case types are available for this model.</p>
                </div>
              </>
            )}

            {(modal === "brand" || modal === "model") && imageHint && (
              <ImageUploadField
                label={imageHint.label}
                sizeHint={imageHint.size}
                maxHint={imageHint.max}
                preview={preview}
                fileRef={fileRef}
                onFileChange={onFileChange}
                inputId={`catalog-image-${modal}`}
              />
            )}

            {modal === "product" && (
              <>
                <Field label="Case type name" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Clear Case" required autoFocus />
                <div>
                  <label className="label-eyebrow block mb-2">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  />
                </div>
                <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">Active</div>
                    <div className="text-xs text-white/45">Can be assigned to phone models.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_active !== false}
                    onChange={(e) => set("is_active", e.target.checked)}
                    className="h-4 w-4 accent-brand"
                  />
                </label>
                {imageHint && (
                  <ImageUploadField
                    label={imageHint.label}
                    sizeHint={imageHint.size}
                    maxHint={imageHint.max}
                    preview={preview}
                    fileRef={fileRef}
                    onFileChange={onFileChange}
                    inputId="catalog-image-product"
                  />
                )}
              </>
            )}

            {err && <div className="text-red-400 text-sm">{err}</div>}

            <div className="flex gap-3 pt-1">
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
            data-testid="catalog-delete-confirm"
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-sm space-y-5"
          >
            <h2 className="font-display text-xl">Confirm delete</h2>
            <p className="text-white/70 text-sm">{confirmDelete.message}</p>
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

function Header({ title, onAdd, testid, disabled }) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-display text-lg">{title}</div>
      <button data-testid={testid} disabled={disabled} onClick={onAdd}
        className={`p-1.5 rounded-md ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-white/[0.06]"}`}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function ImageUploadField({ label, sizeHint, maxHint, preview, fileRef, onFileChange, inputId }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      <div className="rounded-xl border border-dashed border-white/20 p-4 text-center">
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto max-h-32 w-auto rounded-lg object-contain" />
        ) : (
          <div className="py-6 text-white/40">
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
        Recommended size: <strong className="text-white/70">{sizeHint}</strong> (square).
        Formats: JPG, PNG, or WEBP. Max {maxHint}.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, min, max, step, autoFocus }) {
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
        step={step}
        autoFocus={autoFocus}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}
