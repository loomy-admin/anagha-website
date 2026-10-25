'use client';

import { useState, useEffect, use, useMemo } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  bulkSetCatalogItemStatus,
  fetchCatalog,
  fetchCatalogFilters,
  formatDisplayPrice,
  setCatalogItemStatus,
  type CatalogItem,
} from '@/lib/erpCatalog';
import AdminSearchField, { textMatchesQuery } from '../AdminSearchField';

export default function CategoryProductsEditor({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = use(params);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [groupName, setGroupName] = useState(categorySlug.replace(/-/g, ' '));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [productQuery, setProductQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [data, filters] = await Promise.all([
          fetchCatalog({
            group: categorySlug,
            limit: 1000000,
            offset: 0,
            admin_bypass: 'true',
          }),
          fetchCatalogFilters({ admin_bypass: 'true' }),
        ]);
        if (cancelled) return;
        setItems(data.items || []);
        const current = (filters.filters?.group || []).find((g) => (g.slug || '') === categorySlug);
        setGroupName(current?.name || data.items?.[0]?.group || categorySlug.replace(/-/g, ' '));
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : 'Failed to load catalog');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  const editableTags = items
    .filter((p) => p.status === 'available' || p.status === 'hidden')
    .map((p) => p.tag_number);

  const stockItems = useMemo(
    () => items.filter((p) => p.status !== 'sold'),
    [items],
  );

  const visibleItems = useMemo(() => {
    return stockItems.filter((p) => textMatchesQuery(productQuery, p.name, p.tag_number, p.id));
  }, [stockItems, productQuery]);

  async function toggleProductVisibility(item: CatalogItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (item.status === 'sold' || item.status === 'reserved' || visibilitySaving) return;
    const next = item.status === 'hidden' ? 'available' : 'hidden';
    setVisibilitySaving(true);
    try {
      const updated = await setCatalogItemStatus(item.tag_number, next);
      setItems((prev) => prev.map((p) => (p.tag_number === item.tag_number ? { ...p, ...updated } : p)));
    } catch (err) {
      console.error('Failed to update visibility:', err);
    } finally {
      setVisibilitySaving(false);
    }
  }

  async function setAll(status: 'available' | 'hidden') {
    if (visibilitySaving || !editableTags.length) return;
    setVisibilitySaving(true);
    try {
      await bulkSetCatalogItemStatus(editableTags, status);
      setItems((prev) =>
        prev.map((p) =>
          p.status === 'sold' || p.status === 'reserved' ? p : { ...p, status },
        ),
      );
    } catch (err) {
      console.error('Failed to update visibility:', err);
    } finally {
      setVisibilitySaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/upload/jewellery"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-navy transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              <Link href="/upload/jewellery" className="hover:text-navy">Jewellery Catalog</Link>
            </p>
            <h1 className="text-3xl font-display font-bold text-navy tracking-tight truncate">{groupName}</h1>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <h2 className="text-lg font-bold text-navy whitespace-nowrap">
              {loading ? 'Products' : `${productQuery.trim() ? visibleItems.length : stockItems.length} products`}
            </h2>
            {!loading && stockItems.length > 0 ? (
              <AdminSearchField
                value={productQuery}
                onChange={setProductQuery}
                placeholder="Search name or tag"
                className="max-w-xs"
              />
            ) : null}
            {!loading && stockItems.length > 0 ? (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                <button type="button" onClick={() => setAll('available')} disabled={visibilitySaving} className="hover:text-navy disabled:opacity-50">
                  Show all
                </button>
                <span>·</span>
                <button type="button" onClick={() => setAll('hidden')} disabled={visibilitySaving} className="hover:text-rose-500 disabled:opacity-50">
                  Hide all
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 ml-auto">
              <Link href={`/jewellery/${categorySlug}`} className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-navy border border-gray-200">
                Storefront
              </Link>
            </div>
          </div>

          {error ? (
            <p className="py-16 text-center text-rose-500 text-sm">{error}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {loading ? (
                  <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-40 text-gray-400">
                    <span className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mb-6" />
                    <p className="text-xs font-black uppercase tracking-widest text-navy">Loading inventory...</p>
                    <p className="text-[10px] text-gray-400 mt-2">Loading ERP stock for this group.</p>
                  </div>
                ) : stockItems.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 py-20 text-center">
                    <p className="text-gray-400 text-sm font-medium">
                      No ERP stock in this category.
                    </p>
                  </div>
                ) : visibleItems.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 py-20 text-center">
                    <p className="text-gray-400 text-sm font-medium">
                      No products match “{productQuery.trim()}”.
                    </p>
                  </div>
                ) : (
                  visibleItems.map((p) => {
                    const shown = p.status === 'available';
                    const locked = p.status === 'sold' || p.status === 'reserved';
                    return (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={p.id || p.tag_number}
                        className="border border-gray-100 rounded-2xl hover:border-navy/20 hover:shadow-md transition-all bg-white p-4"
                      >
                        <div className="flex gap-4">
                          <Link
                            href={`/upload/jewellery/${categorySlug}/${encodeURIComponent(p.tag_number)}`}
                            className="flex gap-4 flex-1 min-w-0"
                          >
                            <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-2">
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="max-w-full max-h-full object-contain mix-blend-multiply"
                                />
                              ) : (
                                <span className="text-[9px] text-gray-300 uppercase">No img</span>
                              )}
                            </div>
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                                Tag {p.tag_number}
                              </p>
                              <h4 className="text-sm font-bold text-navy truncate">{p.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-rose-500 font-bold text-xs">
                                  {formatDisplayPrice(p.display_price)}
                                </span>
                                <span className="text-gray-300 text-[10px] uppercase">{p.status}</span>
                              </div>
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => toggleProductVisibility(p, e)}
                            disabled={visibilitySaving || locked}
                            className={`self-center relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${
                              shown ? 'bg-rose-500' : 'bg-gray-200'
                            } ${visibilitySaving || locked ? 'opacity-50' : ''}`}
                            role="switch"
                            aria-checked={shown}
                          >
                            <span className="sr-only">Toggle visibility</span>
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                shown ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
