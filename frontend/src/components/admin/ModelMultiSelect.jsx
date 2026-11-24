import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Check, Smartphone, Plus, ChevronDown, ChevronUp, Loader2, Settings } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import {
  normalizeModelKey,
  remapModelsToCatalog,
  resolveCatalogModelName,
  findInvalidSelectedModels,
} from "../../constants/templateProducts";

/**
 * Searchable multi-select dropdown for phone models belonging to a selected brand.
 * Includes a dropdown combobox, removable chips, and an inline "Add Model" quick action.
 */
export default function ModelMultiSelect({
  brandName = "selected brand",
  brandId = "",
  models = [],
  value = [],
  onChange,
  onModelAdded,
  onManageClick,
  loading = false,
  testId = "phone-case-models",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [addingModel, setAddingModel] = useState(false);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on click outside or Esc
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowAddForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedSet = useMemo(() => {
    return new Set((value || []).map((m) => normalizeModelKey(m)));
  }, [value]);

  // Only catalog models for this brand are selectable ("active" list shown in the UI).
  const catalogModels = useMemo(
    () => (models || []).filter((m) => String(m?.name || "").trim()),
    [models]
  );

  const invalidSelected = useMemo(
    () => (loading ? [] : findInvalidSelectedModels(value || [], catalogModels)),
    [value, catalogModels, loading]
  );
  const invalidSet = useMemo(
    () => new Set(invalidSelected.map((m) => normalizeModelKey(m))),
    [invalidSelected]
  );
  const validSelectedCount = Math.max(0, (value || []).length - invalidSelected.length);

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogModels;
    return catalogModels.filter((m) => m.name.toLowerCase().includes(q));
  }, [catalogModels, query]);

  const toggleModel = (modelName) => {
    const canonical = resolveCatalogModelName(modelName, catalogModels) || String(modelName).trim();
    const key = normalizeModelKey(canonical);
    if (!key) return;
    if (selectedSet.has(key)) {
      onChange((value || []).filter((m) => normalizeModelKey(m) !== key));
    } else {
      onChange(remapModelsToCatalog([...(value || []), canonical], catalogModels));
    }
  };

  const selectAllFiltered = () => {
    // No search: replace selection with exactly the current catalog models (matches Active count).
    if (!query.trim()) {
      onChange(catalogModels.map((m) => m.name.trim()));
      return;
    }
    // With search: keep other still-valid catalog selections, add filtered matches.
    const kept = remapModelsToCatalog(value || [], catalogModels);
    const next = new Map(kept.map((n) => [normalizeModelKey(n), n]));
    for (const m of filteredModels) {
      next.set(normalizeModelKey(m.name), m.name.trim());
    }
    onChange([...next.values()]);
  };

  const deselectAll = () => {
    if (!query.trim()) {
      onChange([]);
      return;
    }
    const filteredKeys = new Set(filteredModels.map((m) => normalizeModelKey(m.name)));
    onChange(
      remapModelsToCatalog(value || [], catalogModels).filter(
        (m) => !filteredKeys.has(normalizeModelKey(m))
      )
    );
  };

  const handleAddNewModel = async (e) => {
    if (e) e.preventDefault();
    const trimmed = String(newModelName || "").trim();
    if (!trimmed) {
      toast.error("Please enter a model name");
      return;
    }
    if (!brandId) {
      toast.error(`Could not find brand details for ${brandName}`);
      return;
    }

    // Duplicate check in existing catalog models for this brand
    const isDuplicate = catalogModels.some(
      (m) => normalizeModelKey(m.name) === normalizeModelKey(trimmed)
    );
    if (isDuplicate) {
      toast.error(`"${trimmed}" already exists for ${brandName}`);
      return;
    }

    setAddingModel(true);
    try {
      const res = await api.post("/models", {
        brand_id: brandId,
        name: trimmed,
      });
      const created = res.data;
      toast.success(`Added "${created.name}" to ${brandName}`);
      setNewModelName("");
      setShowAddForm(false);

      if (onModelAdded) {
        onModelAdded(created);
      }

      // Automatically select the new model using canonical catalog name
      const nextCatalog = [...catalogModels, created];
      onChange(remapModelsToCatalog([...(value || []), created.name], nextCatalog));
    } catch (err) {
      toast.error(err.response?.data?.detail || `Could not add model "${trimmed}"`);
    } finally {
      setAddingModel(false);
    }
  };

  return (
    <div className="space-y-2.5 relative" data-testid={testId} ref={containerRef}>
      {/* Header with Title and Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs text-white/70 block font-medium">
          Compatible {brandName} models
        </label>
        <div className="flex items-center gap-2">
          {brandId && (
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="text-xs text-brand hover:text-brand-light flex items-center gap-1 font-medium px-2 py-1 rounded-lg border border-brand/30 hover:border-brand/60 bg-brand/10 hover:bg-brand/20 transition-colors"
              data-testid="btn-add-model"
              title={`Add a new model to ${brandName}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add model</span>
            </button>
          )}
          {onManageClick && (
            <button
              type="button"
              onClick={onManageClick}
              className="text-xs text-white/50 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:border-white/25 bg-white/[0.03] transition-colors"
              data-testid="btn-manage-models"
              title="Open full Brands & Models manager"
            >
              <Settings className="w-3 h-3" />
              <span className="hidden sm:inline">Manage catalog</span>
            </button>
          )}
          <span className="text-[11px] font-mono text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full whitespace-nowrap">
            {validSelectedCount} of {catalogModels.length} selected
            {invalidSelected.length > 0 ? ` · ${invalidSelected.length} invalid` : ""}
          </span>
        </div>
      </div>

      {/* Inline "Add Model" Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddNewModel}
          className="p-3 rounded-xl border border-brand/30 bg-brand/5 space-y-2"
        >
          <div className="flex items-center justify-between text-xs font-medium text-brand">
            <span>Add new model to {brandName}</span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewModelName("");
              }}
              className="text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder={`e.g. ${brandName} 16 Pro Max`}
              className="form-field !py-1.5 text-xs flex-1"
              data-testid="new-model-name-input"
              autoFocus
            />
            <button
              type="submit"
              disabled={addingModel || !newModelName.trim()}
              className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 shrink-0 disabled:opacity-50"
              data-testid="btn-save-new-model"
            >
              {addingModel ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Save & Select
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Dropdown Combobox Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full form-field flex items-center justify-between gap-2 text-left cursor-pointer transition-all ${
            isOpen ? "border-brand ring-1 ring-brand bg-white/[0.06]" : ""
          }`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Smartphone className="w-4 h-4 text-white/40 shrink-0" />
            {loading ? (
              <span className="text-white/40 text-xs">Loading {brandName} models…</span>
            ) : value.length === 0 ? (
              <span className="text-white/40 text-xs truncate">
                Click to select compatible {brandName} models…
              </span>
            ) : (
              <span className="text-white text-xs font-medium truncate">
                {value.length} {value.length === 1 ? "model" : "models"} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded">
              {validSelectedCount}/{catalogModels.length}
            </span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-white/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-xl border border-white/15 bg-[#12141a] shadow-2xl p-3 space-y-2.5 backdrop-blur-md"
            role="listbox"
          >
            {/* Search Input and Quick Actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${brandName} models...`}
                  className="form-field !pl-8 !py-1.5 text-xs w-full"
                  data-testid="model-search-input"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={selectAllFiltered}
                disabled={!filteredModels.length}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-brand/40 hover:text-brand transition-colors text-white/70 whitespace-nowrap disabled:opacity-40"
                data-testid="select-all-models"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={deselectAll}
                disabled={!value.length}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-red-400/40 hover:text-red-300 transition-colors text-white/50 whitespace-nowrap disabled:opacity-40"
                data-testid="deselect-all-models"
              >
                Clear
              </button>
            </div>

            {/* Model List Options */}
            {loading ? (
              <div className="py-8 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
                Loading {brandName} models…
              </div>
            ) : catalogModels.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-amber-300/80 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p>No models found for {brandName} in catalog.</p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-xs text-brand font-medium hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add the first model now
                </button>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredModels.length === 0 ? (
                  <div className="py-6 text-center text-xs text-white/40">
                    No models match &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredModels.map((m) => {
                      const isChecked = selectedSet.has(normalizeModelKey(m.name));
                      return (
                        <button
                          key={m.id || m.name}
                          type="button"
                          role="option"
                          aria-selected={isChecked}
                          onClick={() => toggleModel(m.name)}
                          data-testid={`model-option-${m.name}`}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg text-left text-xs transition-colors border ${
                            isChecked
                              ? "bg-brand/15 border-brand/50 text-white font-medium"
                              : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.06] text-white/70 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{m.name}</span>
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                              isChecked
                                ? "bg-brand border-brand text-black"
                                : "border-white/20 bg-white/5"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Dropdown Footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
              <span>{filteredModels.length} models shown</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-white/60 hover:text-white font-medium px-2 py-0.5 rounded hover:bg-white/5"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Models Chips Display */}
      {value.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-white/50">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-brand" />
              Selected models ({value.length}):
            </span>
            <div className="flex items-center gap-2">
              {invalidSelected.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      (value || []).filter((m) => !invalidSet.has(normalizeModelKey(m)))
                    )
                  }
                  className="text-[11px] text-red-300 hover:text-red-200 underline"
                  data-testid="remove-invalid-models"
                >
                  Remove {invalidSelected.length} invalid
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-red-400 hover:text-red-300 underline"
              >
                Clear all
              </button>
            </div>
          </div>
          {invalidSelected.length > 0 && (
            <p className="text-[11px] text-red-300/90">
              Red chips are models no longer in the {brandName} catalog — click × to remove, or save to auto-strip them.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl border border-white/10 bg-white/[0.02] custom-scrollbar">
            {value.map((m) => {
              const isInvalid = invalidSet.has(normalizeModelKey(m));
              return (
                <span
                  key={m}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium group transition-colors ${
                    isInvalid
                      ? "bg-red-500/15 border border-red-500/50 text-red-300 hover:border-red-400"
                      : "bg-brand/10 border border-brand/30 text-brand hover:border-brand/60"
                  }`}
                  title={isInvalid ? `${m} is not in the active catalog` : m}
                  data-invalid={isInvalid ? "true" : undefined}
                >
                  <span>{m}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange((value || []).filter((x) => normalizeModelKey(x) !== normalizeModelKey(m)))
                    }
                    className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                      isInvalid
                        ? "hover:text-white hover:bg-red-500/30"
                        : "hover:text-white hover:bg-brand/20"
                    }`}
                    title={`Remove ${m}`}
                    aria-label={`Remove ${m}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-white/40">
          No models selected. Choose which {brandName} models can be ordered for this design.
        </p>
      )}
    </div>
  );
}
