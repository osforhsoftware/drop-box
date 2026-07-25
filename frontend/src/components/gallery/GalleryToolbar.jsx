import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import FilterSelect from "../templates/FilterSelect";

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "featured", label: "Featured" },
];

export default function GalleryToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  phoneBrand,
  onPhoneBrandChange,
  phoneModel,
  onPhoneModelChange,
  caseType,
  onCaseTypeChange,
  filterOptions,
  onClear,
}) {
  const [refineOpen, setRefineOpen] = useState(false);
  const panelRef = useRef(null);

  const activeCount = [phoneBrand, phoneModel, caseType].filter(Boolean).length;

  useEffect(() => {
    if (!refineOpen) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setRefineOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [refineOpen]);

  const models = filterOptions.phone_models;

  return (
    <div className="mb-10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            data-testid="gallery-search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search phone model…"
            className="filter-input filter-input--with-icon w-full text-white placeholder:text-white/30"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center rounded-full border border-white/10 p-0.5 bg-white/[0.03]">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSortChange(opt.value)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
                  sort === opt.value
                    ? "bg-brand text-black font-medium shadow-sm"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative" ref={panelRef}>
            <button
              type="button"
              onClick={() => setRefineOpen((o) => !o)}
              data-testid="gallery-refine-btn"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border transition-colors ${
                refineOpen || activeCount > 0
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Refine
              {activeCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand text-black text-xs font-medium grid place-items-center">
                  {activeCount}
                </span>
              )}
            </button>

            {refineOpen && (
              <div className="absolute right-0 top-full mt-2 w-[min(100vw-3rem,20rem)] z-50 glass rounded-2xl p-5 shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Refine gallery</span>
                  <button
                    type="button"
                    onClick={() => setRefineOpen(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <FilterGroup label="Brand">
                    <FilterSelect
                      value={phoneBrand}
                      onChange={(v) => {
                        onPhoneBrandChange(v);
                        if (v && phoneModel) onPhoneModelChange("");
                      }}
                      allowAll
                      allLabel="All brands"
                      placeholder="All brands"
                      testId="gallery-filter-brand"
                      options={filterOptions.phone_brands.map((b) => ({ value: b, label: b }))}
                    />
                  </FilterGroup>

                  <FilterGroup label="Model">
                    <FilterSelect
                      value={phoneModel}
                      onChange={onPhoneModelChange}
                      allowAll
                      allLabel="All models"
                      placeholder="All models"
                      testId="gallery-filter-model"
                      options={models.map((m) => ({ value: m, label: m }))}
                    />
                  </FilterGroup>

                  <FilterGroup label="Case type">
                    <FilterSelect
                      value={caseType}
                      onChange={onCaseTypeChange}
                      allowAll
                      allLabel="All types"
                      placeholder="All types"
                      testId="gallery-filter-case"
                      options={filterOptions.case_types.map((c) => ({ value: c, label: c }))}
                    />
                  </FilterGroup>
                </div>

                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onPhoneBrandChange("");
                      onPhoneModelChange("");
                      onCaseTypeChange("");
                    }}
                    className="mt-4 text-sm text-brand hover:text-brand-light transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(search || activeCount > 0 || sort !== "latest") && (
        <div className="flex flex-wrap items-center gap-2">
          {search && (
            <ActiveChip label={`"${search}"`} onRemove={() => onSearchChange("")} />
          )}
          {phoneBrand && (
            <ActiveChip label={phoneBrand} onRemove={() => onPhoneBrandChange("")} />
          )}
          {phoneModel && (
            <ActiveChip label={phoneModel} onRemove={() => onPhoneModelChange("")} />
          )}
          {caseType && (
            <ActiveChip label={caseType} onRemove={() => onCaseTypeChange("")} />
          )}
          {sort !== "latest" && (
            <ActiveChip label="Featured first" onRemove={() => onSortChange("latest")} />
          )}
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-white/40 hover:text-white ml-1 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div>
      <div className="text-xs text-white/40 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function ActiveChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs bg-white/[0.06] border border-white/10 text-white/80">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white"
        aria-label={`Remove ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
