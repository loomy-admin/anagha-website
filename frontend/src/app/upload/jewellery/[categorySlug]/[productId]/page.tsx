'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  fetchCatalogItem,
  fetchCatalogFilters,
  itemHref,
  setWebsiteImages,
  uploadWebsiteImage,
  updateCatalogItem,
  setCatalogItemStatus,
  restockCatalogItem,
  type CatalogItem,
} from '@/lib/erpCatalog';

import ProductPhotoButtons from '@/components/ProductPhotoButtons';
import { MAX_PRODUCT_IMAGES } from '@/lib/imageCapture';
import {
  CatalogItemForm,
  catalogItemToForm,
  emptyCatalogForm,
  formToPayload,
  type CatalogFormValues,
} from '../../CatalogItemForm';

export default function ProductEditor({
  params,
}: {
  params: Promise<{ categorySlug: string; productId: string }>;
}) {
  const { categorySlug, productId } = use(params);
  const router = useRouter();
  const tag = decodeURIComponent(productId);
  const [product, setProduct] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogFormValues>(emptyCatalogForm());
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    groups: string[];
    types: string[];
    articles: string[];
    metals: string[];
    purities: string[];
  }>({ groups: [], types: [], articles: [], metals: [], purities: [] });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [item, filters] = await Promise.all([
          fetchCatalogItem(tag, { adminBypass: true }),
          fetchCatalogFilters({ admin_bypass: 'true' }).catch(() => null),
        ]);
        if (!cancelled) {
          setProduct(item);
          setForm(catalogItemToForm(item));
          setError(null);
          if (filters?.filters) {
            const f = filters.filters;
            setSuggestions({
              groups: (f.group || []).map((g) => g.name || g.slug || '').filter(Boolean),
              types: (f.type || []).map((g) => g.name || g.slug || '').filter(Boolean),
              articles: (f.article || []).map((g) => g.name || g.slug || '').filter(Boolean),
              metals: (f.metal_type || []).map((g) => g.name || '').filter(Boolean),
              purities: (f.purity || []).map((g) => g.name || '').filter(Boolean),
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setProduct(null);
          setError(err instanceof Error ? err.message : 'Item not found in ERP');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  const gallery = product?.website_images?.length
    ? product.website_images
    : [];
  const posImage = product?.pos_image_url || null;

  async function onUpload(dataUrl: string, fileName: string) {
    if (!product) return;
    if (gallery.length >= MAX_PRODUCT_IMAGES) {
      setGalleryError(`Maximum ${MAX_PRODUCT_IMAGES} website images`);
      return;
    }
    setBusy(true);
    setGalleryError(null);
    try {
      const updated = await uploadWebsiteImage(tag, { dataUrl, fileName });
      setProduct(updated);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function moveImage(index: number, dir: -1 | 1) {
    if (!product) return;
    const next = [...gallery];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setBusy(true);
    setGalleryError(null);
    try {
      const updated = await setWebsiteImages(tag, next);
      setProduct(updated);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'Reorder failed');
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(index: number) {
    if (!product) return;
    const next = gallery.filter((_, i) => i !== index);
    setBusy(true);
    setGalleryError(null);
    try {
      const updated = await setWebsiteImages(tag, next);
      setProduct(updated);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDetails() {
    if (!product) return;
    setDetailsSaving(true);
    setDetailsMessage(null);
    try {
      const updated = await updateCatalogItem(tag, formToPayload(form));
      setProduct(updated);
      setForm(catalogItemToForm(updated));
      setDetailsMessage('Details saved');
      const nextSlug = updated.group_slug || categorySlug;
      if (nextSlug && nextSlug !== categorySlug) {
        router.replace(`/upload/jewellery/${nextSlug}/${encodeURIComponent(updated.tag_number)}`);
      }
    } catch (err) {
      setDetailsMessage(err instanceof Error ? err.message : 'Failed to save details');
    } finally {
      setDetailsSaving(false);
    }
  }

  async function onToggleHidden() {
    if (!product) return;
    const next = product.status === 'hidden' ? 'available' : 'hidden';
    setStatusBusy(true);
    setDetailsMessage(null);
    try {
      const updated = await setCatalogItemStatus(tag, next);
      setProduct(updated);
    } catch (err) {
      setDetailsMessage(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setStatusBusy(false);
    }
  }

  async function onRestock() {
    if (!product) return;
    setStatusBusy(true);
    setDetailsMessage(null);
    try {
      const updated = await restockCatalogItem(tag);
      setProduct(updated);
      setDetailsMessage('Added back to stock');
    } catch (err) {
      setDetailsMessage(err instanceof Error ? err.message : 'Failed to restock');
    } finally {
      setStatusBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-label="Loading">
        <span className="w-10 h-10 border-2 border-navy/15 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="font-black text-rose-500 uppercase tracking-widest text-sm">
          {error || 'Product not found'}
        </p>
        <Link href={`/upload/jewellery/${categorySlug}`} className="text-navy text-xs font-bold underline">
          Back to group
        </Link>
      </div>
    );
  }

  const canToggleVisibility = product.status === 'available' || product.status === 'hidden';

  return (
    <div className="min-h-screen bg-[#fffbfa] flex flex-col">
      <Header />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-4 py-12">
        <div className="flex items-center justify-between mb-12 gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <Link
              href={`/upload/jewellery/${categorySlug}`}
              className="w-12 h-12 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-navy hover:border-navy transition-all shadow-sm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="text-[10px] font-black text-emerald-600/80 uppercase tracking-widest mb-1">
                Product editor · {product.origin || 'erp'} · {product.status || 'available'}
              </div>
              <h1 className="text-3xl font-display font-bold text-navy tracking-tight">{product.name}</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {canToggleVisibility ? (
              <button
                type="button"
                disabled={statusBusy}
                onClick={onToggleHidden}
                className="px-8 py-3 rounded-full border border-gray-200 text-navy font-black text-[11px] uppercase tracking-widest disabled:opacity-40"
              >
                {statusBusy ? 'Updating…' : product.status === 'hidden' ? 'Show on store' : 'Hide from store'}
              </button>
            ) : null}
            {product.status === 'sold' ? (
              <button
                type="button"
                disabled={statusBusy}
                onClick={onRestock}
                className="px-8 py-3 rounded-full bg-navy text-white font-black text-[11px] uppercase tracking-widest disabled:opacity-40"
              >
                {statusBusy ? 'Updating…' : 'Add to stock'}
              </button>
            ) : (
              <Link
                href={itemHref(product)}
                className="bg-navy text-white px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-coral transition-all"
              >
                View on storefront
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Website gallery ({gallery.length}/{MAX_PRODUCT_IMAGES})
              </h3>
              <ProductPhotoButtons
                disabled={busy || gallery.length >= MAX_PRODUCT_IMAGES}
                onReady={onUpload}
              />
            </div>

            {galleryError ? (
              <p className="text-sm text-rose-600">{galleryError}</p>
            ) : null}

            {gallery.length ? (
              <ul className="space-y-4">
                {gallery.map((url, index) => (
                  <li
                    key={`${url}-${index}`}
                    className="flex gap-4 items-center border border-gray-100 rounded-2xl p-3"
                  >
                    <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={url} alt="" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-2">
                        {index === 0 ? 'Primary (listing + PDP)' : `Image ${index + 1}`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => moveImage(index, -1)}
                          className="text-[10px] font-bold uppercase tracking-widest text-navy disabled:opacity-30"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === gallery.length - 1}
                          onClick={() => moveImage(index, 1)}
                          className="text-[10px] font-bold uppercase tracking-widest text-navy disabled:opacity-30"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeImage(index)}
                          className="text-[10px] font-bold uppercase tracking-widest text-rose-600 disabled:opacity-30"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center overflow-hidden p-8">
                {posImage ? (
                  <img
                    src={posImage}
                    alt={product.name}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                ) : (
                  <span className="text-gray-300 text-sm">No images yet</span>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Details
              </h3>
              <button
                type="button"
                disabled={detailsSaving}
                onClick={onSaveDetails}
                className="bg-navy text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest disabled:opacity-40 hover:bg-rose-600 transition-all"
              >
                {detailsSaving ? 'Saving…' : 'Save details'}
              </button>
            </div>
            <CatalogItemForm values={form} onChange={setForm} tagLocked suggestions={suggestions} />
            {detailsMessage ? (
              <p className={`text-[12px] ${detailsMessage === 'Details saved' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {detailsMessage}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
