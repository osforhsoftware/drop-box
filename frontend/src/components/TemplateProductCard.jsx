import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Zap } from "lucide-react";
import {
  formatPrice,
  caseTypeLabel,
  displayTemplateTitle,
  normalizeProductType,
  productHasAvailableStock,
  listingPrice,
  listingPriceIsFrom,
} from "../constants/templateProducts";
import { partitionTags } from "../constants/colorSwatch";
import { ColorSwatchGroup } from "./ColorSwatch";
import { isWishlisted, toggleWishlist } from "../lib/wishlist";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import {
  buildCartItem,
  checkoutTemplate,
  resolveCatalogForTemplate,
} from "../lib/templateCartActions";
import { useMediaQuery } from "../hooks/useMediaQuery";
import ProductCardActionBar from "./ProductCardActionBar";
import ProductImage from "./ProductImage";

export default function TemplateProductCard({
  item,
  template,
  onQuickView,
  onAddToCart,
  onBuyNow,
  compact = false,
  mini = false,
  testId,
}) {
  const product = item || template;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const isTouch = useMediaQuery("(hover: none), (max-width: 767px)");

  const [wishlisted, setWishlisted] = useState(() => isWishlisted(product.id));
  const [wishPop, setWishPop] = useState(false);
  const [cartState, setCartState] = useState("idle");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  useEffect(() => {
    const handler = () => setWishlisted(isWishlisted(product.id));
    window.addEventListener("wishlist-change", handler);
    return () => window.removeEventListener("wishlist-change", handler);
  }, [product.id]);

  const price = listingPrice(product);
  const priceFrom = listingPriceIsFrom(product);
  const hasDiscount = !priceFrom && product.discount_percent > 0;
  const isOriginal = normalizeProductType(product.product_type) === "original";
  const { colors: colorTags } = partitionTags(product.tags);
  const fullyOutOfStock = !productHasAvailableStock(product);

  const showActions = !isTouch || mobileActionsOpen;

  const handleWishlist = useCallback(() => {
    toggleWishlist(product.id);
    setWishlisted(isWishlisted(product.id));
    setWishPop(true);
    window.setTimeout(() => setWishPop(false), 420);
  }, [product.id]);

  const handleQuickView = useCallback(() => {
    if (onQuickView) {
      onQuickView(product);
      return;
    }
    navigate(`/template/${product.slug}`);
  }, [navigate, onQuickView, product]);

  const handleAddToCart = useCallback(async () => {
    if (cartState === "loading" || fullyOutOfStock) return;
    setCartState("loading");
    try {
      if (onAddToCart) {
        await onAddToCart(product);
      } else {
        const catalog = await resolveCatalogForTemplate(product);
        addToCart(buildCartItem(product, catalog));
      }
      setCartState("success");
      window.setTimeout(() => setCartState("idle"), 1600);
    } catch {
      setCartState("idle");
      navigate(`/template/${product.slug}`);
    }
  }, [addToCart, cartState, fullyOutOfStock, navigate, onAddToCart, product]);

  const handleBuyNow = useCallback(async () => {
    try {
      if (onBuyNow) {
        await onBuyNow(product);
        return;
      }
      await checkoutTemplate(product, { user, navigate });
    } catch {
      navigate(`/template/${product.slug}`);
    }
  }, [navigate, onBuyNow, product, user]);

  const handleImageTap = (e) => {
    if (!isTouch) return;
    e.preventDefault();
    setMobileActionsOpen((open) => !open);
  };

  const handleImageKeyDown = (e) => {
    if (!isTouch) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setMobileActionsOpen((open) => !open);
    }
  };

  return (
    <article
      data-testid={testId || `template-card-${product.slug}`}
      className={`product-card-premium group h-full flex flex-col${
        mobileActionsOpen ? " is-mobile-actions" : ""
      }${mini ? " product-card-premium--mini" : ""} ${compact && !mini ? "min-w-[220px]" : ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setMobileActionsOpen(false);
        }
      }}
    >
      <div className="product-card-media">
        <Link
          to={`/template/${product.slug}`}
          className="product-card-image-link block w-full h-full"
          onClick={handleImageTap}
          onKeyDown={handleImageKeyDown}
          aria-expanded={isTouch ? mobileActionsOpen : undefined}
          aria-label={`View ${displayTemplateTitle(product.title)}`}
        >
          <ProductImage
            src={product.thumbnail || product.images?.[0]}
            variants={product.image_variants}
            alt={product.title}
            className="product-card-image"
          />
        </Link>

        <div className="product-card-overlay" aria-hidden />

        {hasDiscount && (
          <span className="absolute top-2 left-2 z-[2] px-1.5 py-0.5 rounded-md bg-brand text-[10px] font-mono font-medium">
            −{product.discount_percent}%
          </span>
        )}
        {product.featured && (
          <span className={`absolute ${hasDiscount ? "top-8" : "top-2"} left-2 z-[2] px-1.5 py-0.5 rounded-md glass-2 text-[9px] font-mono uppercase tracking-wider text-brand`}>
            Featured
          </span>
        )}
        {isOriginal && (
          <span className={`absolute ${hasDiscount && product.featured ? "top-14" : hasDiscount || product.featured ? "top-8" : "top-2"} left-2 z-[2] px-1.5 py-0.5 rounded-md glass-2 text-[9px] font-mono uppercase tracking-wider text-white/80`}>
            Original
          </span>
        )}
        {fullyOutOfStock && (
          <span
            className="absolute top-2 right-2 z-[2] px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] font-medium text-amber-200"
            data-testid={`out-of-stock-${product.slug}`}
          >
            Out of stock
          </span>
        )}

        <ProductCardActionBar
          visible={showActions}
          mobile={isTouch}
          onQuickView={handleQuickView}
          onAddToCart={handleAddToCart}
          cartDisabled={fullyOutOfStock}
          onBuyNow={handleBuyNow}
          onWishlist={handleWishlist}
          wishlisted={wishlisted}
          wishPop={wishPop}
          cartState={cartState}
          productSlug={product.slug}
        />
      </div>

      <Link
        to={`/template/${product.slug}`}
        className={`product-card-body flex-1 flex flex-col border-t border-white/[0.04] ${
          mini ? "px-2 py-1.5" : compact ? "px-2.5 py-1.5" : "px-2.5 py-1.5 sm:px-3 sm:py-2"
        }`}
      >
        {mini ? (
          <>
            <h3
              className="font-medium text-[11px] leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-brand group-focus-within:text-brand"
              title={product.title}
            >
              {displayTemplateTitle(product.title)}
            </h3>
            <div className="flex items-center justify-between gap-1 mt-1">
              <span className="font-medium text-xs">
                {priceFrom ? "From " : ""}{formatPrice(price)}
              </span>
              {hasDiscount && (
                <span className="text-[10px] text-white/35 line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </>
        ) : compact ? (
          <>
            <h3
              className="font-medium text-[13px] leading-tight line-clamp-1 transition-colors duration-300 group-hover:text-brand group-focus-within:text-brand"
              title={product.title}
            >
              {displayTemplateTitle(product.title)}
            </h3>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-medium text-sm">
                {priceFrom ? "From " : ""}{formatPrice(price)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-white/35 line-through">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            {product.collection && (
              <span className="text-[9px] sm:text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-brand">
                {product.collection}
              </span>
            )}
            <h3
              className="font-semibold text-[13px] sm:text-[15px] leading-snug mt-0.5 sm:mt-1 line-clamp-1 transition-colors duration-300 group-hover:text-brand group-focus-within:text-brand"
              title={product.title}
            >
              {displayTemplateTitle(product.title)}
            </h3>
            <div className="flex items-center justify-between gap-1 sm:gap-2 mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-white/55">
              <span className="truncate min-w-0">
                {product.phone_brand}
                {product.phone_models?.[0] && (
                  <span className="text-white/30 hidden min-[380px]:inline"> · {product.phone_models[0]}</span>
                )}
              </span>
              <span className="flex items-center gap-0.5 shrink-0">
                <Star className="w-2.5 h-2.5 fill-brand text-brand" />
                <span>{product.rating?.toFixed(1) || "4.5"}</span>
                <span className="text-white/30 hidden sm:inline">({product.review_count || 0})</span>
              </span>
            </div>
            <div className="flex items-center justify-between mt-auto pt-1 sm:pt-1.5">
              <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
                <span className="font-semibold text-sm sm:text-base">
                  {priceFrom ? (
                    <span className="text-[10px] sm:text-xs font-medium text-white/55 mr-1">From</span>
                  ) : null}
                  {formatPrice(price)}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-white/45 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {colorTags.length > 0 && (
                  <ColorSwatchGroup colors={colorTags} size="sm" />
                )}
                {product.best_seller && (
                  <span className="hidden sm:flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                    <Zap className="w-2.5 h-2.5" /> Best Seller
                  </span>
                )}
                <span className="text-[9px] sm:text-[10px] font-mono text-white/50 uppercase">
                  {priceFrom
                    ? `${product.material_count} materials`
                    : caseTypeLabel(product.case_type)}
                </span>
              </div>
            </div>
          </>
        )}
      </Link>
    </article>
  );
}
