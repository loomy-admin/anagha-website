export type WishlistItem = {
  tag_number: string;
  name: string;
  display_price?: number | null;
  image_url?: string | null;
  type_slug?: string | null;
  group_slug?: string | null;
  purity?: string | null;
};

const WISHLIST_KEY = 'anagha_wishlist';
export const WISHLIST_CHANGED_EVENT = 'anagha-wishlist-changed';

export function emitWishlistChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WISHLIST_CHANGED_EVENT));
}

function normalizeWishlist(raw: unknown): WishlistItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is WishlistItem => Boolean(item?.tag_number))
      .map((item) => ({
        ...item,
        tag_number: String(item.tag_number).trim().toUpperCase(),
      }));
  }
  return [];
}

export function loadWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (raw) return normalizeWishlist(JSON.parse(raw));
    return [];
  } catch {
    return [];
  }
}

function persistWishlist(items: WishlistItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  emitWishlistChanged();
}

export function getWishlistCount(): number {
  return loadWishlist().length;
}

export function addToWishlist(item: WishlistItem): { added: boolean; wishlist: WishlistItem[] } {
  const tag = String(item.tag_number || '').trim().toUpperCase();
  if (!tag) return { added: false, wishlist: loadWishlist() };
  const wishlist = loadWishlist();
  if (wishlist.some((row) => row.tag_number === tag)) {
    return { added: false, wishlist };
  }
  const next = [
    ...wishlist,
    {
      ...item,
      tag_number: tag,
    },
  ];
  persistWishlist(next);
  return { added: true, wishlist: next };
}

export function removeFromWishlist(tagNumber: string): WishlistItem[] {
  const tag = String(tagNumber || '').trim().toUpperCase();
  const next = loadWishlist().filter((row) => row.tag_number !== tag);
  persistWishlist(next);
  return next;
}

export function toggleWishlist(item: WishlistItem): boolean {
  const tag = String(item.tag_number || '').trim().toUpperCase();
  const wishlist = loadWishlist();
  if (wishlist.some((row) => row.tag_number === tag)) {
    removeFromWishlist(tag);
    return false; // Removed
  } else {
    addToWishlist(item);
    return true; // Added
  }
}

export function isInWishlist(tagNumber: string): boolean {
  const tag = String(tagNumber || '').trim().toUpperCase();
  return loadWishlist().some((row) => row.tag_number === tag);
}

export function clearWishlist() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WISHLIST_KEY);
  emitWishlistChanged();
}
