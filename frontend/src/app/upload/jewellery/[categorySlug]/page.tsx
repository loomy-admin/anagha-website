'use client';

import { useState, useEffect, use } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchCatalog,
  formatDisplayPrice,
  type CatalogItem,
} from '@/lib/erpCatalog';

export default function CategoryProductsEditor({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = use(params);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleProducts, setVisibleProducts] = useState<Set<string>>(new Set());
  const [visibilitySaving, setVisibilitySaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [data, visibilityRes] = await Promise.all([
          fetchCatalog({
            group: categorySlug,
            limit: 1000000,
            offset: 0,
            admin_bypass: 'true',
          }),
          fetch('/api/upload/erp-visibility').then(r => r.ok ? r.json() : {}).catch(() => ({})) as Promise<any>,
        ]);
        if (cancelled) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
        if (visibilityRes.visibleProducts) {
          setVisibleProducts(new Set(visibilityRes.visibleProducts));
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setError(err instanceof Error ? err.message : 'Failed to load ERP stock');
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

  async function saveVisibility(newSet: Set<string>) {
    if (visibilitySaving) return;
    setVisibilitySaving(true);
    setVisibleProducts(newSet);
    
    try {
      await fetch('/api/upload/erp-visibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleProducts: Array.from(newSet) }),
      });
    } catch (err) {
      console.error('Failed to save product visibility:', err);
      setVisibleProducts(visibleProducts); // revert on error
    } finally {
      setVisibilitySaving(false);
    }
  }

  function toggleProductVisibility(tag: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const newSet = new Set(visibleProducts);
    if (newSet.has(tag)) newSet.delete(tag);
    else newSet.add(tag);
    saveVisibility(newSet);
  }

  function selectAll() {
    const newSet = new Set(visibleProducts);
    items.forEach(p => newSet.add(p.tag_number));
    saveVisibility(newSet);
  }

  function deselectAll() {
    const newSet = new Set(visibleProducts);
    items.forEach(p => newSet.delete(p.tag_number));
    saveVisibility(newSet);
  }

  const categoryTitle = categorySlug.replace(/-/g, ' ').toUpperCase();

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 py-12">
        <div className="flex items-center gap-4 mb-12">
          <Link
            href="/upload/jewellery"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
              <Link href="/upload/jewellery" className="hover:text-rose-600 transition-colors">
                Jewellery
              </Link>
              <span>/</span>
              <span className="text-gray-600">{categoryTitle}</span>
            </div>
            <h1 className="text-3xl font-display font-bold text-navy tracking-tight">
              {categoryTitle}
            </h1>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
            <div>
              <h2 className="text-xl font-bold text-navy mb-2">
                Current inventory {loading ? '' : `(${total})`}
              </h2>
              {!loading && items.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    disabled={visibilitySaving}
                    className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-navy disabled:opacity-50"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    disabled={visibilitySaving}
                    className="text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-rose-500 disabled:opacity-50"
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>
            <Link
              href={`/jewellery/${categorySlug}`}
              className="px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-md bg-navy text-white hover:bg-rose-600"
            >
              Open storefront
            </Link>
          </div>

          {error ? (
            <p className="py-16 text-center text-rose-500 text-sm">{error}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <div className="md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-40 text-gray-400">
                    <span className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mb-6" />
                    <p className="text-xs font-black uppercase tracking-widest text-navy">Loading ERP Inventory...</p>
                    <p className="text-[10px] text-gray-400 mt-2">Fetching live stock from the ERP system. This may take a few seconds.</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="md:col-span-2 lg:col-span-3 py-20 text-center flex flex-col items-center gap-4">
                    <p className="text-gray-400 text-sm font-medium">
                      No available items in this ERP group.
                    </p>
                  </div>
                ) : (
                  items.map((p) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={p.id || p.tag_number}
                    >
                      <Link
                        href={`/upload/jewellery/${categorySlug}/${encodeURIComponent(p.tag_number)}`}
                        className="group flex gap-4 p-4 border border-gray-100 rounded-2xl hover:border-rose-100 hover:shadow-md transition-all relative bg-white cursor-pointer"
                      >
                        <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-2 relative">
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
                        <div className="flex-1 flex flex-col justify-center min-w-0 pr-12 relative">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                            Tag {p.tag_number}
                          </p>
                          <h4 className="text-sm font-bold text-navy truncate">{p.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-rose-500 font-bold text-xs">
                              {formatDisplayPrice(p.display_price)}
                            </span>
                            {p.purity ? (
                              <span className="text-gray-300 text-[10px]">{p.purity}</span>
                            ) : null}
                          </div>
                          
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                            <button
                              type="button"
                              onClick={(e) => toggleProductVisibility(p.tag_number, e)}
                              disabled={visibilitySaving}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 ${
                                visibleProducts.has(p.tag_number) ? 'bg-rose-500' : 'bg-gray-200'
                              } ${visibilitySaving ? 'opacity-50' : ''}`}
                              role="switch"
                              aria-checked={visibleProducts.has(p.tag_number)}
                            >
                              <span className="sr-only">Toggle visibility</span>
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  visibleProducts.has(p.tag_number) ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
