'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  deleteCatalogGroup,
  fetchCatalog,
  fetchCatalogFilters,
  fetchGroupImages,
  groupImageForSlug,
  slugifyName,
  uploadGroupImage,
  type CatalogFilterOption,
} from '@/lib/erpCatalog';
import { fetchErpVisibility } from '@/lib/erpVisibility';
import AddProductsPanel, { addProductsBtn } from './AddProductsPanel';
import AdminSearchField, { textMatchesQuery } from './AdminSearchField';
import SharedTaxonomyEditor from './SharedTaxonomyEditor';

export default function JewelleryEditor() {
  const [groups, setGroups] = useState<CatalogFilterOption[]>([]);
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(new Set());
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{
    groups: string[];
    types: string[];
    articles: string[];
    metals: string[];
    purities: string[];
  }>({ groups: [], types: [], articles: [], metals: [], purities: [] });
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSlugRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [payload, images, visibilityRes] = await Promise.all([
          fetchCatalogFilters({ admin_bypass: 'true' }),
          fetchGroupImages().catch(() => ({})),
          fetchErpVisibility(),
        ]);
        if (cancelled) return;
        setImageOverrides(images);
        if (visibilityRes.visibleCategories) {
          setVisibleCategories(new Set(visibilityRes.visibleCategories));
        }
        const base = [...(payload.filters?.group || [])];

        // Facet `count` from /filters can under-count (ERP row page cap). Use catalog
        // exact `total` per group — same source as the group detail page.
        const withExactCounts = await Promise.all(
          base.map(async (g) => {
            const slug = g.slug || slugifyName(g.name);
            try {
              const catalog = await fetchCatalog({ group: slug, limit: 1, offset: 0, admin_bypass: 'true' });
              return { ...g, slug, count: catalog.total ?? g.count ?? 0 };
            } catch {
              return { ...g, slug, count: g.count ?? 0 };
            }
          }),
        );
        if (cancelled) return;

        withExactCounts.sort(
          (a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name),
        );
        setGroups(withExactCounts);
        const f = payload.filters;
        setSuggestions({
          groups: (f.group || []).map((g) => g.name || g.slug || '').filter(Boolean),
          types: (f.type || []).map((g) => g.name || g.slug || '').filter(Boolean),
          articles: (f.article || []).map((g) => g.name || g.slug || '').filter(Boolean),
          metals: (f.metal_type || []).map((g) => g.name || '').filter(Boolean),
          purities: (f.purity || []).map((g) => g.name || '').filter(Boolean),
        });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setGroups([]);
          setError(err instanceof Error ? err.message : 'Failed to load ERP groups');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openImagePicker(slug: string) {
    pendingSlugRef.current = slug;
    setImageError(null);
    fileRef.current?.click();
  }

  async function onImageSelected(file: File | null) {
    const slug = pendingSlugRef.current;
    if (!file || !slug) return;
    setUploadingSlug(slug);
    setImageError(null);
    try {
      const result = await uploadGroupImage(slug, file);
      setImageOverrides(result.images || { ...imageOverrides, [slug]: result.image });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploadingSlug(null);
      pendingSlugRef.current = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function toggleCategoryVisibility(slug: string) {
    if (visibilitySaving) return;
    setVisibilitySaving(true);
    
    const newSet = new Set(visibleCategories);
    if (newSet.has(slug)) {
      newSet.delete(slug);
    } else {
      newSet.add(slug);
    }
    setVisibleCategories(newSet);
    
    try {
      await fetch('/api/upload/erp-visibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibleCategories: Array.from(newSet) }),
      });
    } catch (err) {
      console.error('Failed to save visibility:', err);
      // Revert on error
      setVisibleCategories(visibleCategories);
    } finally {
      setVisibilitySaving(false);
    }
  }

  async function deleteCategory(slug: string, name: string, count: number) {
    if (deletingSlug) return;
    const extra =
      count > 0
        ? ` This also deletes ${count} product${count === 1 ? '' : 's'} in it. Re-import from ERP can bring ERP products back.`
        : '';
    if (!window.confirm(`Delete category “${name}”?${extra}`)) return;
    setDeletingSlug(slug);
    setError(null);
    try {
      await deleteCatalogGroup(slug);
      setGroups((prev) => prev.filter((g) => (g.slug || slugifyName(g.name)) !== slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeletingSlug(null);
    }
  }

  const visibleGroups = useMemo(() => {
    return groups.filter((g) =>
      textMatchesQuery(categoryQuery, g.name, g.slug, slugifyName(g.name)),
    );
  }, [groups, categoryQuery]);

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 py-12 md:py-16">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link
            href="/upload"
            className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-navy transition-all shadow-sm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-navy tracking-tight">
            Jewellery Catalog
          </h1>
          <AdminSearchField
            value={categoryQuery}
            onChange={setCategoryQuery}
            placeholder="Search categories"
            className="max-w-xs ml-auto"
          />
          <button
            type="button"
            className={addProductsBtn}
            onClick={() => {
              setLabelsOpen(false);
              setPanel((open) => !open);
            }}
          >
            Add products
          </button>
          <button
            type="button"
            className={addProductsBtn}
            onClick={() => {
              setPanel(false);
              setLabelsOpen((open) => !open);
            }}
          >
            Labels
          </button>
          <Link href="/upload/jewellery/sold" className={addProductsBtn}>
            Sold
          </Link>
          <button
            type="button"
            disabled={importing}
            onClick={async () => {
              setImporting(true);
              setImportMessage('Starting import…');
              try {
                const res = await fetch('/api/upload/catalog/reimport', {
                  method: 'POST',
                  credentials: 'include',
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok && res.status !== 202) {
                  throw new Error(body.data?.message || body.error || 'Import failed');
                }
                setImportMessage(body.data?.message || 'Importing…');
                const started = Date.now();
                while (Date.now() - started < 15 * 60 * 1000) {
                  await new Promise((r) => setTimeout(r, 1500));
                  const statusRes = await fetch('/api/upload/catalog/status', { credentials: 'include' });
                  const statusBody = await statusRes.json().catch(() => ({}));
                  const data = statusBody.data || {};
                  if (data.message) setImportMessage(data.message);
                  if (data.running) continue;
                  if (data.ok === false) throw new Error(data.message || 'Import failed');
                  if (data.ok === true) {
                    window.location.reload();
                    return;
                  }
                  break;
                }
                throw new Error('Import is taking too long — refresh the page and check the catalog');
              } catch (err) {
                setImportMessage(err instanceof Error ? err.message : 'Import failed');
              } finally {
                setImporting(false);
              }
            }}
            className="text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-navy disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Re-import ERP'}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onImageSelected(e.target.files?.[0] || null)}
        />

        {panel ? (
          <AddProductsPanel
            suggestions={suggestions}
            onMessage={setImportMessage}
            onDone={() => window.location.reload()}
            onClose={() => setPanel(false)}
          />
        ) : null}

        {labelsOpen && !loading && !error ? (
          <SharedTaxonomyEditor
            types={suggestions.types}
            articles={suggestions.articles}
            metals={suggestions.metals}
            purities={suggestions.purities}
            onChange={(patch) => setSuggestions((prev) => ({ ...prev, ...patch }))}
            onClose={() => setLabelsOpen(false)}
          />
        ) : null}

        {importMessage ? (
          <p className="text-center text-sm mb-6 text-navy">{importMessage}</p>
        ) : null}

        {imageError ? (
          <p className="text-center text-rose-500 text-sm mb-6">{imageError}</p>
        ) : null}

        {error ? (
          <p className="text-center text-rose-500 text-sm py-16">{error}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            <AnimatePresence>
              {loading
                ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 text-gray-400">
                      <span className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mb-6" />
                      <p className="text-xs font-black uppercase tracking-widest text-navy">Loading Categories...</p>
                      <p className="text-[10px] text-gray-400 mt-2">Loading website catalog</p>
                    </div>
                  )
                  : visibleGroups.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-sm text-gray-400">
                      {categoryQuery.trim()
                        ? `No categories match “${categoryQuery.trim()}”.`
                        : 'No categories yet.'}
                    </div>
                  )
                  : visibleGroups.map((g) => {
                      const slug = g.slug || slugifyName(g.name);
                      const busy = uploadingSlug === slug;
                      const isVisible = visibleCategories.has(slug);
                      return (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          key={g.id || slug}
                          className="group relative bg-white border border-gray-100 rounded-[28px] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                        <div className="aspect-square bg-[#fcf8f8] relative overflow-hidden group/img">
                          <Link href={`/upload/jewellery/${slug}`} className="absolute inset-0 z-10 block">
                            <img
                              src={groupImageForSlug(slug, imageOverrides)}
                              alt={g.name}
                              className="w-full h-full object-contain p-6 group-hover/img:scale-110 transition-transform duration-500 mix-blend-multiply"
                            />
                            <div className="absolute inset-0 bg-navy/0 group-hover/img:bg-navy/10 transition-colors flex items-center justify-center">
                              <span className="bg-white text-navy text-[9px] font-black px-4 py-2 rounded-full opacity-0 group-hover/img:opacity-100 transition-all transform translate-y-2 group-hover/img:translate-y-0 shadow-md uppercase">
                                View stock
                              </span>
                            </div>
                          </Link>
                          {busy ? (
                            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-30">
                              <span className="w-8 h-8 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
                            </div>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            title="Change tile image"
                            aria-label="Change tile image"
                            onClick={() => openImagePicker(slug)}
                            className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-500 hover:text-navy hover:border-navy/20 transition-colors disabled:opacity-50"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                              <circle cx="12" cy="13" r="4" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-col border-t border-gray-50">
                          <Link
                            href={`/upload/jewellery/${slug}`}
                            className="block p-5 text-center bg-white"
                          >
                            <h3 className="font-bold text-navy text-sm uppercase tracking-wider line-clamp-1 group-hover:text-rose-600 transition-colors">
                              {g.name}
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium">
                              {typeof g.count === 'number' ? `${g.count} available` : 'ERP group'}
                            </p>
                          </Link>
                          
                          <div className="px-5 pb-5 bg-white flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              Visible
                            </span>
                            <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleCategoryVisibility(slug)}
                              disabled={visibilitySaving || deletingSlug === slug}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 ${
                                isVisible ? 'bg-rose-500' : 'bg-gray-200'
                              } ${visibilitySaving ? 'opacity-50' : ''}`}
                              role="switch"
                              aria-checked={isVisible}
                            >
                              <span className="sr-only">Toggle visibility</span>
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isVisible ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              title="Delete category"
                              disabled={Boolean(deletingSlug)}
                              onClick={() => void deleteCategory(slug, g.name, g.count || 0)}
                              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-600 disabled:opacity-40"
                            >
                              {deletingSlug === slug ? '…' : 'Delete'}
                            </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
            </AnimatePresence>
          </div>
          </>
        )}

        <div className="mt-16 flex justify-center">
          <Link
            href="/jewellery"
            className="flex items-center gap-3 text-gray-400 hover:text-navy transition-colors font-bold text-xs uppercase tracking-widest bg-white px-8 py-4 rounded-full border border-gray-100 shadow-sm"
          >
            <span>View live jewellery page</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>

      <footer className="py-8 text-center text-gray-400 text-[10px] tracking-widest uppercase border-t border-gray-50/50">
        © 2026 Anagha Administrative Portal
      </footer>
    </div>
  );
}
