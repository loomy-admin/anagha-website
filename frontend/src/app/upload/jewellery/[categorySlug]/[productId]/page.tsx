'use client';

import { useState, useEffect, use, useRef } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  fetchCatalogItem,
  formatDisplayPrice,
  itemHref,
  saveItemDescription,
  setWebsiteImages,
  uploadWebsiteImage,
  type CatalogItem,
} from '@/lib/erpCatalog';

const MAX_GALLERY = 8;

export default function ProductEditor({
  params,
}: {
  params: Promise<{ categorySlug: string; productId: string }>;
}) {
  const { categorySlug, productId } = use(params);
  const tag = decodeURIComponent(productId);
  const [product, setProduct] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [descSaving, setDescSaving] = useState(false);
  const [descMessage, setDescMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const item = await fetchCatalogItem(tag);
        if (!cancelled) {
          setProduct(item);
          setDescription(item.description || '');
          setError(null);
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

  async function onUpload(file: File | null) {
    if (!file || !product) return;
    if (gallery.length >= MAX_GALLERY) {
      setGalleryError(`Maximum ${MAX_GALLERY} website images`);
      return;
    }
    setBusy(true);
    setGalleryError(null);
    try {
      const updated = await uploadWebsiteImage(tag, file);
      setProduct({ ...updated, description });
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
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
      setProduct({ ...updated, description });
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
      setProduct({ ...updated, description });
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveDescription() {
    if (!product) return;
    setDescSaving(true);
    setDescMessage(null);
    try {
      await saveItemDescription(tag, description);
      setProduct((prev) => (prev ? { ...prev, description } : prev));
      setDescMessage('Description saved');
    } catch (err) {
      setDescMessage(err instanceof Error ? err.message : 'Failed to save description');
    } finally {
      setDescSaving(false);
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

  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Tag', value: product.tag_number },
    { label: 'Name', value: product.name },
    { label: 'Price', value: formatDisplayPrice(product.display_price) },
    { label: 'Type', value: product.type },
    { label: 'Group', value: product.group },
    { label: 'Article', value: product.article },
    { label: 'Purity', value: product.purity },
    { label: 'Metal', value: product.metal_type },
    { label: 'Net weight', value: product.net_weight != null ? `${product.net_weight} g` : null },
    { label: 'Gross weight', value: product.gross_weight != null ? `${product.gross_weight} g` : null },
    { label: 'Status', value: product.status },
  ];

  const descDirty = description !== (product.description || '');

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
                Product editor
              </div>
              <h1 className="text-3xl font-display font-bold text-navy tracking-tight">{product.name}</h1>
            </div>
          </div>
          <Link
            href={itemHref(product)}
            className="bg-navy text-white px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all"
          >
            View on storefront
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Website gallery ({gallery.length}/{MAX_GALLERY})
              </h3>
              <button
                type="button"
                disabled={busy || gallery.length >= MAX_GALLERY}
                onClick={() => fileRef.current?.click()}
                className="bg-navy text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest disabled:opacity-40 hover:bg-rose-600 transition-all"
              >
                {busy ? 'Working…' : 'Add image'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onUpload(e.target.files?.[0] || null)}
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
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Details
            </h3>
            {fields.map((f) =>
              f.value != null && f.value !== '' ? (
                <div key={f.label} className="flex justify-between gap-4 border-b border-gray-50 pb-3">
                  <span className="text-[11px] uppercase tracking-wider text-gray-400">{f.label}</span>
                  <span className="text-sm font-semibold text-navy text-right">{f.value}</span>
                </div>
              ) : null,
            )}

            <div className="pt-4 border-t border-gray-50 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400">Description</p>
                <button
                  type="button"
                  disabled={descSaving || !descDirty}
                  onClick={onSaveDescription}
                  className="bg-navy text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest disabled:opacity-40 hover:bg-rose-600 transition-all"
                >
                  {descSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDescMessage(null);
                }}
                rows={6}
                placeholder="Write a storefront description for this piece…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-navy resize-y min-h-[120px]"
              />
              {descMessage ? (
                <p
                  className={`text-[12px] ${
                    descMessage === 'Description saved' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {descMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
