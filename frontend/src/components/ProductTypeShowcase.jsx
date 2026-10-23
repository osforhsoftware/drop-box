import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { api } from "../lib/api";
import { productGridClass } from "../constants/productGrid";
import {
  SHOWCASE_BREAKPOINTS,
  SHOWCASE_COLUMNS,
  chunkProducts,
} from "../constants/showcaseConfig";
import { TEMPLATE_PRODUCT_TYPE_SECTIONS } from "../constants/templateProducts";
import { useMediaQuery } from "../hooks/useMediaQuery";
import TemplateProductCard from "./TemplateProductCard";

function uniqueTemplates(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.design_id || item?.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function useSliderLayout() {
  const isTabletUp = useMediaQuery(`(min-width: ${SHOWCASE_BREAKPOINTS.tablet}px)`);
  const isLaptopUp = useMediaQuery(`(min-width: ${SHOWCASE_BREAKPOINTS.laptop}px)`);
  const isDesktopUp = useMediaQuery(`(min-width: ${SHOWCASE_BREAKPOINTS.desktop}px)`);

  // Two rows on every breakpoint; desktop shows 5 across.
  if (isDesktopUp) {
    return { cols: SHOWCASE_COLUMNS.desktop, rows: 2 };
  }
  if (isLaptopUp) {
    return { cols: SHOWCASE_COLUMNS.laptop, rows: 2 };
  }
  if (isTabletUp) {
    return { cols: SHOWCASE_COLUMNS.tablet, rows: 2 };
  }
  // Mobile: two cards per row so more products are visible without extra scrolling.
  return { cols: 2, rows: 2 };
}

/**
 * Manual paged slider — one grid “page” per swipe.
 * Mobile: 2×2 · tablet: 3×2 · laptop: 4×2 · desktop: 5×2. No autoplay.
 */
function SliderRow({ items }) {
  const unique = useMemo(() => uniqueTemplates(items), [items]);
  const { cols, rows } = useSliderLayout();
  const perSlide = cols * rows;
  const slides = useMemo(
    () => chunkProducts(unique, perSlide),
    [unique, perSlide]
  );

  if (!unique.length) return null;

  if (unique.length <= perSlide) {
    return (
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(cols, unique.length)}, minmax(0, 1fr))`,
        }}
      >
        {unique.map((t) => (
          <TemplateProductCard key={t.id} item={t} />
        ))}
      </div>
    );
  }

  return (
    <div className="product-showcase-swiper-wrap" data-testid="product-type-slider">
      <Swiper
        modules={[Pagination]}
        slidesPerView={1}
        spaceBetween={16}
        speed={450}
        grabCursor
        resistance
        resistanceRatio={0.85}
        pagination={{ clickable: true, dynamicBullets: slides.length > 5 }}
        className="product-showcase-swiper"
      >
        {slides.map((slideProducts, slideIndex) => (
          <SwiperSlide key={slideIndex}>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(cols, slideProducts.length)}, minmax(0, 1fr))`,
              }}
            >
              {slideProducts.map((product) => (
                <TemplateProductCard key={product.id} item={product} />
              ))}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

function filterParamsKey(params) {
  return JSON.stringify(params || {});
}

/**
 * Two-row showcase: customized templates first, original covers second.
 * layout: "slider" (home) | "grid" (shop browse)
 * afterSection: optional node rendered after a section (by slug)
 */
export default function ProductTypeShowcase({
  layout = "slider",
  filterParams = {},
  limit = 12,
  className = "",
  onQuickView,
  onAddToCart,
  onBuyNow,
  showSectionLinks = true,
  afterSection = null,
  testId = "product-type-showcase",
}) {
  const [sections, setSections] = useState(() =>
    Object.fromEntries(TEMPLATE_PRODUCT_TYPE_SECTIONS.map((s) => [s.slug, []]))
  );
  const [loading, setLoading] = useState(true);
  const paramsKey = filterParamsKey(filterParams);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const base = { limit, sort: "newest", ...JSON.parse(paramsKey) };
    delete base.product_type;
    delete base.page;

    Promise.all(
      TEMPLATE_PRODUCT_TYPE_SECTIONS.map((section) =>
        api
          .get("/shop/templates", { params: { ...base, product_type: section.slug, page: 1 } })
          .then((r) => [
            section.slug,
            uniqueTemplates((r.data?.items || []).filter((t) => t.status === "published")),
          ])
          .catch(() => [section.slug, []])
      )
    )
      .then((pairs) => {
        if (!cancelled) setSections(Object.fromEntries(pairs));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramsKey, limit]);

  const hasAny = TEMPLATE_PRODUCT_TYPE_SECTIONS.some((s) => (sections[s.slug] || []).length > 0);

  if (loading) {
    return (
      <div className={`space-y-12 ${className}`} data-testid={`${testId}-loading`}>
        {TEMPLATE_PRODUCT_TYPE_SECTIONS.map((section) => (
          <div key={section.slug} className="space-y-4">
            <div className="h-8 w-56 bg-white/5 rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[5/4] bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!hasAny) {
    if (layout === "grid") {
      return (
        <div className="glass rounded-2xl p-12 text-center" data-testid={`${testId}-empty`}>
          <p className="text-white/60">No templates match your filters.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`space-y-16 lg:space-y-20 ${className}`} data-testid={testId}>
      {TEMPLATE_PRODUCT_TYPE_SECTIONS.map((section) => {
        const items = sections[section.slug] || [];
        const after = afterSection?.[section.slug] || null;
        if (!items.length) {
          return after ? (
            <div key={`after-${section.slug}`} className="space-y-10 lg:space-y-12">
              {after}
            </div>
          ) : null;
        }

        return (
          <div key={section.slug} className="space-y-10 lg:space-y-12">
            <section data-testid={`${testId}-${section.slug}`}>
              <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <div className="label-eyebrow">{section.eyebrow}</div>
                  <h2 className="font-display text-3xl lg:text-4xl mt-2">{section.label}</h2>
                  <p className="text-white/50 mt-2 max-w-lg text-sm">{section.description}</p>
                </div>
                {showSectionLinks && (
                  <Link
                    to={`/shop?product_type=${section.slug}`}
                    className="hidden sm:flex items-center gap-2 text-sm text-white/60 hover:text-brand transition-colors"
                  >
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {layout === "slider" ? (
                <SliderRow items={items} />
              ) : (
                <div className={productGridClass(items.length)}>
                  {items.map((t) => (
                    <TemplateProductCard
                      key={t.id}
                      template={t}
                      onQuickView={onQuickView}
                      onAddToCart={onAddToCart}
                      onBuyNow={onBuyNow}
                    />
                  ))}
                </div>
              )}

              {showSectionLinks && (
                <div className="text-center mt-6 sm:hidden">
                  <Link
                    to={`/shop?product_type=${section.slug}`}
                    className="btn-secondary text-sm inline-flex items-center gap-2"
                  >
                    View all <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </section>
            {after}
          </div>
        );
      })}
    </div>
  );
}
