import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { getWishlist } from "../lib/wishlist";
import { useAuth } from "../lib/auth";
import { useCart } from "../lib/cart";
import {
  buildCartItem,
  checkoutTemplate,
  resolveCatalogForTemplate,
} from "../lib/templateCartActions";
import { WISHLIST_PRODUCT_GRID } from "../constants/productGrid";
import TemplateProductCard from "../components/TemplateProductCard";
import TemplateQuickView from "../components/TemplateQuickView";

const PAGE_LIMIT = 16;

export default function Wishlist() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quickView, setQuickView] = useState(null);

  const fetchPage = useCallback(async (p) => {
    const ids = getWishlist();
    const count = ids.length;
    const pageCount = Math.ceil(count / PAGE_LIMIT) || 1;
    const safePage = Math.min(Math.max(1, p), pageCount);

    if (!count) {
      setItems([]);
      setPage(1);
      setPages(1);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const start = (safePage - 1) * PAGE_LIMIT;
      const pageIds = ids.slice(start, start + PAGE_LIMIT);
      const { data } = await api.get("/shop/templates", {
        params: { ids: pageIds.join(","), limit: PAGE_LIMIT, page: 1 },
      });
      const byId = Object.fromEntries((data.items || []).map((item) => [item.id, item]));
      setItems(pageIds.map((id) => byId[id]).filter(Boolean));
      setPage(safePage);
      setPages(pageCount);
      setTotal(count);
    } catch {
      setItems([]);
      setPage(safePage);
      setPages(pageCount);
      setTotal(count);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  useEffect(() => {
    const onWishlistChange = () => {
      const ids = getWishlist();
      const pageCount = Math.ceil(ids.length / PAGE_LIMIT) || 1;
      setPage((current) => {
        const next = Math.min(current, pageCount) || 1;
        if (next === current) fetchPage(next);
        return next;
      });
    };
    window.addEventListener("wishlist-change", onWishlistChange);
    return () => window.removeEventListener("wishlist-change", onWishlistChange);
  }, [fetchPage]);

  const goToPage = (p) => {
    if (p < 1 || p > pages || p === page || loading) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10" data-testid="wishlist-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow">Saved items</div>
          <h1 className="font-display text-3xl lg:text-4xl mt-2 flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-brand fill-brand/20" />
            My Wishlist
          </h1>
          <p className="text-white/50 mt-1.5 text-sm">
            {loading && !total
              ? "Loading your saved products…"
              : total === 0
                ? "Products you save with the heart icon will appear here."
                : `${total} saved product${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        {total > 0 && (
          <Link
            to="/shop"
            className="text-sm text-white/50 hover:text-brand transition-colors flex items-center gap-1.5"
          >
            Continue shopping <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {loading && !items.length ? (
        <div className={`wishlist-grid ${WISHLIST_PRODUCT_GRID}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="glass rounded-2xl p-10 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-white/[0.06] grid place-items-center mx-auto mb-3">
            <Heart className="w-6 h-6 text-white/30" />
          </div>
          <h2 className="font-display text-lg">Your wishlist is empty</h2>
          <p className="text-white/50 mt-1.5 text-sm">
            Tap the heart on any product to save it for later.
          </p>
          <Link to="/shop" className="btn-primary mt-5 inline-flex items-center gap-2 text-sm">
            Browse shop <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className={`wishlist-grid ${WISHLIST_PRODUCT_GRID}`}>
            {items.map((t) => (
              <TemplateProductCard
                key={t.id}
                template={t}
                mini
                onQuickView={setQuickView}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            ))}
          </div>
          {pages > 1 && (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Wishlist pagination"
              data-testid="wishlist-pagination"
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
