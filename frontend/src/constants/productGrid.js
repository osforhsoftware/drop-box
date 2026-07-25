/** Default shop product grid — shared by Shop page and home featured section. */
export const SHOP_PRODUCT_GRID =
  "grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch";

/** Wishlist — denser 4-column grid with smaller cards. */
export const WISHLIST_PRODUCT_GRID =
  "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 items-stretch";

/** Tighten columns when few items — left-aligned, not centered. */
export function productGridClass(itemCount) {
  const gap = "gap-4 lg:gap-6";
  if (itemCount <= 1) {
    return `grid grid-cols-1 max-w-[11rem] sm:max-w-xs ${gap}`;
  }
  if (itemCount === 2) {
    return `grid grid-cols-2 max-w-md sm:max-w-xl ${gap}`;
  }
  return SHOP_PRODUCT_GRID;
}
