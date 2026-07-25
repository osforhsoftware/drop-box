import { Check, Eye, Heart, Loader2, ShoppingBag, Zap } from "lucide-react";

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
      className={`product-card-action-btn${active ? " is-active" : ""}${pop ? " is-pop" : ""}${
        isSuccess ? " is-success" : ""
      }`}
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
  onBuyNow,
  onWishlist,
  wishlisted = false,
  wishPop = false,
  cartState = "idle",
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
      {onQuickView && (
        <ActionButton
          label="Quick view"
          icon={Eye}
          onClick={(e) => {
            stop(e);
            onQuickView();
          }}
          testId={productSlug ? `quick-view-${productSlug}` : undefined}
        />
      )}
      {onAddToCart && (
        <ActionButton
          label="Add to cart"
          icon={ShoppingBag}
          activeIcon={Check}
          state={cartState}
          onClick={(e) => {
            stop(e);
            onAddToCart();
          }}
        />
      )}
      {onBuyNow && (
        <ActionButton
          label="Buy now"
          icon={Zap}
          onClick={(e) => {
            stop(e);
            onBuyNow();
          }}
        />
      )}
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
    </div>
  );
}
