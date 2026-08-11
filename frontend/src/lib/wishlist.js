const KEY = "form_wishlist";

export function getWishlist() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isWishlisted(id) {
  return getWishlist().includes(id);
}

export function toggleWishlist(id) {
  const list = getWishlist();
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("wishlist-change"));
  return next;
}
