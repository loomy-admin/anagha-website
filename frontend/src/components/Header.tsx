'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { fetchCatalogFilters, type CatalogFilterOption } from '@/lib/erpCatalog';
import { fetchMe, logoutAccount, syncCustomerData, type WebsiteCustomer } from '@/lib/auth';
import { CART_CHANGED_EVENT, getCartCount, clearCart, mergeCart, loadCart } from '@/lib/checkout';
import { WISHLIST_CHANGED_EVENT, getWishlistCount, clearWishlist, mergeWishlist, loadWishlist } from '@/lib/wishlist';
import SearchSuggestions from './SearchSuggestions';
import { useContactInfo } from '@/lib/contact';
import {
  HEADER_NAV_INVALIDATE_EVENT,
  NAV_STORAGE_KEY,
  getHeaderNavMemoryCache,
  setHeaderNavMemoryCache,
  clearHeaderNavStorage,
} from '@/lib/headerNavCache';

type NavDropdown = {
  articles: Array<{ name: string; slug?: string }>;
  callout: { title: string; desc: string; image: string };
};

type NavItem = {
  label: string;
  slug: string;
  dropdown?: NavDropdown | null;
};

const NAV_BAR_LIMIT = 8;

/** Hardcoded for now — wiring TBD. */
const PRICE_RANGES = [
  { label: 'Below 10,000', max: 10000 },
  { label: 'Between 10k-20k', min: 10000, max: 20000 },
  { label: 'Between 20k-30k', min: 20000, max: 30000 },
  { label: 'Between 30k-40k', min: 30000, max: 40000 },
  { label: 'Between 40k-50k', min: 40000, max: 50000 },
  { label: '50,000 and above', min: 50000 },
];

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const HeartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);
const BagIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m-3 0h13.5l-1.2 9H6.45l-1.2-9z"
    />
  </svg>
);
const WhatsAppIcon = () => (
  <svg className="w-[22px] h-[22px]" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const VDIV = 'w-px h-[14px] bg-gray-300 shrink-0 mx-1.5 xl:mx-2';
const ITEM3 =
  'flex items-center justify-center text-[10px] xl:text-[12px] text-gray-700 cursor-pointer whitespace-nowrap w-auto xl:w-[60px]';
const ITEM4 =
  'flex items-center justify-center text-[10px] xl:text-[12px] text-gray-700 cursor-pointer whitespace-nowrap w-auto xl:w-[60px]';

function toNavItem(g: CatalogFilterOption): NavItem {
  const slug = g.slug || String(g.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { label: String(g.name).toUpperCase(), slug };
}

function sortByCountDesc(groups: CatalogFilterOption[]) {
  return [...groups].sort((a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name));
}

type NavCache = {
  navItems: NavItem[];
  allGroups: Array<{ label: string; slug: string }>;
  at: number;
};
const ALL_JEWELLERY: NavItem = { label: 'ALL JEWELLERY', slug: 'all-jewellery', dropdown: null };
/** undefined = not fetched yet; null = signed out */
let customerCache: WebsiteCustomer | null | undefined = undefined;

function readStoredNav(): NavCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavCache;
    if (!Array.isArray(parsed?.navItems) || !parsed.navItems.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredNav(cache: NavCache) {
  setHeaderNavMemoryCache(cache);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota */
  }
}

function readNavCache(): NavCache | null {
  return getHeaderNavMemoryCache<NavCache>() || readStoredNav();
}

function articlesFromDropdown(dd: Record<string, unknown> | null): Array<{ name: string; slug?: string }> {
  if (!dd) return [];
  const raw = Array.isArray(dd.articles)
    ? dd.articles
    : dd.categories &&
        typeof dd.categories === 'object' &&
        Array.isArray((dd.categories as { items?: unknown }).items)
      ? ((dd.categories as { items: unknown[] }).items)
      : [];
  return raw
    .map((a) => {
      if (!a || typeof a !== 'object') return null;
      const name = String((a as { name?: string }).name || '').trim();
      if (!name) return null;
      const slug = (a as { slug?: string }).slug ? String((a as { slug?: string }).slug) : undefined;
      return { name, slug };
    })
    .filter(Boolean) as Array<{ name: string; slug?: string }>;
}

function navFromHeaderGroups(selected: unknown): NavItem[] {
  if (!Array.isArray(selected) || !selected.length) return [];
  const picked: NavItem[] = [];
  for (const row of selected) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const slug = String(r.slug || '')
      .trim()
      .toLowerCase();
    const label = String(r.label || slug)
      .trim()
      .toUpperCase();
    if (!slug) continue;
    const dd =
      r.dropdown && typeof r.dropdown === 'object'
        ? (r.dropdown as Record<string, unknown>)
        : null;
    const callout =
      dd?.callout && typeof dd.callout === 'object'
        ? (dd.callout as Record<string, unknown>)
        : {};
    const dropdown = dd
      ? {
          articles: articlesFromDropdown(dd),
          callout: {
            title: String(callout.title || ''),
            desc: String(callout.desc || ''),
            image: String(callout.image || ''),
          },
        }
      : null;
    picked.push({ label, slug, dropdown });
    if (picked.length >= NAV_BAR_LIMIT) break;
  }
  return picked;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { whatsapp } = useContactInfo();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([ALL_JEWELLERY]);
  const [allGroups, setAllGroups] = useState<Array<{ label: string; slug: string }>>([]);
  const [customer, setCustomer] = useState<WebsiteCustomer | null>(() => 
    customerCache === undefined ? null : customerCache
  );
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const closeSuggestions = useCallback(() => setSuggestionsOpen(false), []);

  const onSuggestionNavigate = useCallback(
    (href: string) => {
      // Do not synchronously close the suggestions here!
      // This allows the element to stay mounted to catch the 'click' event (preventing fall-through)
      // and keeps the UI visible while Next.js fetches the new page.
      // The useEffect on [pathname] will automatically close it once navigation completes.
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    setMobileMenuOpen(false);
    setSuggestionsOpen(false);
    // Only clear search input if we aren't explicitly on a search results page
    if (typeof window !== 'undefined' && !window.location.search.includes('search=')) {
      setSearchQuery('');
    }
  }, [pathname]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuggestionsOpen(false);
    const q = searchQuery.trim();
    setMobileMenuOpen(false);
    if (!q) {
      router.push('/jewellery');
      return;
    }
    router.push(`/jewellery?search=${encodeURIComponent(q)}`);
  }

  function onClearSearch() {
    setSearchQuery('');
    setSuggestionsOpen(false);
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/jewellery') && window.location.search.includes('search=')) {
      router.push('/jewellery');
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get('search');
      if (s) setSearchQuery(s);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        customerCache = me;
        if (!cancelled) setCustomer(me);
        if (!me) return;
        // Merge carts and sync back if we just logged in / fetched
        // The merge functions will emit events which trigger the sync back to the server
        mergeCart((me.cart as any[]) || []);
        mergeWishlist((me.wishlist as any[]) || []);
      })
      .catch(() => {
        customerCache = null;
        if (!cancelled) setCustomer(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function syncCart() {
      setCartCount(getCartCount());
      if (customerCache) {
        syncCustomerData(loadCart(), null).catch(() => {});
      }
    }
    function syncWishlist() {
      setWishlistCount(getWishlistCount());
      if (customerCache) {
        syncCustomerData(null, loadWishlist()).catch(() => {});
      }
    }
    syncCart();
    syncWishlist();
    window.addEventListener(CART_CHANGED_EVENT, syncCart);
    window.addEventListener(WISHLIST_CHANGED_EVENT, syncWishlist);
    window.addEventListener('storage', syncCart);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, syncCart);
      window.removeEventListener(WISHLIST_CHANGED_EVENT, syncWishlist);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  async function onSignOut() {
    try {
      await logoutAccount();
      clearCart();
      clearWishlist();
      customerCache = null;
      setCustomer(null);
      router.refresh();
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let cancelled = false;
    const existing = readNavCache();
    if (existing) {
      setAllGroups(existing.allGroups);
      setNavItems(existing.navItems);
    }

    async function loadNav() {
      try {
        // Always revalidate — admin header saves must show up immediately.
        const headerCfg = await fetch('/api/site/header', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : { selectedGroups: [] }))
          .catch(() => ({ selectedGroups: [] }));
        if (cancelled) return;

        let picked = navFromHeaderGroups(headerCfg?.selectedGroups);
        let nextAll = existing?.allGroups || [];

        // Paint admin tabs immediately — never wait on ERP catalog for the bar.
        if (picked.length) {
          const adminNav = [...picked, ALL_JEWELLERY];
          setNavItems(adminNav);
          writeStoredNav({
            navItems: adminNav,
            allGroups: nextAll,
            at: Date.now(),
          });
        }

        // Catalog only fills All Jewellery + empty-admin fallback.
        try {
          const payload = await fetchCatalogFilters();
          if (cancelled) return;
          const groups = sortByCountDesc(payload.filters?.group || []);
          const mapped = groups.map(toNavItem).filter((g) => g.slug);
          nextAll = mapped.map((g) => ({ label: g.label, slug: g.slug }));
          if (!picked.length) {
            picked = mapped.slice(0, NAV_BAR_LIMIT).map((g) => ({ ...g, dropdown: null }));
          }
        } catch {
          /* keep admin tabs even if catalog is slow/down */
        }

        const nextNav: NavItem[] = [...picked, ALL_JEWELLERY];
        writeStoredNav({ navItems: nextNav, allGroups: nextAll, at: Date.now() });
        setAllGroups(nextAll);
        setNavItems(nextNav);
      } catch {
        if (!cancelled && !readNavCache()) {
          setNavItems([ALL_JEWELLERY]);
        }
      }
    }

    function onInvalidate() {
      clearHeaderNavStorage();
      void loadNav();
    }

    loadNav();
    window.addEventListener(HEADER_NAV_INVALIDATE_EVENT, onInvalidate);
    return () => {
      cancelled = true;
      window.removeEventListener(HEADER_NAV_INVALIDATE_EVENT, onInvalidate);
    };
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      {/* Mobile header */}
      <div className="flex flex-col lg:hidden bg-white shrink-0 sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <button aria-label="Menu" className="text-navy" onClick={() => setMobileMenuOpen(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <a
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-[#f1592a] hover:bg-[#f1592a] hover:text-white hover:border-[#f1592a] transition-all"
            >
              <WhatsAppIcon />
            </a>
            <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-300 flex items-center justify-center bg-white shrink-0">
              <img
                src="/images/logo_icon.png"
                alt="Logo"
                className="w-full h-full object-contain [clip-path:circle(47%)] scale-[0.85]"
              />
            </div>
          </div>
          <Link href="/" className="flex items-center">
            <Image
              src="/images/brand_logo.png"
              alt="Anagha"
              width={120}
              height={40}
              className="h-10 w-auto object-contain [clip-path:inset(1px_4px)]"
              style={{ width: 'auto' }}
              priority
            />
          </Link>
          <div className="flex items-center gap-4 text-navy">
            <Link href="/wishlist" aria-label="Wishlist" className="relative inline-flex hover:text-coral transition-colors">
              <HeartIcon />
              {wishlistCount > 0 ? (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#f1592a] text-white text-[9px] flex items-center justify-center font-bold">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              ) : null}
            </Link>
            <Link href="/cart" aria-label="Shopping cart" className="relative inline-flex hover:text-coral transition-colors">
              <BagIcon />
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#f1592a] text-white text-[9px] flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              ) : null}
            </Link>
          </div>
        </div>

        {/* Mobile quick search bar */}
        <div className="px-3 pb-2.5" ref={mobileSearchRef}>
          <form
            onSubmit={onSearchSubmit}
            className="flex items-center border border-gray-200 rounded-full bg-gray-50 px-3 py-1.5 shadow-inner"
          >
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSuggestionsOpen(true);
              }}
              onFocus={() => { setSuggestionsOpen(true); }}
              placeholder="Search jewellery, gold, silver..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[12.5px] text-gray-800 placeholder-gray-400 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="p-1 text-gray-400 hover:text-gray-600 mr-1"
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
            <button
              type="submit"
              aria-label="Search"
              className="w-6 h-6 rounded-full bg-coral text-white flex items-center justify-center shrink-0"
            >
              <SearchIcon />
            </button>
          </form>
          <SearchSuggestions
            query={searchQuery}
            visible={suggestionsOpen}
            onClose={closeSuggestions}
            onNavigate={onSuggestionNavigate}
            variant="mobile"
          />
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-[200] flex flex-col lg:hidden overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-300">
            <Image
              src="/images/brand_logo.png"
              alt="Anagha"
              width={120}
              height={40}
              className="h-10 w-auto object-contain [clip-path:inset(1px_4px)]"
              style={{ width: 'auto' }}
            />
            <button aria-label="Close Menu" onClick={() => setMobileMenuOpen(false)} className="text-navy p-1">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search inside mobile menu */}
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <form onSubmit={onSearchSubmit} className="flex border border-gray-300 rounded overflow-hidden bg-white">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Jewellery..."
                className="flex-1 px-3 py-2 text-[13px] border-none outline-none text-gray-800"
              />
              <button type="submit" className="bg-coral text-white px-4 flex items-center justify-center">
                <SearchIcon />
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-4 text-[12px] font-semibold text-navy">
              <Link href="/cart" onClick={() => setMobileMenuOpen(false)}>
                Cart{cartCount > 0 ? ` (${cartCount})` : ''}
              </Link>
              {customer ? (
                <>
                  <Link href="/account/orders" onClick={() => setMobileMenuOpen(false)}>
                    My Account
                  </Link>
                  <button type="button" onClick={() => { setMobileMenuOpen(false); onSignOut(); }}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/account/login" onClick={() => setMobileMenuOpen(false)}>
                    Sign in
                  </Link>
                  <Link href="/account/signup" onClick={() => setMobileMenuOpen(false)}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
            <ul className="flex flex-col">
                {(allGroups.length
                  ? allGroups
                  : navItems.filter((n) => n.slug !== 'all-jewellery')
                ).map((item) => (
                  <li key={item.slug} className="border-b border-gray-50">
                    <Link
                      href={`/jewellery/${item.slug}`}
                      className="block px-6 py-4 text-navy font-semibold text-[12px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li className="border-b border-gray-50">
                  <Link
                    href="/jewellery"
                    className="block px-6 py-4 text-navy font-semibold text-[12px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ALL JEWELLERY
                  </Link>
                </li>
              </ul>
          </div>
        </div>
      )}

      {/* Desktop white top */}
      <div className="bg-white hidden lg:block overflow-x-clip w-full max-w-[100vw]">
        <div className="flex items-end h-[76px] pl-[120px] xl:pl-[130px] pr-4 xl:pr-10 pb-[10px]">
          <Link href="/" className="flex items-center shrink-0 translate-y-2.5">
            <Image
              src="/images/brand_logo.png"
              alt="Anagha"
              width={280}
              height={80}
              className="h-[50px] xl:h-[60px] w-auto object-contain [clip-path:inset(1px_4px)]"
              style={{ width: 'auto' }}
              priority
            />
          </Link>

          <div 
            className="relative max-w-[300px] xl:max-w-[480px] shrink-0 mx-auto mb-0.5 w-full" 
            ref={desktopSearchRef}
            onMouseEnter={() => setSuggestionsOpen(true)}
            onMouseLeave={() => {
              if (document.activeElement?.id !== 'desktop-search-input') {
                setSuggestionsOpen(false);
              }
            }}
          >
            <form
              onSubmit={onSearchSubmit}
              className="flex border border-gray-300 rounded overflow-hidden w-full focus-within:border-navy focus-within:ring-1 focus-within:ring-navy transition-all"
            >
              <input
                id="desktop-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => { setSuggestionsOpen(true); }}
                placeholder="Search for Jewellery"
                className="flex-1 min-w-0 border-none outline-none px-3 py-[7px] text-[13px] text-gray-700 placeholder-gray-400 bg-white [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="px-2 text-gray-400 hover:text-gray-600 bg-white text-xs"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : null}
              <button
                type="submit"
                aria-label="Search"
                className="bg-coral hover:bg-coralDark text-white px-4 flex items-center shrink-0 border-none cursor-pointer transition-colors"
              >
                <SearchIcon />
              </button>
            </form>
            <SearchSuggestions
              query={searchQuery}
              visible={suggestionsOpen}
              onClose={closeSuggestions}
              onNavigate={onSuggestionNavigate}
              variant="desktop"
            />
          </div>

          <div className="flex flex-col items-end ml-auto shrink-0 gap-y-[3px]">
            <div className="flex items-center h-[33px]">
              {customer ? (
                <>
                  {customer.is_admin ? (
                    <>
                      <Link href="/upload" className={`${ITEM3} hover:text-navy`}>
                        Admin
                      </Link>
                      <span className={VDIV} />
                    </>
                  ) : null}
                  <Link
                    href="/account/orders"
                    className={`${ITEM3} text-navy font-semibold max-w-[120px] truncate hover:text-[#f1592a]`}
                    title={customer.email}
                  >
                    {customer.name.split(' ')[0]}
                  </Link>
                  <span className={VDIV} />
                  <button type="button" onClick={onSignOut} className={`${ITEM4} hover:text-navy`}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/account/login" className={`${ITEM3} hover:text-navy`}>
                    Sign in
                  </Link>
                  <span className={VDIV} />
                  <Link href="/account/signup" className={`${ITEM4} hover:text-navy`}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
            <div className="flex items-center h-[33px]">
              <Link
                href="#"
                className="flex flex-row items-center justify-center gap-2 bg-[#25D366] text-white font-bold text-[10px] xl:text-[11px] leading-tight cursor-pointer whitespace-nowrap w-auto px-4 py-1.5 rounded-full shadow-sm transition-all"
              >
                <WhatsAppIcon />
                <span>
                  Connect
                  <br />
                  With Us
                </span>
              </Link>
              <span className={VDIV} />
              <Link href="/wishlist" className={`${ITEM3} relative mr-3 hover:text-coral transition-colors`} aria-label="Wishlist">
                <span className="relative inline-flex text-navy">
                  <HeartIcon />
                  {wishlistCount > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#f1592a] text-white text-[9px] flex items-center justify-center font-bold shadow-sm">
                      {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                  ) : null}
                </span>
              </Link>
              <Link href="/cart" className={`${ITEM3} relative hover:text-coral transition-colors`} aria-label="Shopping cart">
                <span className="relative inline-flex text-navy">
                  <BagIcon />
                  {cartCount > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#f1592a] text-white text-[9px] flex items-center justify-center font-bold shadow-sm">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop navy nav — ERP groups */}
      <nav className="sticky top-0 z-50 bg-navy h-[46px] hidden lg:flex items-center px-10 overflow-x-clip w-full max-w-[100vw]">
        <div
          className={`absolute left-10 z-50 transition-all duration-300 ease-in-out origin-top-left bg-white rounded-full overflow-hidden shadow-sm flex items-center justify-center ${
            scrolled ? 'w-[30px] h-[30px] top-[8px]' : 'w-[75px] h-[75px] -top-[64px]'
          }`}
        >
          <Image
            src="/images/logo_icon.png"
            alt="Anagha"
            width={75}
            height={75}
            className="w-full h-full object-contain [clip-path:circle(47%)] scale-[0.85]"
            priority
          />
        </div>

        <ul className="flex items-center h-full w-full justify-center gap-2 xl:gap-5 list-none pl-10">
          {navItems.map((item) => {
              const isAll = item.slug === 'all-jewellery';
              const hasMega = !isAll;
              const articles = item.dropdown?.articles || [];
              const callout = item.dropdown?.callout;
              return (
                <li
                  key={item.slug}
                  className="group relative flex items-center h-full px-1 text-white text-[10.5px] xl:text-[12px] font-medium whitespace-nowrap hover:bg-white/10 transition-colors"
                >
                  <Link
                    href={isAll ? '/jewellery' : `/jewellery/${item.slug}`}
                    className="flex items-center gap-1 h-full"
                  >
                    {item.label}
                    <span className="text-[13px] xl:text-[15px] leading-none">▾</span>
                  </Link>

                  {isAll && allGroups.length > 0 ? (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-2xl w-[520px] max-h-[70vh] overflow-y-auto py-6 rounded-b-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] border-t-2 border-navy">
                      <div className="px-8">
                        <h4 className="text-navy font-bold text-[14px] mb-4 border-b border-gray-200 pb-2">
                          Shop by category
                        </h4>
                        <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                          {allGroups.map((g) => (
                            <li key={g.slug}>
                              <Link
                                href={`/jewellery/${g.slug}`}
                                className="text-[#334155] text-[13px] hover:text-[#f1592a] transition-colors"
                              >
                                {g.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <Link
                          href="/jewellery"
                          className="inline-block mt-5 text-[12px] font-semibold text-navy hover:text-[#f1592a]"
                        >
                          View all jewellery →
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {hasMega ? (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white shadow-2xl w-[640px] max-w-[90vw] py-6 rounded-b-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] border-t-2 border-navy">
                      <div className="px-8 grid grid-cols-2 gap-10">
                        <div>
                          <h4 className="text-navy font-bold text-[14px] mb-3 border-b border-gray-200 pb-2">
                            By Price Range
                          </h4>
                          <ul className="space-y-2.5">
                            {PRICE_RANGES.map((p) => {
                              const params = new URLSearchParams();
                              if (p.min) params.set('price_min', String(p.min));
                              if (p.max) params.set('price_max', String(p.max));
                              return (
                              <li key={p.label}>
                                <Link 
                                  href={`/jewellery/${item.slug}?${params.toString()}`}
                                  className="text-[#334155] text-[13px] hover:text-[#f1592a] transition-colors"
                                >
                                  {p.label}
                                </Link>
                              </li>
                              );
                            })}
                          </ul>
                          <Link
                            href={`/jewellery/${item.slug}`}
                            className="inline-flex mt-6 border border-navy text-navy text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-md hover:bg-navy hover:text-white transition-colors"
                          >
                            View All {item.label}
                          </Link>
                        </div>
                        <div>
                          <h4 className="text-navy font-bold text-[14px] mb-3 border-b border-gray-200 pb-2">
                            By Categories
                          </h4>
                          {articles.length ? (
                            <ul className="space-y-2.5 mb-6">
                              {articles.map((a) => (
                                <li key={a.name}>
                                  <Link
                                    href={`/jewellery/${item.slug}?article=${encodeURIComponent(a.name)}`}
                                    className="text-[#334155] text-[13px] hover:text-[#f1592a] transition-colors"
                                  >
                                    {a.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[12px] text-gray-400 mb-6">No articles configured</p>
                          )}
                          {callout && (callout.title || callout.image || callout.desc) ? (
                            <div className="border-t border-gray-200 pt-4 flex items-center gap-4">
                              <div className="min-w-0 flex-1">
                                {callout.title ? (
                                  <p className="text-navy font-bold text-[14px] leading-snug">
                                    {callout.title}
                                  </p>
                                ) : null}
                                {callout.desc ? (
                                  <p className="text-[12px] text-gray-500 mt-1">{callout.desc}</p>
                                ) : null}
                              </div>
                              {callout.image ? (
                                <img
                                  src={callout.image}
                                  alt=""
                                  className="w-20 h-20 object-contain shrink-0"
                                />
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
        </ul>
      </nav>
    </>
  );
}
