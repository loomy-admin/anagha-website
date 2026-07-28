/** Shared header nav cache keys/events (storefront Header + admin picker). */

export const NAV_STORAGE_KEY = 'anagha_header_nav_v1';
/** Fired after admin save/reset so the storefront reloads tabs. */
export const HEADER_NAV_INVALIDATE_EVENT = 'anagha-header-nav-invalidate';

type NavCacheHolder = { current: unknown };

/** Module-level holder so Header can clear its in-memory cache from outside. */
const holder: NavCacheHolder = { current: null };

export function setHeaderNavMemoryCache(value: unknown) {
  holder.current = value;
}

export function getHeaderNavMemoryCache<T>(): T | null {
  return (holder.current as T) || null;
}

export function clearHeaderNavStorage() {
  holder.current = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(NAV_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear caches and notify any mounted Header to refetch. */
export function invalidateHeaderNavCache() {
  clearHeaderNavStorage();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HEADER_NAV_INVALIDATE_EVENT));
  }
}
