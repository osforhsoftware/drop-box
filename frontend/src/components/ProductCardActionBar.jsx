import { Check, Eye, Heart, Loader2, ShoppingBag } from "lucide-react";

function ActionButton({
  label,
  onClick,
  disabled,
  active,
  pop,
  state = "idle",
  icon: Icon,
  activeIcon: ActiveIcon,
  testId,
  variant = "icon",
  className = "",
}) {
  const isLoading = state === "loading";
  const isSuccess = state === "success";
  const showCheck = isSuccess && ActiveIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={label}
      data-testid={testId}
      className={`product-card-action-btn product-card-action-btn--${variant}${active ? " is-active" : ""}${pop ? " is-pop" : ""}${
        isSuccess ? " is-success" : ""
      }${className ? ` ${className}` : ""}`}
    >
      {isLoading ? (
        <Loader2 className="w-[18px] h-[18px] animate-spin" aria-hidden />
      ) : showCheck ? (
        <Check className="w-[18px] h-[18px]" aria-hidden />
      ) : (
        <Icon className={`w-[18px] h-[18px]${active ? " fill-current" : ""}`} aria-hidden />
      )}
      <span className="sr-only">{label}</span>
    </button>
  );
}

export default function ProductCardActionBar({
  visible = false,
  mobile = false,
  onQuickView,
  onAddToCart,
  onWishlist,
  wishlisted = false,
  wishPop = false,
  cartState = "idle",
  cartDisabled = false,
  productSlug,
}) {
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className={`product-card-action-bar${visible ? " is-visible" : ""}${
        mobile ? " is-mobile" : ""
      }`}
      role="toolbar"
      aria-label="Product actions"
      onClick={stop}
    >
      <div className="product-card-side-actions">
        {onWishlist && (
          <ActionButton
            label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            icon={Heart}
            active={wishlisted}
            pop={wishPop}
            onClick={(e) => {
              stop(e);
              onWishlist();
            }}
          />
        )}
        {onQuickView && !mobile && (
          <ActionButton
            label="Quick view"
            icon={Eye}
            className="product-card-action-btn--view"
            onClick={(e) => {
              stop(e);
              onQuickView();
            }}
            testId={productSlug ? `quick-view-${productSlug}` : undefined}
          />
        )}
        {onAddToCart && (
          <ActionButton
            label={cartDisabled ? "Out of stock" : "Add to cart"}
            icon={ShoppingBag}
            activeIcon={Check}
            variant="cart"
            state={cartState}
            disabled={cartDisabled}
            onClick={(e) => {
              stop(e);
              if (cartDisabled) return;
              onAddToCart();
            }}
            testId={productSlug ? `add-to-cart-${productSlug}` : undefined}
          />
        )}
      </div>
    </div>
  );
}
