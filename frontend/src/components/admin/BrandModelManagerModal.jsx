import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Pencil, Trash2, Search, Smartphone, Layers, Check, Upload, AlertCircle } from "lucide-react";
import { api, resolveMediaUrl } from "../../lib/api";
import { toast } from "sonner";

export default function BrandModelManagerModal({
  isOpen,
  onClose,
  initialBrandName,
  onCatalogUpdated,
}) {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [models, setModels] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  // Brand form state
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandNameInput, setBrandNameInput] = useState("");
  const [brandLogoFile, setBrandLogoFile] = useState(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState(null);
  const brandLogoRef = useRef(null);

  // Model form state
  const [showModelForm, setShowModelForm] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [modelNameInput, setModelNameInput] = useState("");
  const [modelImageFile, setModelImageFile] = useState(null);
  const [modelImagePreview, setModelImagePreview] = useState(null);
  const modelImageRef = useRef(null);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'brand'|'model', item }
  const [saving, setSaving] = useState(false);

  // Load brands
  const loadBrands = useCallback(async (preferredBrandName) => {
    setLoadingBrands(true);
    try {
      const res = await api.get("/brands");
      const list = Array.isArray(res.data) ? res.data : [];
      setBrands(list);

      // Select initial or preferred brand
      const nameToMatch = preferredBrandName || initialBrandName;
      let matched = null;
      if (nameToMatch) {
        matched = list.find(
          (b) => b.name?.toLowerCase() === String(nameToMatch).trim().toLowerCase()
        );
      }
      setSelectedBrand(matched || list[0] || null);
    } catch {
      toast.error("Could not load brands");
    } finally {
      setLoadingBrands(false);
    }
  }, [initialBrandName]);

  // Load models for selected brand
  const loadModels = useCallback(async (brandId) => {
    if (!brandId) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    try {
      const res = await api.get("/models", { params: { brand_id: brandId } });
      setModels(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Could not load models");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadBrands(initialBrandName);
    }
  }, [isOpen, initialBrandName, loadBrands]);

  useEffect(() => {
    if (selectedBrand?.id) {
      loadModels(selectedBrand.id);
    } else {
      setModels([]);
    }
  }, [selectedBrand, loadModels]);

  // Logo file preview
  useEffect(() => {
    if (!brandLogoFile) {
      if (!editingBrand) setBrandLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(brandLogoFile);
    setBrandLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [brandLogoFile, editingBrand]);

  // Model file preview
  useEffect(() => {
    if (!modelImageFile) {
      if (!editingModel) setModelImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(modelImageFile);
    setModelImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [modelImageFile, editingModel]);

  if (!isOpen) return null;

  // Filtered lists
  const filteredBrands = brands.filter((b) =>
    (b.name || "").toLowerCase().includes(brandSearch.trim().toLowerCase())
  );

  const filteredModels = models.filter((m) =>
    (m.name || "").toLowerCase().includes(modelSearch.trim().toLowerCase())
  );

  // --- Brand Actions ---
  const openAddBrand = () => {
    setEditingBrand(null);
    setBrandNameInput("");
    setBrandLogoFile(null);
    setBrandLogoPreview(null);
    setShowBrandForm(true);
  };

  const openEditBrand = (brand, e) => {
    e.stopPropagation();
    setEditingBrand(brand);
    setBrandNameInput(brand.name || "");
    setBrandLogoFile(null);
    setBrandLogoPreview(brand.logo_url ? resolveMediaUrl(brand.logo_url) : null);
    setShowBrandForm(true);
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    const name = brandNameInput.trim();
    if (!name) {
      toast.error("Brand name is required");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      if (brandLogoFile) fd.append("file", brandLogoFile);

      if (editingBrand) {
        await api.patch(`/brands/${editingBrand.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(`Brand "${name}" updated`);
      } else {
        const res = await api.post("/brands", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(`Brand "${name}" created`);
      }
      setShowBrandForm(false);
      setBrandNameInput("");
      setBrandLogoFile(null);
      await loadBrands(name);
      if (onCatalogUpdated) onCatalogUpdated();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  // --- Model Actions ---
  const openAddModel = () => {
    if (!selectedBrand) {
      toast.error("Please select a brand first");
      return;
    }
    setEditingModel(null);
    setModelNameInput("");
    setModelImageFile(null);
    setModelImagePreview(null);
    setShowModelForm(true);
  };

  const openEditModel = (model, e) => {
    e.stopPropagation();
    setEditingModel(model);
    setModelNameInput(model.name || "");
    setModelImageFile(null);
    setModelImagePreview(model.image_url ? resolveMediaUrl(model.image_url) : null);
    setShowModelForm(true);
  };

  const handleSaveModel = async (e) => {
    e.preventDefault();
    const name = modelNameInput.trim();
    if (!name) {
      toast.error("Model name is required");
      return;
    }
    if (!selectedBrand?.id) {
      toast.error("Please select a brand");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      if (modelImageFile) fd.append("file", modelImageFile);

      if (editingModel) {
        await api.patch(`/models/${editingModel.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(`Model "${name}" updated`);
      } else {
        fd.append("brand_id", selectedBrand.id);
        await api.post("/models", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(`Model "${name}" created for ${selectedBrand.name}`);
      }
      setShowModelForm(false);
      setModelNameInput("");
      setModelImageFile(null);
      await loadModels(selectedBrand.id);
      if (onCatalogUpdated) onCatalogUpdated(selectedBrand.id, selectedBrand.name);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  // --- Deletion Actions ---
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { type, item } = confirmDelete;
    setSaving(true);
    try {
      if (type === "brand") {
        await api.delete(`/brands/${item.id}`);
        toast.success(`Brand "${item.name}" deleted`);
        setConfirmDelete(null);
        await loadBrands();
        if (onCatalogUpdated) onCatalogUpdated();
      } else if (type === "model") {
        await api.delete(`/models/${item.id}`);
        toast.success(`Model "${item.name}" deleted`);
        setConfirmDelete(null);
        if (selectedBrand?.id) {
          await loadModels(selectedBrand.id);
          if (onCatalogUpdated) onCatalogUpdated(selectedBrand.id, selectedBrand.name);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || `Could not delete ${type}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 glass rounded-2xl w-full max-w-4xl p-5 sm:p-6 space-y-5 my-6 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="brand-model-manager-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" />
              Manage Brands & Models
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Add, edit, or remove phone brands and their supported models in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split view */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Brands (5 cols) */}
          <div className="md:col-span-5 flex flex-col min-h-0 space-y-3 border-b md:border-b-0 md:border-r border-white/10 pb-5 md:pb-0 md:pr-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">Brands</h3>
              <button
                type="button"
                onClick={openAddBrand}
                className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1 text-brand border-brand/20 hover:border-brand/40 hover:bg-brand/10"
                data-testid="btn-add-brand"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Brand
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="form-field !pl-8 !py-1 text-xs w-full"
              />
            </div>

            {/* Brands List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[140px] max-h-[300px] md:max-h-none">
              {loadingBrands ? (
                <div className="text-center py-8 text-xs text-white/40">Loading brands…</div>
              ) : filteredBrands.length === 0 ? (
                <div className="text-center py-8 text-xs text-white/40">No brands found</div>
              ) : (
                filteredBrands.map((b) => {
                  const isSelected = selectedBrand?.id === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBrand(b)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? "bg-brand/15 border-brand ring-1 ring-brand text-white"
                          : "bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/[0.06] text-white/80"
                      }`}
                      data-testid={`brand-item-${b.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {b.logo_url ? (
                          <img
                            src={resolveMediaUrl(b.logo_url)}
                            alt=""
                            className="w-5 h-5 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-white/60">
                            {b.name?.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium truncate">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => openEditBrand(b, e)}
                          className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
                          title="Edit Brand"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({
                              type: "brand",
                              item: b,
                              message: `Delete brand "${b.name}" and all its models?`,
                            });
                          }}
                          className="p-1 rounded text-white/50 hover:text-red-400 hover:bg-red-500/10"
                          title="Delete Brand"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Models for selected Brand (7 cols) */}
          <div className="md:col-span-7 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70 truncate">
                {selectedBrand ? `${selectedBrand.name} Models (${models.length})` : "Select a Brand"}
              </h3>
              <button
                type="button"
                onClick={openAddModel}
                disabled={!selectedBrand}
                className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1 text-brand border-brand/20 hover:border-brand/40 hover:bg-brand/10 disabled:opacity-40"
                data-testid="btn-add-model"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Model
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                type="text"
                placeholder={selectedBrand ? `Search ${selectedBrand.name} models...` : "Search models..."}
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                disabled={!selectedBrand}
                className="form-field !pl-8 !py-1 text-xs w-full disabled:opacity-50"
              />
            </div>

            {/* Models List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[160px] max-h-[300px] md:max-h-none">
              {!selectedBrand ? (
                <div className="text-center py-10 text-xs text-white/40">Select a brand to view its models</div>
              ) : loadingModels ? (
                <div className="text-center py-10 text-xs text-white/40">Loading models…</div>
              ) : filteredModels.length === 0 ? (
                <div className="text-center py-10 text-xs text-white/40">
                  {modelSearch ? "No models match your search" : `No models for ${selectedBrand.name} yet.`}
                </div>
              ) : (
                filteredModels.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-center justify-between px-3 py-2 rounded-xl border bg-white/[0.03] border-white/5 hover:border-white/15 hover:bg-white/[0.06] transition-all"
                    data-testid={`model-item-${m.id}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {m.image_url ? (
                        <img
                          src={resolveMediaUrl(m.image_url)}
                          alt=""
                          className="w-5 h-6 rounded object-cover shrink-0"
                        />
                      ) : (
                        <Smartphone className="w-4 h-4 text-white/40 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-white/90 truncate">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => openEditModel(m, e)}
                        className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
                        title="Edit Model"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete({
                            type: "model",
                            item: m,
                            message: `Delete model "${m.name}"?`,
                          });
                        }}
                        className="p-1 rounded text-white/50 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete Model"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Brand Create/Edit Sub-Modal */}
        {showBrandForm && (
          <div className="absolute inset-0 z-20 bg-black/85 rounded-2xl p-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-sm glass rounded-xl p-5 border border-white/15 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">
                  {editingBrand ? `Edit Brand: ${editingBrand.name}` : "Add New Brand"}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowBrandForm(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveBrand} className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 block mb-1">Brand Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apple, Google, Nothing"
                    value={brandNameInput}
                    onChange={(e) => setBrandNameInput(e.target.value)}
                    className="form-field text-xs w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 block mb-1">Logo Image (Optional)</label>
                  <div className="flex items-center gap-3">
                    {brandLogoPreview ? (
                      <img
                        src={brandLogoPreview}
                        alt="Logo preview"
                        className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1 border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-white/30 text-xs">
                        Logo
                      </div>
                    )}
                    <input
                      ref={brandLogoRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBrandLogoFile(e.target.files?.[0] || null)}
                      className="text-xs text-white/60 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBrandForm(false)}
                    className="btn-secondary !text-xs !py-1.5 !px-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary !text-xs !py-1.5 !px-4"
                  >
                    {saving ? "Saving…" : editingBrand ? "Update Brand" : "Create Brand"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Model Create/Edit Sub-Modal */}
        {showModelForm && (
          <div className="absolute inset-0 z-20 bg-black/85 rounded-2xl p-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-sm glass rounded-xl p-5 border border-white/15 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">
                  {editingModel
                    ? `Edit Model: ${editingModel.name}`
                    : `Add Model for ${selectedBrand?.name || "Brand"}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowModelForm(false)}
                  className="text-white/40 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModel} className="space-y-3">
                <div>
                  <label className="text-xs text-white/60 block mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iPhone 16 Pro Max, Galaxy S25"
                    value={modelNameInput}
                    onChange={(e) => setModelNameInput(e.target.value)}
                    className="form-field text-xs w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 block mb-1">Model Mockup/Image (Optional)</label>
                  <div className="flex items-center gap-3">
                    {modelImagePreview ? (
                      <img
                        src={modelImagePreview}
                        alt="Model preview"
                        className="w-10 h-12 rounded object-cover bg-white/5 border border-white/10"
                      />
                    ) : (
                      <div className="w-10 h-12 rounded bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-white/30 text-xs">
                        Mockup
                      </div>
                    )}
                    <input
                      ref={modelImageRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setModelImageFile(e.target.files?.[0] || null)}
                      className="text-xs text-white/60 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:bg-white/10 file:text-white hover:file:bg-white/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModelForm(false)}
                    className="btn-secondary !text-xs !py-1.5 !px-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary !text-xs !py-1.5 !px-4"
                  >
                    {saving ? "Saving…" : editingModel ? "Update Model" : "Create Model"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="absolute inset-0 z-30 bg-black/90 rounded-2xl p-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-sm glass rounded-xl p-5 border border-red-500/20 space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-xs text-white/80 font-medium">{confirmDelete.message}</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="btn-secondary !text-xs !py-1.5 !px-3"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                  {saving ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 shrink-0">
          <div className="text-[11px] text-white/40">
            Changes will immediately update the models list on your product form.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary !text-xs !py-1.5 !px-4"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
