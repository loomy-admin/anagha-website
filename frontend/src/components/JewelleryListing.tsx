'use client';

import Link from 'next/link';
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  CatalogFilterOption,
  CatalogItem,
  fetchCatalog,
  fetchCatalogFilters,
  formatDisplayPrice,
  itemHref,
} from '@/lib/erpCatalog';

interface Props {
  /** ERP group slug from route. If undefined, show all. */
  category?: string;
  /** ERP audience type from ?type= (MEN / WOMEN / KIDS). */
  audience?: string;
  /** Pre-select article filter from ?article= */
  article?: string;
}

type SelectedArticle = {
  id?: string | null;
  name: string;
};

type ActiveFilters = {
  type?: string;
  group?: string;
  /** Multi-select — prefer article ids; ERP accepts `|` / `,` separated values. */
  articles: SelectedArticle[];
  purity?: string;
};

type FilterOptions = {
  type: CatalogFilterOption[];
  group: CatalogFilterOption[];
  article: CatalogFilterOption[];
  purity: CatalogFilterOption[];
};

function articleKey(item: { id?: string | null; name: string }) {
  const id = String(item.id || '').trim();
  if (id) return `id:${id}`;
  return `name:${String(item.name || '').trim().toLowerCase()}`;
}

function toggleArticle(list: SelectedArticle[], option: CatalogFilterOption): SelectedArticle[] {
  const key = articleKey(option);
  if (list.some((a) => articleKey(a) === key)) {
    return list.filter((a) => articleKey(a) !== key);
  }
  return [...list, { id: option.id || null, name: option.name }];
}

function mergeArticleOptions(
  options: CatalogFilterOption[],
  selected: SelectedArticle[],
): CatalogFilterOption[] {
  const map = new Map<string, CatalogFilterOption>();
  options.forEach((opt) => {
    const key = articleKey(opt);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...opt });
      return;
    }
    map.set(key, {
      ...prev,
      count:
        typeof prev.count === 'number' || typeof opt.count === 'number'
          ? (prev.count || 0) + (opt.count || 0)
          : prev.count,
    });
  });
  selected.forEach((sel) => {
    const key = articleKey(sel);
    if (!map.has(key)) {
      map.set(key, { id: sel.id, name: sel.name });
    }
  });
  return [...map.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

const FilterGroup = ({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: CatalogFilterOption[];
  selected?: string;
  onSelect: (name: string | undefined) => void;
}) => (
  <div>
    <h3 className="font-domine text-[#222] text-[16px] mb-4 font-bold border-b border-gray-100 pb-2">{title}</h3>
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-[12px] text-gray-400">No options</p>
      ) : (
        items.map((f) => {
          const isOn = selected === f.name;
          return (
            <button
              key={`${title}-${f.id || f.slug || f.name}`}
              type="button"
              onClick={() => {
                const next = isOn ? undefined : f.name;
                startTransition(() => onSelect(next));
              }}
              className="flex items-center gap-3 cursor-pointer group w-full text-left"
            >
              <div
                className={`w-4 h-4 border rounded-[2px] flex-shrink-0 transition-colors ${
                  isOn ? 'border-[#2e6da4] bg-[#2e6da4]' : 'border-gray-300 bg-white group-hover:border-[#2e6da4]'
                }`}
              />
              <span className={`text-[13px] ${isOn ? 'text-[#2e6da4] font-medium' : 'text-[#444]'}`}>
                {f.name}
                {typeof f.count === 'number' ? (
                  <span className="text-gray-400"> ({f.count})</span>
                ) : null}
              </span>
            </button>
          );
        })
      )}
    </div>
  </div>
);

const MultiFilterGroup = ({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: CatalogFilterOption[];
  selected: SelectedArticle[];
  onToggle: (option: CatalogFilterOption) => void;
}) => {
  const selectedKeys = new Set(selected.map(articleKey));
  return (
    <div>
      <h3 className="font-domine text-[#222] text-[16px] mb-4 font-bold border-b border-gray-100 pb-2">
        {title}
        {selected.length > 0 ? (
          <span className="ml-2 text-[11px] font-sans font-medium text-[#2e6da4]">
            {selected.length} selected
          </span>
        ) : null}
      </h3>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-[12px] text-gray-400">No options</p>
        ) : (
          items.map((f) => {
            const key = articleKey(f);
            const isOn = selectedKeys.has(key);
            return (
              <button
                key={`${title}-${key}`}
                type="button"
                onClick={() => startTransition(() => onToggle(f))}
                className="flex items-center gap-3 cursor-pointer group w-full text-left"
              >
                <div
                  className={`w-4 h-4 border rounded-[2px] flex-shrink-0 transition-colors ${
                    isOn ? 'border-[#2e6da4] bg-[#2e6da4]' : 'border-gray-300 bg-white group-hover:border-[#2e6da4]'
                  }`}
                />
                <span className={`text-[13px] ${isOn ? 'text-[#2e6da4] font-medium' : 'text-[#444]'}`}>
                  {f.name}
                  {typeof f.count === 'number' ? (
                    <span className="text-gray-400"> ({f.count})</span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

function FiltersBody({
  category,
  filterOptions,
  active,
  setActive,
  loading,
}: {
  category?: string;
  filterOptions: FilterOptions;
  active: ActiveFilters;
  setActive: Dispatch<SetStateAction<ActiveFilters>>;
  loading?: boolean;
}) {
  const articleOptions = mergeArticleOptions(filterOptions.article, active.articles);
  const hasAnyOptions =
    filterOptions.type.length > 0
    || (!category && filterOptions.group.length > 0)
    || articleOptions.length > 0
    || filterOptions.purity.length > 0;

  // Fixed shell so panel height does not jump between loading / loaded.
  return (
    <div className="relative h-full min-h-[420px]">
      {loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5">
          <div className="w-10 h-10 border-[3px] border-[#2e6da4] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-[12px] text-gray-500 font-medium">Loading filters…</span>
        </div>
      ) : !hasAnyOptions ? (
        <div className="absolute inset-0 flex items-center justify-center px-5">
          <p className="text-[13px] text-gray-400 text-center">No filters available</p>
        </div>
      ) : (
        <div className="p-5 space-y-8">
          {filterOptions.type.length > 0 ? (
            <FilterGroup
              title="Audience"
              items={filterOptions.type}
              selected={active.type}
              onSelect={(name) =>
                setActive((prev) => ({ ...prev, type: name, articles: [] }))
              }
            />
          ) : null}
          {!category && filterOptions.group.length > 0 ? (
            <FilterGroup
              title="Category"
              items={filterOptions.group}
              selected={active.group}
              onSelect={(name) =>
                setActive((prev) => ({ ...prev, group: name, articles: [] }))
              }
            />
          ) : null}
          {articleOptions.length > 0 ? (
            <MultiFilterGroup
              title="Article"
              items={articleOptions}
              selected={active.articles}
              onToggle={(option) =>
                setActive((prev) => ({
                  ...prev,
                  articles: toggleArticle(prev.articles, option),
                }))
              }
            />
          ) : null}
          {filterOptions.purity.length > 0 ? (
            <FilterGroup
              title="Purity"
              items={filterOptions.purity}
              selected={active.purity}
              onSelect={(name) => setActive((prev) => ({ ...prev, purity: name }))}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: CatalogItem }) {
  const priceLabel = formatDisplayPrice(product.display_price);
  const showPrice = product.display_price != null;

  return (
    <Link
      href={itemHref(product)}
      className="group flex flex-col bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 h-full"
    >
      <div className="relative w-full pt-[100%] bg-[#fafafa] overflow-hidden">
        <div className="absolute inset-0 p-4 sm:p-6 flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 mix-blend-multiply"
            />
          ) : (
            <div className="text-gray-300 text-sm text-center px-4">No image</div>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 items-start text-left bg-white">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap min-h-[24px]">
          <span className={`font-bold text-[15px] md:text-[16px] ${showPrice ? 'text-[#222]' : 'text-gray-500 text-[13px]'}`}>
            {priceLabel}
          </span>
        </div>
        <h3 className="text-[#666] text-[12px] md:text-[13px] line-clamp-2 leading-snug min-h-[38px] w-full">
          {product.name}
        </h3>
        <p className="text-[11px] text-gray-400 mt-1">
          {product.tag_number}
          {product.purity ? ` · ${product.purity}` : ''}
        </p>
      </div>
    </Link>
  );
}

function countActiveFilters(active: ActiveFilters, category?: string) {
  let n = 0;
  if (active.type) n += 1;
  if (!category && active.group) n += 1;
  n += active.articles.length;
  if (active.purity) n += 1;
  return n;
}

type ListingCacheEntry = {
  items: CatalogItem[];
  total: number;
  filterOptions: FilterOptions;
  at: number;
};

/** Survives client navigations so /jewellery does not flash the full-page loader. */
const listingCache = new Map<string, ListingCacheEntry>();
const LISTING_CACHE_TTL_MS = 15 * 60 * 1000;
const EMPTY_FILTER_OPTIONS: FilterOptions = {
  type: [],
  group: [],
  article: [],
  purity: [],
};

function listingCacheKey(
  category: string | undefined,
  active: ActiveFilters,
  audience?: string,
) {
  return JSON.stringify({
    category: category || '',
    audience: audience || '',
    type: active.type || '',
    group: active.group || '',
    articles: active.articles.map(articleKey).sort(),
    purity: active.purity || '',
  });
}

function readListingCache(key: string): ListingCacheEntry | null {
  const hit = listingCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > LISTING_CACHE_TTL_MS) {
    listingCache.delete(key);
    return null;
  }
  return hit;
}

function normalizeAudience(raw?: string) {
  const value = String(raw || '').trim().toUpperCase();
  if (value === 'MEN' || value === 'WOMEN' || value === 'KIDS') return value;
  return undefined;
}

function readInitialListing(category?: string, audience?: string) {
  const type = normalizeAudience(audience);
  if (typeof window === 'undefined') {
    return {
      items: [] as CatalogItem[],
      total: 0,
      filterOptions: EMPTY_FILTER_OPTIONS,
      loading: true,
      hasLoaded: false,
      type,
    };
  }
  const hit = readListingCache(
    listingCacheKey(category, { articles: [], type }, audience),
  );
  if (!hit) {
    return {
      items: [] as CatalogItem[],
      total: 0,
      filterOptions: EMPTY_FILTER_OPTIONS,
      loading: true,
      hasLoaded: false,
      type,
    };
  }
  return {
    items: hit.items,
    total: hit.total,
    filterOptions: hit.filterOptions,
    loading: false,
    hasLoaded: true,
    type,
  };
}

export default function JewelleryListing({ category, audience, article }: Props) {
  const audienceType = normalizeAudience(audience);
  const articleName = String(article || '').trim();
  const [active, setActive] = useState<ActiveFilters>(() => ({
    articles: articleName ? [{ name: articleName }] : [],
    type: audienceType,
  }));
  const cacheKey = listingCacheKey(category, active, audienceType);
  const [boot] = useState(() => readInitialListing(category, audienceType));

  const [items, setItems] = useState<CatalogItem[]>(boot.items);
  const [total, setTotal] = useState(boot.total);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(boot.filterOptions);
  const [initialLoading, setInitialLoading] = useState(boot.loading);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasLoadedRef = useRef(boot.hasLoaded);
  const requestIdRef = useRef(0);

  // Keep article filter in sync when arriving from header mega-menu links
  useEffect(() => {
    if (!articleName) return;
    setActive((prev) => {
      if (prev.articles.some((a) => a.name.toLowerCase() === articleName.toLowerCase())) {
        return prev;
      }
      return { ...prev, articles: [{ name: articleName }] };
    });
  }, [articleName]);

  // Restore cached listing before paint when filters / category key changes
  useLayoutEffect(() => {
    const hit = readListingCache(cacheKey);
    if (!hit) return;
    setItems(hit.items);
    setTotal(hit.total);
    setFilterOptions(hit.filterOptions);
    hasLoadedRef.current = true;
    setInitialLoading(false);
  }, [cacheKey]);

  const activeCount = countActiveFilters(active, category);

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      limit: 48,
      offset: 0,
    };
    if (active.group) params.group = active.group;
    else if (category) params.group = category;
    if (active.type) params.type = active.type;
    else if (audienceType) params.type = audienceType;
    if (active.articles.length) {
      const ids = active.articles.map((a) => String(a.id || '').trim()).filter(Boolean);
      const names = active.articles
        .filter((a) => !String(a.id || '').trim())
        .map((a) => a.name.trim())
        .filter(Boolean);
      // Prefer ids so duplicate article names stay independently selectable.
      if (ids.length) params.article_id = ids.join('|');
      if (names.length) params.article = names.join('|');
    }
    if (active.purity) params.purity = active.purity;
    return params;
  }, [active, category, audienceType]);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const key = listingCacheKey(category, active, audienceType);
    const hit = readListingCache(key);

    // Soft revisit: show cache immediately, refresh in background with zero loaders
    if (hit) {
      setItems(hit.items);
      setTotal(hit.total);
      setFilterOptions(hit.filterOptions);
      hasLoadedRef.current = true;
      setInitialLoading(false);
    } else if (!hasLoadedRef.current) {
      setInitialLoading(true);
    }
    setError(null);

    try {
      const filterQuery: Record<string, string | undefined> = {};
      if (active.group) filterQuery.group = active.group;
      else if (category) filterQuery.group = category;
      if (active.type) filterQuery.type = active.type;
      else if (audienceType) filterQuery.type = audienceType;

      const [catalog, filtersPayload] = await Promise.all([
        fetchCatalog(queryParams),
        fetchCatalogFilters(filterQuery),
      ]);

      // Ignore stale responses when filters change quickly
      if (requestId !== requestIdRef.current) return;

      const nextFilters: FilterOptions = {
        type: filtersPayload.filters.type || [],
        group: filtersPayload.filters.group || [],
        article: filtersPayload.filters.article || [],
        purity: filtersPayload.filters.purity || [],
      };
      const nextItems = catalog.items || [];
      const nextTotal = catalog.total || 0;

      setItems(nextItems);
      setTotal(nextTotal);
      setFilterOptions(nextFilters);
      hasLoadedRef.current = true;
      listingCache.set(key, {
        items: nextItems,
        total: nextTotal,
        filterOptions: nextFilters,
        at: Date.now(),
      });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (!hasLoadedRef.current) {
        setItems([]);
        setTotal(0);
      }
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      if (requestId === requestIdRef.current) {
        setInitialLoading(false);
      }
    }
  }, [queryParams, active, category, audienceType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const clearFilters = () =>
    startTransition(() => setActive({ articles: [], type: audienceType }));

  return (
    <main className="w-full bg-[#f9f9f9] min-h-screen font-sans pb-24 lg:pb-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-6">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-[280px] shrink-0 bg-white shadow-sm border border-gray-100 sticky top-24 h-[calc(100vh-120px)] overflow-hidden">
            <div className="bg-[#2e6da4] text-white px-4 py-3 font-medium tracking-wide shrink-0 z-10 flex items-center justify-between">
              <span>FILTERS</span>
              {activeCount > 0 ? (
                <button
                  type="button"
                  className="text-[11px] uppercase tracking-wide opacity-90 hover:opacity-100"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <FiltersBody
                category={category}
                filterOptions={filterOptions}
                active={active}
                setActive={setActive}
                loading={initialLoading}
              />
            </div>
          </aside>

          {/* Product grid — full width on mobile; keep layout stable while refreshing */}
          <div className="flex-1 w-full min-w-0 relative">
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-12 h-12 border-4 border-[#2e6da4] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-medium">Loading live inventory...</p>
              </div>
            ) : error && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                <h2 className="text-xl font-domine text-gray-500 mb-2">Catalog unavailable</h2>
                <p className="text-gray-400 text-sm max-w-md">{error}</p>
                <p className="text-gray-400 text-xs mt-3">
                  Ensure Anagha backend has ERP_API_URL and ERP_STORE_SLUG configured.
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <h2 className="text-xl font-domine text-gray-400 mb-2">No products found</h2>
                <p className="text-gray-400 text-sm">No available items match these filters.</p>
                <Link href="/jewellery" className="mt-6 text-[#2e6da4] text-sm font-medium hover:underline">
                  Browse All Jewellery →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {items.map((product) => (
                  <ProductCard key={product.id || product.tag_number} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom Filters tab */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-[60] pointer-events-none">
        <div
          className="pointer-events-auto border-t border-gray-200 bg-white/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[#032C5E] font-semibold text-[13px] uppercase tracking-widest"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 5h16M7 12h10M10 19h4" strokeLinecap="round" />
            </svg>
            Filters
            {activeCount > 0 ? (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#2e6da4] text-white text-[11px] font-bold flex items-center justify-center">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Mobile filters bottom sheet */}
      {filtersOpen ? (
        <div className="lg:hidden fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[85vh] flex flex-col bg-white rounded-t-2xl shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <span className="font-domine text-[#032C5E] text-lg font-bold">Filters</span>
                {activeCount > 0 ? (
                  <span className="text-[12px] text-gray-400">{activeCount} applied</span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {activeCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[12px] font-semibold uppercase tracking-wide text-[#2e6da4]"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 min-h-[50vh] overscroll-contain">
              <FiltersBody
                category={category}
                filterOptions={filterOptions}
                active={active}
                setActive={setActive}
                loading={initialLoading}
              />
            </div>
            <div className="shrink-0 border-t border-gray-100 p-4 bg-white">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="w-full bg-[#032C5E] text-white font-bold text-[12px] uppercase tracking-widest py-3.5 rounded-full"
              >
                Show {total} result{total === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
