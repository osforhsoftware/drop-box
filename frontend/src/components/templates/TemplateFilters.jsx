import { X, Search } from "lucide-react";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_COLLECTIONS,
  TEMPLATE_PHONE_BRANDS,
  TEMPLATE_PRODUCT_TYPES,
  SORT_OPTIONS,
} from "../../constants/templateProducts";
import FilterSelect from "./FilterSelect";

const EMPTY = {
  search: "",
  phone_brand: "",
  phone_model: "",
  case_type: "",
  product_type: "",
  category: "",
  collection: "",
  min_price: "",
  max_price: "",
  sort: "newest",
  in_stock: false,
};

export default function TemplateFilters({
  filters,
  onChange,
  models = [],
  caseTypes = [],
  mobileOpen,
  onMobileClose,
}) {
  const set = (k, v) => onChange({ ...filters, [k]: v });

  const content = (
    <div className="space-y-6">
      <div>
        <label className="label-eyebrow block mb-2">Search</label>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Search templates…"
            className="filter-input filter-input--with-icon text-white placeholder:text-white/30"
            data-testid="shop-search"
          />
        </div>
      </div>

      <FilterGroup label="Phone Brand">
        <FilterSelect
          value={filters.phone_brand}
          onChange={(v) => set("phone_brand", v)}
          allowAll
          allLabel="All brands"
          placeholder="All brands"
          testId="filter-brand"
          options={TEMPLATE_PHONE_BRANDS.map((b) => ({ value: b, label: b }))}
        />
      </FilterGroup>

      {models.length > 0 && (
        <FilterGroup label="Phone Model">
          <FilterSelect
            value={filters.phone_model}
            onChange={(v) => set("phone_model", v)}
            allowAll
            allLabel="All models"
            placeholder="All models"
            testId="filter-model"
            options={models.map((m) => ({ value: m.name, label: m.name }))}
          />
        </FilterGroup>
      )}

      <FilterGroup label="Case Type">
        <FilterSelect
          value={filters.case_type}
          onChange={(v) => set("case_type", v)}
          allowAll
          allLabel="All types"
          placeholder="All types"
          options={caseTypes.map((c) => ({ value: c.slug, label: c.name }))}
        />
      </FilterGroup>

      <FilterGroup label="Phone Case Type">
        <FilterSelect
          value={filters.product_type}
          onChange={(v) => set("product_type", v)}
          allowAll
          allLabel="All phone cases"
          placeholder="All phone cases"
          testId="filter-product-type"
          options={TEMPLATE_PRODUCT_TYPES.map((t) => ({ value: t.slug, label: t.label }))}
        />
      </FilterGroup>

      <FilterGroup label="Category">
        <FilterSelect
          value={filters.category}
          onChange={(v) => set("category", v)}
          allowAll
          allLabel="All categories"
          placeholder="All categories"
          options={TEMPLATE_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </FilterGroup>

      <FilterGroup label="Collection">
        <FilterSelect
          value={filters.collection}
          onChange={(v) => set("collection", v)}
          allowAll
          allLabel="All collections"
          placeholder="All collections"
          options={TEMPLATE_COLLECTIONS.map((c) => ({ value: c, label: c }))}
        />
      </FilterGroup>

      <FilterGroup label="Price Range (₹)">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.min_price}
            onChange={(e) => set("min_price", e.target.value)}
            className="filter-input text-white placeholder:text-white/30"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.max_price}
            onChange={(e) => set("max_price", e.target.value)}
            className="filter-input text-white placeholder:text-white/30"
          />
        </div>
      </FilterGroup>

      <FilterGroup label="Sort">
        <FilterSelect
          value={filters.sort}
          onChange={(v) => set("sort", v)}
          placeholder="Sort by"
          testId="filter-sort"
          options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </FilterGroup>

      <label className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer group">
        <input
          type="checkbox"
          checked={filters.in_stock}
          onChange={(e) => set("in_stock", e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-white/[0.04] text-brand focus:ring-brand focus:ring-offset-0"
        />
        In stock only
      </label>

      <button
        type="button"
        onClick={() => onChange({ ...EMPTY })}
        className="w-full text-sm text-white/50 hover:text-brand py-2 transition-colors"
      >
        Clear all filters
      </button>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="glass rounded-2xl p-5 sticky top-24">{content}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="absolute inset-y-0 left-0 w-[min(100%,320px)] glass border-r border-white/10 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-display text-lg">Filters</span>
              <button type="button" onClick={onMobileClose} aria-label="Close" className="w-8 h-8 rounded-lg glass-2 grid place-items-center hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      )}
    </>
  );
}

export { EMPTY as DEFAULT_FILTERS };

function FilterGroup({ label, children }) {
  return (
    <div>
      <label className="label-eyebrow block mb-2">{label}</label>
      {children}
    </div>
  );
}
