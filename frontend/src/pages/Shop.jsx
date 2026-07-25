import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { SHOP_PRODUCT_GRID, productGridClass } from "../constants/productGrid";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import {
  buildCartItem,
  checkoutTemplate,
  resolveCatalogForTemplate,
} from "../lib/templateCartActions";
import TemplateProductCard from "../components/TemplateProductCard";
import TemplateQuickView from "../components/TemplateQuickView";
import TemplateFilters, { DEFAULT_FILTERS } from "../components/templates/TemplateFilters";

export default function Shop() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    collection: searchParams.get("collection") || "",
    product_type: searchParams.get("product_type") || "",
    case_type: searchParams.get("case_type") || "",
    sort: searchParams.get("sort") || "newest",
  }));
  const [items, setItems] = useState([]);
  const [otherItems, setOtherItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [models, setModels] = useState([]);
  const [caseTypes, setCaseTypes] = useState([]);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [quickView, setQuickView] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const collection = searchParams.get("collection") || "";
    const product_type = searchParams.get("product_type") || "";
    const case_type = searchParams.get("case_type") || "";
    setFilters((prev) => {
      const sort = searchParams.get("sort") || prev.sort || "newest";
      if (
        prev.collection === collection &&
        prev.product_type === product_type &&
        prev.case_type === case_type &&
        prev.sort === sort
      ) {
        return prev;
      }
      return { ...prev, collection, product_type, case_type, sort };
    });
  }, [searchParams]);

  const buildParams = useCallback(
    (p) => {
      const params = { page: p, limit: 12, sort: filters.sort };
      if (filters.search) params.search = filters.search;
      if (filters.phone_brand) params.phone_brand = filters.phone_brand;
      if (filters.phone_model) params.phone_model = filters.phone_model;
      if (filters.case_type) params.case_type = filters.case_type;
      if (filters.product_type) params.product_type = filters.product_type;
      if (filters.category) params.category = filters.category;
      if (filters.collection) params.collection = filters.collection;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.max_price) params.max_price = filters.max_price;
      if (filters.in_stock) params.in_stock = "true";
      return params;
    },
    [filters]
  );

  const fetchPage = useCallback(
    async (p) => {
      setLoading(true);
      setFetchError(null);
      setOtherItems([]);
      try {
        const { data } = await api.get("/shop/templates", { params: buildParams(p) });
        setItems(data.items);
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);

        if (data.items.length === 0 && filters.case_type) {
          try {
            const fallback = await api.get("/shop/templates", {
              params: { page: 1, limit: 12, sort: filters.sort },
            });
            setOtherItems(fallback.data.items);
          } catch {
            setOtherItems([]);
          }
        }
      } catch (err) {
        setItems([]);
        const detail = err?.response?.data?.detail;
        setFetchError(
          detail || "Could not load templates. Check that the backend is running on port 8000."
        );
      } finally {
        setLoading(false);
      }
    },
    [buildParams, filters.case_type, filters.sort]
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPage(1);
    }, filters.search ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchPage]);

  const goToPage = (p) => {
    if (p < 1 || p > pages || p === page || loading) return;
    fetchPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    api.get("/case-types")
      .then((response) => setCaseTypes(response.data))
      .catch(() => setCaseTypes([]));
  }, []);

  useEffect(() => {
    if (!filters.phone_brand) {
      setModels([]);
      return;
    }
    api.get("/brands").then((brandsRes) => {
      const brand = brandsRes.data.find((b) => b.name === filters.phone_brand);
      if (!brand) return;
      api.get("/models", { params: { brand_id: brand.id } }).then((r) => setModels(r.data));
    });
  }, [filters.phone_brand]);

  const selectedCaseType = caseTypes.find((type) => type.slug === filters.case_type);
  const selectedCaseTypeName = selectedCaseType?.name
    || filters.case_type.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  const handleAddToCart = useCallback(
    async (template) => {
      const catalog = await resolveCatalogForTemplate(template);
      addToCart(buildCartItem(template, catalog));
    },
    [addToCart]
  );

  const handleBuyNow = useCallback(
    async (template) => {
      await checkoutTemplate(template, { user, navigate });
      setQuickView(null);
    },
    [navigate, user]
  );
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12" data-testid="shop-page">
      <div className="mb-10">
        <div className="label-eyebrow">Template Marketplace</div>
        <h1 className="font-display text-4xl lg:text-5xl mt-3">Shop Phone Cases</h1>
        <p className="text-white/50 mt-2 max-w-xl text-sm">
          Browse all phone cases — customized designs and original covers in one place.
        </p>
      </div>

      <div className="flex gap-8">
        <TemplateFilters
          filters={filters}
          onChange={setFilters}
          models={models}
          caseTypes={caseTypes}
          mobileOpen={mobileFilters}
          onMobileClose={() => setMobileFilters(false)}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6 gap-4">
            <p className="text-sm text-white/50">
              {loading ? "Loading…" : `${total} template${total !== 1 ? "s" : ""}`}
            </p>
            <button
              type="button"
              onClick={() => setMobileFilters(true)}
              className="lg:hidden btn-secondary text-sm flex items-center gap-2 py-2 px-3"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </div>

          {loading && !items.length ? (
            <div className={SHOP_PRODUCT_GRID}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[5/4] bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <>
              <div className="glass rounded-2xl p-12 text-center">
                <h2 className="font-display text-2xl text-white">
                  {fetchError
                    ? "Products could not be loaded"
                    : filters.case_type
                      ? `No ${selectedCaseTypeName} products found`
                      : "No products found"}
                </h2>
                <p className="text-white/60 mt-2">
                  {fetchError || (
                    filters.case_type
                      ? "This category does not have any products yet."
                      : "No templates match your filters."
                  )}
                </p>
                {!fetchError && (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                    className="btn-secondary mt-4 text-sm"
                  >
                    View all products
                  </button>
                )}
              </div>

              {!fetchError && filters.case_type && otherItems.length > 0 && (
                <section className="mt-12" aria-labelledby="other-products-heading">
                  <div className="mb-6">
                    <div className="label-eyebrow">More to explore</div>
                    <h2
                      id="other-products-heading"
                      className="font-display text-2xl text-white mt-2"
                    >
                      Other products you may like
                    </h2>
                  </div>
                  <div className={productGridClass(otherItems.length)}>
                    {otherItems.map((template) => (
                      <TemplateProductCard
                        key={template.id}
                        template={template}
                        onQuickView={setQuickView}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <>
              <div className={productGridClass(items.length)}>
                {items.map((t) => (
                  <TemplateProductCard
                    key={t.id}
                    template={t}
                    onQuickView={setQuickView}
                    onAddToCart={handleAddToCart}
                    onBuyNow={handleBuyNow}
                  />
                ))}
              </div>
              {pages > 1 && (
                <nav
                  className="mt-10 flex flex-wrap items-center justify-center gap-2"
                  aria-label="Shop pagination"
                  data-testid="shop-pagination"
                >
                  <button
                    type="button"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                    className="p-2 rounded-lg glass-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06]"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      disabled={loading}
                      className={`min-w-9 h-9 px-2 rounded-lg text-sm ${
                        p === page ? "bg-brand-gradient text-white" : "glass-2 hover:bg-white/[0.06]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= pages || loading}
                    className="p-2 rounded-lg glass-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.06]"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {quickView && (
        <TemplateQuickView
          item={quickView}
          onClose={() => setQuickView(null)}
          onBuyNow={handleBuyNow}
        />
      )}
    </div>
  );
}
