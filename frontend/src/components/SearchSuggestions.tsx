'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchSearchSuggestions,
  formatDisplayPrice,
  type SearchSuggestionCategory,
  type SearchSuggestionProduct,
} from '@/lib/erpCatalog';

interface Props {
  query: string;
  visible: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  /** Position variant */
  variant?: 'desktop' | 'mobile';
}

function productHref(p: SearchSuggestionProduct) {
  const groupSlug = p.group_slug || 'item';
  return `/jewellery/${encodeURIComponent(groupSlug)}/${encodeURIComponent(p.tag_number)}`;
}

const TAG_ICON = (
  <svg className="w-4 h-4 text-coral shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const ARROW_ICON = (
  <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

export default function SearchSuggestions({ query, visible, onClose, onNavigate, variant = 'desktop' }: Props) {
  const [results, setResults] = useState<{
    products: SearchSuggestionProduct[];
    categories: SearchSuggestionCategory[];
  }>({ products: [], categories: [] });
  const [defaultResults, setDefaultResults] = useState<{
    products: SearchSuggestionProduct[];
    categories: SearchSuggestionCategory[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);

  // Prefetch default results
  useEffect(() => {
    fetchSearchSuggestions('').then((data) => setDefaultResults(data)).catch(() => {});
  }, []);

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (!visible) {
      setResults({ products: [], categories: [] });
      setActiveIndex(-1);
      return;
    }

    if (q.length < 2) {
      setResults({ products: [], categories: [] });
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    const id = ++fetchIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const data = await fetchSearchSuggestions(q);
        if (id === fetchIdRef.current) {
          setResults(data);
          setActiveIndex(-1);
        }
      } catch {
        /* silent */
      } finally {
        if (id === fetchIdRef.current) setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, visible]);

  // Close on click-outside
  useEffect(() => {
    if (!visible) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mouseup', handleClick);
    return () => document.removeEventListener('mouseup', handleClick);
  }, [visible, onClose]);

  // Build flat list of navigable items for keyboard nav
  const allItems = useCallback(() => {
    const items: { type: 'category' | 'product' | 'viewall'; href: string }[] = [];
    results.categories.forEach((c) => {
      items.push({ type: 'category', href: `/jewellery/${c.slug}` });
    });
    results.products.forEach((p) => {
      items.push({ type: 'product', href: productHref(p) });
    });
    if (results.categories.length > 0 || results.products.length > 0) {
      items.push({ type: 'viewall', href: `/jewellery?search=${encodeURIComponent(query.trim())}` });
    }
    return items;
  }, [results, query]);

  // Keyboard handler — called from parent via ref
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = allItems();
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        onNavigate(items[activeIndex].href);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [allItems, activeIndex, onNavigate, onClose],
  );

  const trimmedQuery = query.trim();
  const hasResults = results.categories.length > 0 || results.products.length > 0;
  const showDropdown = visible; // Always show if visible

  if (!showDropdown) return null;

  const isMobile = variant === 'mobile';
  let flatIdx = -1;

  const renderDefaultSuggestions = () => {
    if (!defaultResults) return (
      <div className="h-0.5 w-full bg-gray-100 overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-coral to-[#f7a98b] rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
      </div>
    );
    return (
      <div className="p-4 space-y-6 animate-[searchDropIn_0.2s_ease-out]">
        {/* Trending */}
        {defaultResults.categories.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3">Trending</h4>
            <div className="flex flex-wrap gap-2">
              {defaultResults.categories.map((t) => (
                <Link
                  key={t.slug}
                  href={`/jewellery/${t.slug}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onNavigate(`/jewellery/${t.slug}`);
                  }}
                  onClick={(e) => e.preventDefault()}
                  className="px-3 py-1.5 bg-gray-50 text-gray-700 text-[13px] rounded-md hover:bg-gray-100 border border-gray-100 transition-colors"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* What's new */}
        {defaultResults.products.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3">What's new</h4>
            <div className="grid grid-cols-3 gap-4">
              {defaultResults.products.map((p, index) => {
                const href = productHref(p);
                return (
                  <Link 
                    key={`${p.tag_number}-${index}`}
                    href={href}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onNavigate(href);
                    }}
                    onClick={(e) => e.preventDefault()}
                    className="group flex flex-col gap-2"
                  >
                    <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden relative border border-gray-100 flex items-center justify-center">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-[12px] font-medium text-gray-800 text-center leading-snug line-clamp-2" title={p.name}>{p.name}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`
        ${isMobile ? 'relative w-full' : 'absolute left-0 right-0 top-full mt-1 z-[200]'}
      `}
    >
      <div
        className={`
          bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden
          ${isMobile ? 'rounded-t-none border-t-0' : ''}
          animate-[searchDropIn_0.2s_ease-out]
        `}
        style={{
          maxHeight: isMobile ? '60vh' : '420px',
          overflowY: 'auto',
        }}
      >
        {/* Default State */}
        {!loading && trimmedQuery.length < 2 && renderDefaultSuggestions()}

        {/* Loading bar */}
        {loading && trimmedQuery.length >= 2 && (
          <div className="h-0.5 w-full bg-gray-100 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-coral to-[#f7a98b] rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
          </div>
        )}

        {/* No results */}
        {!loading && !hasResults && trimmedQuery.length >= 2 && (
          <div className="px-4 py-6 text-center">
            <p className="text-gray-400 text-[13px]">No suggestions found for &ldquo;{trimmedQuery}&rdquo;</p>
            <p className="text-[11px] text-gray-300 mt-1">Try searching for bangles, necklace, rings...</p>
          </div>
        )}

        {/* Category suggestions */}
        {results.categories.length > 0 && (
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
              Categories
            </p>
            <div className="flex flex-wrap gap-1.5">
              {results.categories.map((cat, catIdx) => {
                flatIdx++;
                const idx = flatIdx;
                return (
                  <Link
                    key={`${cat.type}-${cat.slug}-${catIdx}`}
                    href={`/jewellery/${cat.slug}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onNavigate(`/jewellery/${cat.slug}`);
                    }}
                    onClick={(e) => e.preventDefault()}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium
                      transition-all duration-150
                      ${
                        activeIndex === idx
                          ? 'bg-navy text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 hover:bg-coral/10 hover:text-coral border border-gray-100'
                      }
                    `}
                  >
                    {TAG_ICON}
                    {cat.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        {results.categories.length > 0 && results.products.length > 0 && (
          <div className="mx-3 my-2 border-t border-gray-100" />
        )}

        {/* Product suggestions */}
        {results.products.length > 0 && (
          <div className="px-3 pb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
              Products
            </p>
            <ul className="space-y-0.5">
              {results.products.map((product) => {
                flatIdx++;
                const idx = flatIdx;
                const href = productHref(product);
                return (
                  <li key={product.tag_number}>
                    <Link
                      href={href}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onNavigate(href);
                      }}
                      onClick={(e) => e.preventDefault()}
                      className={`
                        flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150
                        ${
                          activeIndex === idx
                            ? 'bg-navy/5 ring-1 ring-navy/20'
                            : 'hover:bg-gray-50'
                        }
                      `}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 shrink-0 border border-gray-100">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-gray-800 truncate leading-tight">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-coral font-semibold mt-0.5">
                          {formatDisplayPrice(product.display_price)}
                        </p>
                      </div>
                      {ARROW_ICON}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* View all results */}
        {hasResults && (
          <>
            <div className="mx-3 border-t border-gray-100" />
            {(() => {
              flatIdx++;
              const idx = flatIdx;
              const viewAllHref = `/jewellery?search=${encodeURIComponent(trimmedQuery)}`;
              return (
                <Link
                  href={viewAllHref}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onNavigate(viewAllHref);
                  }}
                  onClick={(e) => e.preventDefault()}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 text-[12px] font-semibold
                    transition-all duration-150
                    ${
                      activeIndex === idx
                        ? 'bg-navy text-white'
                        : 'text-navy hover:bg-navy/5'
                    }
                  `}
                >
                  View all results for &ldquo;{trimmedQuery}&rdquo;
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              );
            })()}
          </>
        )}
      </div>

      {/* Keyframes injected via style tag */}
      <style jsx>{`
        @keyframes searchDropIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
}
