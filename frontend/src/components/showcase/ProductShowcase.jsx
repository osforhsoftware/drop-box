import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { api } from "../../lib/api";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  SHOWCASE_DEFAULTS,
  SHOWCASE_MOBILE,
  chunkProducts,
} from "../../constants/showcaseConfig";
import { productGridClass, SHOP_PRODUCT_GRID } from "../../constants/productGrid";
import TemplateProductCard from "../TemplateProductCard";

function uniqueProducts(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function ShowcaseSkeleton() {
  return (
    <div className={SHOP_PRODUCT_GRID} data-testid="product-showcase-loading">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[5/4] bg-white/5 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

function ShowcaseGrid({ products }) {
  return (
    <div className={productGridClass(products.length)} data-testid="product-showcase-grid">
      {products.map((product) => (
        <TemplateProductCard key={product.id} template={product} />
      ))}
    </div>
  );
}

function ShowcaseMobileSlider({
  products,
  perSlide,
  cols,
  autoplay = false,
  autoplayDelay = 5000,
  loop = false,
}) {
  const slides = useMemo(() => chunkProducts(products, perSlide), [products, perSlide]);
  const modules = useMemo(() => {
    const m = [Pagination];
    if (autoplay) m.push(Autoplay);
    return m;
  }, [autoplay]);

  if (!slides.length) return null;

  return (
    <div className="product-showcase-swiper-wrap" data-testid="product-showcase-slider">
      <Swiper
        modules={modules}
        slidesPerView={1}
        spaceBetween={16}
        speed={450}
        touchRatio={1}
        resistance
        resistanceRatio={0.85}
        longSwipes
        followFinger
        grabCursor
        pagination={{ clickable: true, dynamicBullets: slides.length > 5 }}
        loop={loop && slides.length > 1}
        autoplay={
          autoplay
            ? { delay: autoplayDelay, disableOnInteraction: false, pauseOnMouseEnter: true }
            : false
        }
        className="product-showcase-swiper"
      >
        {slides.map((slideProducts, slideIndex) => (
          <SwiperSlide key={slideIndex}>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${Math.min(cols, slideProducts.length)}, minmax(0, 1fr))` }}
            >
              {slideProducts.map((product) => (
                <TemplateProductCard key={product.id} template={product} />
              ))}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

/**
 * Featured templates — same product card + grid as the Shop page.
 */
export default function ProductShowcase({
  title = "Featured Case Templates",
  subtitle = "Premium pre-designed cases — pick a template, choose your phone, and order instantly.",
  eyebrow = "Ready-made designs",
  shopLink = "/shop",
  limit = SHOWCASE_DEFAULTS.fetchLimit,
  displayCount = 8,
  autoplay = SHOWCASE_DEFAULTS.autoplay,
  autoplayDelay = SHOWCASE_DEFAULTS.autoplayDelay,
  loop = SHOWCASE_DEFAULTS.loop,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const isWideMobile = useMediaQuery(
    `(min-width: ${SHOWCASE_MOBILE.wideMinWidth}px) and (max-width: 767px)`
  );

  const mobileLayout = isWideMobile ? SHOWCASE_MOBILE.wide : SHOWCASE_MOBILE.narrow;

  useEffect(() => {
    api
      .get("/shop/templates/featured", { params: { limit } })
      .then((r) => {
        const published = uniqueProducts(
          (r.data || []).filter((t) => t.status === "published")
        );
        setProducts(published);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [limit]);

  const gridProducts = useMemo(
    () => products.slice(0, displayCount),
    [products, displayCount]
  );

  if (loading) {
    return (
      <section className="product-showcase-section py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-10">
          <div className="h-4 w-32 bg-white/5 rounded animate-pulse mb-3" />
          <div className="h-10 w-72 max-w-full bg-white/5 rounded animate-pulse" />
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <ShowcaseSkeleton />
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="product-showcase-section py-16 lg:py-20" data-testid="product-showcase">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-10 flex items-end justify-between gap-6">
        <div>
          <div className="label-eyebrow">{eyebrow}</div>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl mt-3">{title}</h2>
          <p className="text-white/50 mt-2 max-w-lg text-sm leading-relaxed">{subtitle}</p>
        </div>
        <Link
          to={shopLink}
          data-testid="featured-shop-link"
          className="hidden sm:flex shrink-0 items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          Browse all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {isTabletUp ? (
          <ShowcaseGrid products={gridProducts} />
        ) : (
          <ShowcaseMobileSlider
            products={products.slice(0, displayCount)}
            perSlide={mobileLayout.perSlide}
            cols={mobileLayout.cols}
            autoplay={autoplay}
            autoplayDelay={autoplayDelay}
            loop={loop}
          />
        )}
      </div>

      <div className="text-center mt-8 sm:hidden px-6">
        <Link to={shopLink} className="btn-secondary text-sm inline-flex items-center gap-2">
          Browse all templates <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
