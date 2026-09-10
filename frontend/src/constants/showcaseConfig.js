/** Column counts per breakpoint (2-row grid on tablet+). */
export const SHOWCASE_COLUMNS = {
  desktop: 4,
  laptop: 4,
  tablet: 3,
};

export const SHOWCASE_BREAKPOINTS = {
  tablet: 768,
  laptop: 992,
  desktop: 1200,
};

/** Mobile slide layout: 2×2 (4) on narrow phones, 2×3 (6) on wider mobile. */
export const SHOWCASE_MOBILE = {
  narrow: { cols: 2, perSlide: 4 },
  wide: { cols: 3, perSlide: 6 },
  wideMinWidth: 480,
};

export const SHOWCASE_DEFAULTS = {
  rows: 2,
  fetchLimit: 20,
  autoplay: false,
  autoplayDelay: 5000,
  loop: false,
};

export function chunkProducts(items, size) {
  if (!items.length || size < 1) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function getColumnCount(width, columnConfig = SHOWCASE_COLUMNS) {
  if (width >= SHOWCASE_BREAKPOINTS.desktop) return columnConfig.desktop;
  if (width >= SHOWCASE_BREAKPOINTS.laptop) return columnConfig.laptop;
  if (width >= SHOWCASE_BREAKPOINTS.tablet) return columnConfig.tablet;
  return columnConfig.tablet;
}

/** Shrink columns / rows when few products so cards don't sit in a huge empty grid. */
export function getShowcaseLayout(productCount, columnCount, rows = 2) {
  const count = Math.max(0, productCount);
  if (count === 0) return { cols: columnCount, showcaseRows: rows, sparse: false };
  if (count === 1) return { cols: 1, showcaseRows: 1, sparse: true };
  if (count === 2) return { cols: 2, showcaseRows: 1, sparse: true };
  if (count <= columnCount) {
    return { cols: count, showcaseRows: 1, sparse: true };
  }
  const showcaseRows = Math.min(rows, Math.ceil(count / columnCount));
  return { cols: columnCount, showcaseRows, sparse: false };
}
