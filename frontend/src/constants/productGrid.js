/** Default shop product grid — 2 columns on phones, 3 on tablets, 4 on desktop. */
export const SHOP_PRODUCT_GRID =
  "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 items-stretch";

/** Wishlist — denser 4-column grid with smaller cards. */
export const WISHLIST_PRODUCT_GRID =
  "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4 items-stretch";

/** Tighten columns when few items — left-aligned, not centered. */
export function productGridClass(itemCount) {
  const gap = "gap-3 sm:gap-4 lg:gap-6";
  if (itemCount <= 1) {
    return `grid grid-cols-1 max-w-[11rem] sm:max-w-xs ${gap}`;
  }
  if (itemCount === 2) {
    return `grid grid-cols-2 max-w-xl ${gap}`;
  }
  if (itemCount === 3) {
    return `grid grid-cols-2 md:grid-cols-3 max-w-5xl ${gap}`;
  }
  return SHOP_PRODUCT_GRID;
}
